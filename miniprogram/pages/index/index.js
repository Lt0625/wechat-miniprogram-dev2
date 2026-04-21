const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')
const billHelper = require('../../utils/bill-helper')
const loadingHelper = require('../../utils/loading-helper')
const bookManager = require('../../utils/book-manager')

Page({
  data: {
    currentPeriod: 'month', // week | month | year
    summary: {
      expense: '0.00',
      income: '0.00',
      balance: '0.00'
    },
    budgetInfo: {
      monthlyBudget: 0,
      spentAmount: 0,
      remaining: 0,
      progressPercent: 0,
      currentMonth: ''
    },
    bills: [],
    filteredBills: [],
    groupedBills: [],
    searchKeyword: '',
    showFilter: false,
    filterType: '',
    filterCategory: '',
    categories: [],
    loaded: false,
    theme: themeManager.currentTheme,
    // 全局 Loading 状态（由 loading-helper 管理）
    _loading: false,
    _loadingTitle: '加载中...',
    // 骨架屏状态
    _skeletonShow: false,
    // 快捷记账弹窗
    showQuickAdd: false,
    quickType: 'expense',
    quickAmount: '',
    quickCategory: '',
    quickCategories: [],
    quickNotes: '',
    quickAmounts: [10, 20, 50, 100, 200, 500],
    // 语音记账相关状态
    quickVoiceStatus: 'idle',  // idle | recording | processing
    cloudEnvInited: false,
    // 预算卡片折叠状态
    budgetCollapsed: false,
    // 账本相关
    currentBook: { id: 'default', name: '日常账本', icon: '📒' },
  },

  onLoad() {
    console.log('首页 onLoad 触发')
    // 显示骨架屏
    this.setData({ _skeletonShow: true })
    // 初始化账本
    bookManager.initBooks()
    this.loadCurrentBook()
    this.initPage()
  },

  onShow() {
    console.log('首页 onShow 触发（强制刷新）')
    // 确保 loading 和骨架屏被隐藏
    this.setData({ _loading: false, _skeletonShow: false })
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.getCurrentTheme() })
    // 加载当前账本信息
    this.loadCurrentBook()
    this.initPage(true)
  },

  // 加载当前账本信息
  loadCurrentBook() {
    const currentBook = bookManager.getCurrentBook()
    if (currentBook) {
      this.setData({ currentBook })
    }
  },

  // 账本切换后的回调（由 bookManager 调用）
  onBookChanged() {
    console.log('账本已切换，刷新数据')
    this.loadCurrentBook()
    this.initPage(true)
  },

  initPage(forceRefresh = false) {
    try {
      this.loadCategories()
      this.loadBills(forceRefresh)
      this.setData({ 
        loaded: true,
        theme: themeManager.currentTheme
      })
      console.log('首页初始化完成')
    } catch (error) {
      console.error('首页初始化失败:', error)
      this.setData({ 
        loaded: true,
        theme: themeManager.currentTheme
      })
    }
  },

  loadCategories(forceRefresh = false) {
    try {
      const app = getApp()
      if (!app || !app.getCategoriesFromCache) {
        console.warn('App实例不可用，使用空分类')
        this.setData({ categories: [] })
        return
      }

      let categories = app.getCategoriesFromCache(forceRefresh)

      if (!categories || categories.length === 0) {
        categories = app.getCategoriesFromCache(true)
      }

      console.log('加载分类成功:', categories.length, '个')
      this.setData({ categories: categories || [] })
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({ categories: [] })
    }
  },

  loadBills(forceRefresh = false) {
    try {
      const app = getApp()
      if (!app || !app.getBillsFromCache) {
        console.warn('App实例不可用，使用空账单')
        this.setData({
          bills: [],
          filteredBills: []
        })
        this.calculateSummary([])
        this.groupBillsByDate([])
        this.loadBudgetInfo([])
        return
      }

      let bills = app.getBillsFromCache(forceRefresh)
      console.log('加载账单成功:', bills.length, '条')

      // 只加载当前账本的账单
      const currentBookId = bookManager.getCurrentBookId()
      bills = bills.filter(b => b.bookId === currentBookId)
      console.log('过滤后当前账本账单:', bills.length, '条')

      const filteredBills = this.filterBillsByPeriod(bills)

      this.setData({
        bills: bills || [],
        filteredBills: filteredBills || []
      })

      this.calculateSummary(filteredBills)
      this.groupBillsByDate(filteredBills)
      this.loadBudgetInfo(bills)

    } catch (error) {
      console.error('加载账单失败:', error)
      this.setData({
        bills: [],
        filteredBills: [],
        groupedBills: [],
        summary: { expense: '0.00', income: '0.00', balance: '0.00' }
      })
    }
  },

  filterBillsByPeriod(bills) {
    if (!bills || !Array.isArray(bills)) return []

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let startDate
      let endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)

      switch (this.data.currentPeriod) {
        case 'week':
          // 近一周：从今天往前推6天（包含今天，共7天）
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          // 本月：本月1号到今天
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'year':
          // 本年：本年1月1号到今天
          startDate = new Date(now.getFullYear(), 0, 1)
          startDate.setHours(0, 0, 0, 0)
          break
        default:
          return bills
      }

      return bills.filter(bill => {
        if (!bill.date) return false
        const billDate = new Date(bill.date)
        // 确保账单日期在有效范围内
        return billDate >= startDate && billDate <= endDate && !isNaN(billDate.getTime())
      })
    } catch (error) {
      console.error('筛选账单失败:', error)
      return []
    }
  },

  calculateSummary(bills) {
    let expense = 0
    let income = 0

    if (Array.isArray(bills)) {
      bills.forEach(bill => {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          if (bill.type === 'expense') {
            expense += bill.amount
          } else {
            income += bill.amount
          }
        }
      })
    }

    // 计算日均消费
    const dailyAverage = this.calculateDailyAverage(expense, bills)

    this.setData({
      summary: {
        expense: parseFloat(expense.toFixed(2)),
        income: parseFloat(income.toFixed(2)),
        balance: parseFloat((income - expense).toFixed(2)),
        dailyAverage: dailyAverage
      }
    })
  },

  // 计算日均消费
  calculateDailyAverage(expense, bills) {
    const { currentPeriod } = this.data
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let days = 1

    if (currentPeriod === 'week') {
      // 近一周：从今天往前推6天，共7天
      days = 7
    } else if (currentPeriod === 'month') {
      // 本月：从本月1号到今天的天数
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      days = Math.max(Math.floor((today - startOfMonth) / (1000 * 60 * 60 * 24)) + 1, 1)
    } else if (currentPeriod === 'year') {
      // 本年：从本年1月1号到今天的天数
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      days = Math.max(Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1, 1)
    }

    return parseFloat((expense / days).toFixed(2))
  },

  groupBillsByDate(bills) {
    const grouped = {}
    
    if (!Array.isArray(bills)) {
      this.setData({ groupedBills: [] })
      return
    }

    // 使用 config.js 的 iconMap（统一来源）
    bills.forEach(bill => {
      if (!bill.date) return
      
      bill.icon = config.iconMap[bill.category] || '📊'
      
      if (!grouped[bill.date]) {
        grouped[bill.date] = []
      }
      grouped[bill.date].push(bill)
    })

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    
    const groupedBills = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => {
      let dayBills = grouped[date]
      
      // 每天内的账单按时间排序（从晚到早，最新添加的显示在最上面）
      dayBills.sort((a, b) => {
        // 没有 time 字段的旧账单排在最后
        if (!a.time && b.time) return 1
        if (a.time && !b.time) return -1
        if (!a.time && !b.time) return 0
        // 正常时间比较（降序）
        return b.time.localeCompare(a.time)
      })
      
      let dayIncome = 0
      let dayExpense = 0
      
      dayBills.forEach(bill => {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          if (bill.type === 'income') {
            dayIncome += bill.amount
          } else if (bill.type === 'expense') {
            dayExpense += bill.amount
          }
        }
      })
      
      const dateObj = new Date(date)
      const weekday = weekdays[dateObj.getDay()]
      
      return {
        date,
        weekday,
        dayIncome: parseFloat(dayIncome.toFixed(2)),
        dayExpense: parseFloat(dayExpense.toFixed(2)),
        bills: dayBills
      }
    })

      this.setData({ groupedBills })

    // 隐藏骨架屏
    this.setData({ _skeletonShow: false })
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period && ['week', 'month', 'year'].includes(period)) {
      this.setData({ currentPeriod: period })
      this.loadBills()
    }
  },

  onSearchInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ searchKeyword: e.detail.value || '' })
    }
  },

  onSearch() {
    this.applySearchFilter()
  },

  // 跳转到账本管理页面
  goToBookManage() {
    wx.navigateTo({
      url: '/pages/book-manage/book-manage',
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  setFilterType(e) {
    const type = e.currentTarget.dataset.type
    if (type !== undefined) {
      this.setData({ filterType: type || '' })
    }
  },

  setFilterCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category !== undefined) {
      this.setData({ filterCategory: category || '' })
    }
  },

  resetFilter() {
    this.setData({
      filterType: '',
      filterCategory: ''
    })
  },

  applyFilter() {
    this.setData({ showFilter: false })
    this.applySearchFilter()
  },

  applySearchFilter() {
    try {
      var bills = this.data.bills || []
      var filteredBills = []
      for (var i = 0; i < bills.length; i++) {
        filteredBills.push(bills[i])
      }

      if (this.data.searchKeyword) {
        var keyword = this.data.searchKeyword.toLowerCase().trim()
        filteredBills = filteredBills.filter(function(bill) {
          return (bill.category && bill.category.toLowerCase().indexOf(keyword) !== -1) ||
                 (bill.account && bill.account.toLowerCase().indexOf(keyword) !== -1) ||
                 (bill.notes && bill.notes.toLowerCase().indexOf(keyword) !== -1) ||
                 (bill.amount != null && !isNaN(bill.amount) && bill.amount.toString().indexOf(keyword) !== -1)
        })
      }

      if (this.data.filterType) {
        filteredBills = filteredBills.filter(bill => bill.type === this.data.filterType)
      }

      if (this.data.filterCategory) {
        filteredBills = filteredBills.filter(bill => bill.category === this.data.filterCategory)
      }

      const periodFiltered = this.filterBillsByPeriod(filteredBills)

      this.setData({ filteredBills: periodFiltered })
      this.calculateSummary(periodFiltered)
      this.groupBillsByDate(periodFiltered)
    } catch (error) {
      console.error('应用筛选失败:', error)
    }
  },

  editBill(e) {
    try {
      const id = parseInt(e.currentTarget.dataset.id)
      if (isNaN(id)) {
        wx.showToast({ title: '无效的账单ID', icon: 'none' })
        return
      }
      
      // 获取账单数据
      let bills = []
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        bills = []
      }
      
      const bill = bills.find(b => b.id === id)
      if (!bill) {
        wx.showToast({ title: '账单不存在', icon: 'none' })
        return
      }
      
      // 打开快捷记账弹窗并填充数据
      this.setData({
        showQuickAdd: true,
        isEditBill: true,
        editBillId: id,
        quickType: bill.type || 'expense',
        quickAmount: String(bill.amount || ''),
        quickCategory: bill.category || '',
        quickVoiceStatus: 'idle'
      })
      
      // 加载分类
      this.loadQuickCategories()
      // 初始化云开发
      this.initCloud()
      
    } catch (error) {
      console.error('编辑账单失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  deleteBill(e) {
    try {
      const id = parseInt(e.currentTarget.dataset.id)
      if (isNaN(id)) {
        wx.showToast({ title: '无效的账单ID', icon: 'none' })
        return
      }
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条账单吗？',
        success: (res) => {
          if (res.confirm) {
            try {
              let bills = []
              
              try {
                bills = wx.getStorageSync('bills') || []
              } catch (error) {
                console.error('读取账单失败:', error)
                wx.showToast({ title: '删除失败，请重试', icon: 'none' })
                return
              }

              if (!Array.isArray(bills)) {
                bills = []
              }

              const updatedBills = bills.filter(bill => bill.id !== id)
              
              try {
                wx.setStorageSync('bills', updatedBills)
                
                const app = getApp()
                app.invalidateCache()
                this.loadBills()
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } catch (error) {
                console.error('保存账单失败:', error)
                wx.showToast({ title: '删除失败，请重试', icon: 'none' })
              }
            } catch (error) {
              console.error('删除操作失败:', error)
              wx.showToast({ title: '删除失败，请重试', icon: 'none' })
            }
          }
        },
        fail: () => {
          wx.showToast({ title: '操作取消', icon: 'none' })
        }
      })
    } catch (error) {
      console.error('删除账单失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  loadBudgetInfo(bills) {
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      
      let budgetSetting = {}
      try {
        budgetSetting = wx.getStorageSync('budgetSetting') || {}
      } catch (error) {
        console.error('读取预算设置失败:', error)
        budgetSetting = {}
      }

      const monthlyBudget = (typeof budgetSetting.monthlyBudget === 'number' && !isNaN(budgetSetting.monthlyBudget)) ? 
        budgetSetting.monthlyBudget : 0

      if (!Array.isArray(bills) || monthlyBudget <= 0) {
        this.setData({
          budgetInfo: {
            monthlyBudget: 0,
            spentAmount: 0,
            remaining: 0,
            progressPercent: 0,
            currentMonth
          }
        })
        return
      }

      const monthStart = new Date(currentYear, currentMonth - 1, 1)
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const currentMonthBills = bills.filter(bill => {
        if (!bill.date || bill.type !== 'expense') return false
        const billDate = new Date(bill.date)
        return billDate >= monthStart && billDate <= monthEnd && !isNaN(billDate.getTime())
      })

      let spentAmount = 0
      currentMonthBills.forEach(bill => {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          spentAmount += bill.amount
        }
      })

      spentAmount = parseFloat(spentAmount.toFixed(2))
      const remaining = parseFloat((monthlyBudget - spentAmount).toFixed(2))
      let progressPercent = Math.min(Math.round((spentAmount / monthlyBudget) * 100), 100)

      this.setData({
        budgetInfo: {
          monthlyBudget,
          spentAmount,
          remaining,
          progressPercent,
          currentMonth
        }
      })

    } catch (error) {
      console.error('加载预算信息失败:', error)
      this.setData({
        budgetInfo: {
          monthlyBudget: 0,
          spentAmount: 0,
          remaining: 0,
          progressPercent: 0,
          currentMonth: new Date().getMonth() + 1
        }
      })
    }
  },

  editBudget() {
    wx.showModal({
      title: '修改月度预算',
      editable: true,
      placeholderText: '请输入月度预算金额',
      content: this.data.budgetInfo.monthlyBudget > 0 ? 
        String(this.data.budgetInfo.monthlyBudget) : '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const amount = parseFloat(res.content.trim())
          
          if (isNaN(amount) || amount <= 0) {
            wx.showToast({ title: '请输入有效金额', icon: 'none' })
            return
          }

          try {
            const budgetSetting = { monthlyBudget: amount }
            wx.setStorageSync('budgetSetting', budgetSetting)
            
            this.loadBudgetInfo(this.data.bills)
            
            wx.showToast({
              title: '预算设置成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('保存预算失败:', error)
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        } else if (res.confirm) {
          wx.showToast({ title: '请输入有效金额', icon: 'none' })
        }
      },
      fail: () => {
        console.log('取消编辑')
      }
    })
  },

  /**
   * 切换预算卡片折叠状态
   */
  toggleBudget() {
    this.setData({ budgetCollapsed: !this.data.budgetCollapsed })
  },

  setBudget() {
    wx.showModal({
      title: '设置月度预算',
      editable: true,
      placeholderText: '例如：3000',
      content: '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const amount = parseFloat(res.content.trim())
          
          if (isNaN(amount) || amount <= 0) {
            wx.showToast({ title: '请输入有效金额', icon: 'none' })
            return
          }

          try {
            const budgetSetting = { monthlyBudget: amount }
            wx.setStorageSync('budgetSetting', budgetSetting)
            
            this.loadBudgetInfo(this.data.bills)
            
            wx.showToast({
              title: '预算设置成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('保存预算失败:', error)
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        } else if (res.confirm) {
          wx.showToast({ title: '请输入有效金额', icon: 'none' })
        }
      },
      fail: () => {
        console.log('取消设置')
      }
    })
  },

  goToAddBill() {
    wx.navigateTo({
      url: '/pages/add-bill/add-bill',
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  },

  // ==================== 快捷记账弹窗 ====================
  
  /**
   * 切换快捷记账弹窗
   */
  toggleQuickAdd() {
    const show = !this.data.showQuickAdd
    this.setData({ 
      showQuickAdd: show,
      quickType: 'expense',
      quickAmount: '',
      quickCategory: '',
      quickNotes: '',
      quickVoiceStatus: 'idle',
      isEditBill: false,
      editBillId: null
    })
    
    if (show) {
      // 加载分类
      this.loadQuickCategories()
      // 初始化云开发
      this.initCloud()
    }
  },

  /**
   * 从弹窗中删除账单
   */
  deleteBillFromPopup() {
    const { editBillId } = this.data
    if (!editBillId) return
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条账单吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            let bills = wx.getStorageSync('bills') || []
            if (!Array.isArray(bills)) bills = []
            
            // 获取要删除的账单信息（用于更新余额）
            const billToDelete = bills.find(b => b.id === editBillId)
            const account = billToDelete ? (billToDelete.account || '其他') : '其他'
            
            const updatedBills = bills.filter(bill => bill.id !== editBillId)
            wx.setStorageSync('bills', updatedBills)
            
            // 更新账户余额
            billHelper.updateAccountBalance(account, 
              billHelper.calculateSingleAccountBalance(updatedBills, account))
            
            // 刷新
            const app = getApp()
            if (app && app.invalidateCache) {
              app.invalidateCache()
            }
            
            this.setData({
              showQuickAdd: false,
              isEditBill: false,
              editBillId: null
            })
            
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadBills()
            
          } catch (error) {
            console.error('删除账单失败:', error)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // ============================================================
  // 云开发初始化
  // ============================================================
  initCloud() {
    if (this.data.cloudEnvInited) return
    
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: config.cloudEnv,
          traceUser: false
        })
        this.setData({ cloudEnvInited: true })
        console.log('云开发初始化成功')
      }
    } catch (e) {
      console.error('云开发初始化失败:', e)
    }
  },

  /**
   * 加载快捷记账的分类
   */
  loadQuickCategories() {
    try {
      const app = getApp()
      let categories = []
      
      if (app && app.getCategoriesFromCache) {
        categories = app.getCategoriesFromCache() || []
      }
      
      if (!categories || categories.length === 0) {
        categories = config.defaultCategories || []
      }
      
      // 筛选支出或收入分类
      const filtered = categories.filter(cat => cat.type === this.data.quickType)
      
      // 确保"其他"分类始终在最后一位
      filtered.sort((a, b) => {
        if (a.name === '其他') return 1
        if (b.name === '其他') return -1
        return 0
      })
      
      this.setData({ quickCategories: filtered })
    } catch (error) {
      console.error('加载快捷分类失败:', error)
      this.setData({ quickCategories: [] })
    }
  },

  /**
   * 切换快捷记账类型
   */
  setQuickType(e) {
    const type = e.currentTarget.dataset.type
    if (type) {
      this.setData({ 
        quickType: type,
        quickCategory: '',
        quickAmount: ''
      })
      this.loadQuickCategories()
    }
  },

  /**
   * 输入快捷记账金额
   */
  onQuickAmountInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ quickAmount: e.detail.value })
    }
  },

  /**
   * 输入备注
   */
  onQuickNotesInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ quickNotes: e.detail.value })
    }
  },

  /**
   * 选择快捷分类
   */
  selectQuickCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category) {
      this.setData({ quickCategory: category })
    }
  },

  /**
   * 设置快捷金额
   */
  setQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    if (amount) {
      this.setData({ quickAmount: String(amount) })
    }
  },

  /**
   * 提交快捷账单（支持新增和编辑）
   */
  submitQuickBill() {
    const { quickType, quickAmount, quickCategory, quickNotes, isEditBill, editBillId } = this.data
    
    // 验证金额
    const amount = parseFloat(quickAmount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    
    // 验证分类
    if (!quickCategory) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    
    // 获取当前时间
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // 构建账单对象
    const bill = {
      id: editBillId || Date.now(),
      type: quickType,
      amount: amount,
      category: quickCategory,
      account: '其他',
      date: date,
      time: timeStr,
      notes: quickNotes || '',
      updateTime: new Date().toISOString()
    }
    
    // 检测重复账单
    let bills = wx.getStorageSync('bills') || []
    if (!Array.isArray(bills)) bills = []
    
    // 编辑模式下排除自身
    const billsToCheck = isEditBill && editBillId 
      ? bills.filter(b => b.id !== editBillId) 
      : bills
    
    const duplicateResult = billHelper.detectDuplicateBills(billsToCheck, bill, 2)
    
    // 如果检测到重复，弹出确认框
    if (duplicateResult.isDuplicate && !isEditBill) {
      const similarBill = duplicateResult.similarBills[0]
      const dateStr = similarBill.date || ''
      const timeStr2 = similarBill.time || ''
      const amountStr = similarBill.amount != null ? similarBill.amount : 0
      const amountSign = similarBill.type === 'income' ? '+' : '-'
      
      wx.showModal({
        title: '⚠️ 检测到相似账单',
        content: `今天 ${dateStr.slice(5)} ${timeStr2} 有一条相似账单：\n${amountSign}¥${amountStr}（${similarBill.category}）\n\n是否仍要保存这条账单？`,
        confirmText: '仍要保存',
        cancelText: '取消',
        confirmColor: '#e74c3c',
        success: (res) => {
          if (res.confirm) {
            this._doSaveBill(bill, quickType)
          }
        }
      })
      return
    }
    
    // 没有重复或编辑模式，直接保存
    this._doSaveBill(bill, quickType)
  },

  /**
   * 实际执行保存账单（内部方法）
   */
  _doSaveBill(bill, billType) {
    const { isEditBill, editBillId } = this.data
    
    try {
      let bills = wx.getStorageSync('bills') || []
      if (!Array.isArray(bills)) bills = []
      
      let account = '其他'
      
      if (isEditBill && editBillId) {
        // 编辑模式：更新现有账单
        const index = bills.findIndex(b => b.id === editBillId)
        if (index !== -1) {
          account = bills[index].account || '其他'
          
          bills[index] = {
            ...bills[index],
            type: bill.type,
            amount: bill.amount,
            category: bill.category,
            updateTime: new Date().toISOString()
          }
        }
        
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        // 新增模式
        bill.createTime = new Date().toISOString()
        bills.push(bill)
        
        wx.showToast({ title: '记账成功', icon: 'success' })
      }
      
      wx.setStorageSync('bills', bills)
      
      // 更新账户余额
      billHelper.updateAccountBalance(account, 
        billHelper.calculateSingleAccountBalance(bills, account))
      
      // 刷新页面数据
      const app = getApp()
      if (app && app.invalidateCache) {
        app.invalidateCache()
      }
      
      // 关闭弹窗，重置状态
      this.setData({
        showQuickAdd: false,
        isEditBill: false,
        editBillId: null
      })
      
      // 重新加载账单
      this.loadBills()
      
    } catch (error) {
      console.error('保存快捷账单失败:', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // ============================================================
  // 语音记账相关方法
  // ============================================================

  /**
   * 点击麦克风按钮 - 开始/停止录音
   */
  toggleVoiceRecord() {
    const status = this.data.quickVoiceStatus
    
    if (status === 'processing') return // 正在处理中
    
    if (status === 'idle') {
      // 开始录音
      this._requestPermissionAndRecord()
    } else if (status === 'recording') {
      // 停止录音
      this._stopRecording()
    }
  },

  /**
   * 请求权限并开始录音
   */
  _requestPermissionAndRecord() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this._startRecording()
      },
      fail: () => {
        wx.showModal({
          title: '需要麦克风权限',
          content: '语音记账需要访问麦克风，请在设置中开启权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  _startRecording() {
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager()

      this.recorderManager.onStop((res) => {
        console.log('录音结束, tempFilePath:', res.tempFilePath)
        if (res.tempFilePath) {
          this._processVoice(res.tempFilePath)
        }
      })

      this.recorderManager.onError((err) => {
        console.error('录音错误:', err)
        this.setData({ quickVoiceStatus: 'idle' })
        wx.showToast({ title: '没听清，再录一次吧', icon: 'none' })
      })
    }

    this.recorderManager.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'wav'
    })

    this.setData({ quickVoiceStatus: 'recording' })
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '正在录音...', icon: 'none', duration: 1000 })
  },

  /**
   * 停止录音
   */
  _stopRecording() {
    if (this.recorderManager) {
      this.recorderManager.stop()
      this.setData({ quickVoiceStatus: 'processing' })
    }
  },

  /**
   * 处理录音：上传到云存储 → 调用云函数识别
   */
  async _processVoice(tempFilePath) {
    if (!this.data.cloudEnvInited) {
      wx.showModal({
        title: '提示',
        content: '语音记账需要配置云开发环境ID，请联系开发者',
        showCancel: false
      })
      this.setData({ quickVoiceStatus: 'idle' })
      return
    }

    wx.showLoading({ title: '识别中...' })

    try {
      // Step 1: 上传音频到云存储
      const cloudPath = `voice-bills/${Date.now()}.wav`
      const uploadResult = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath,
          success: resolve,
          fail: reject
        })
      })

      const fileID = uploadResult.fileID
      console.log('音频上传成功:', fileID)

      // Step 2: 调用云函数识别并解析
      const result = await wx.cloud.callFunction({
        name: 'voiceBill',
        data: { fileID }
      })

      const { result: fnResult } = result
      console.log('云函数返回:', fnResult)

      wx.hideLoading()

      if (fnResult && fnResult.success && fnResult.bill) {
        this._applyVoiceResult(fnResult.recognizedText, fnResult.bill)
      } else {
        // 识别不清晰，提示用户重试
        wx.showModal({
          title: '没听清楚 😢',
          content: '请稍微说慢一点，或者靠近手机再说一遍',
          confirmText: '重新录音',
          cancelText: '手动输入',
          success: (res) => {
            if (res.confirm) {
              // 用户选择重试
              this.setData({ quickVoiceStatus: 'idle' })
            } else {
              // 用户选择手动输入
              this.setData({ quickVoiceStatus: 'idle' })
            }
          }
        })
      }

      // Step 3: 异步删除云存储中的临时音频
      wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})

    } catch (err) {
      wx.hideLoading()
      console.error('语音处理失败:', err)
      wx.showModal({
        title: '网络有点问题 🌐',
        content: '请检查网络后重新录音',
        confirmText: '知道了',
        showCancel: false
      })
      this.setData({ quickVoiceStatus: 'idle' })
    }
  },

  /**
   * 将语音识别结果填入表单
   */
  _applyVoiceResult(text, bill) {
    const updates = {
      quickVoiceStatus: 'idle'
    }

    if (bill.success) {
      // 设置类型
      if (bill.type) {
        updates.quickType = bill.type
      }
      // 设置金额（精确到小数点后两位）
      if (bill.amount != null) {
        const amountNum = parseFloat(bill.amount)
        updates.quickAmount = isNaN(amountNum) ? String(bill.amount) : amountNum.toFixed(2)
      }
      // 设置分类名称
      if (bill.category) {
        updates.quickCategory = bill.category
      }
      // 设置备注
      if (bill.notes) {
        updates.quickNotes = bill.notes
      }
      
      this.setData(updates)
      
      // 如果类型变了，需要重新加载分类
      if (bill.type) {
        this.setData({ quickType: bill.type })
        this.loadQuickCategories()
        // 延迟设置分类，等分类列表更新后再设置
        setTimeout(() => {
          this.setData({ quickCategory: bill.category })
        }, 100)
      }

      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: '识别成功 ✅', icon: 'none' })
    } else {
      // 识别到了文字但没解析出金额
      this.setData(updates)
      wx.showModal({
        title: '金额没听清 💰',
        content: '请手动输入金额，或者重新录一遍',
        confirmText: '重新录音',
        cancelText: '手动输入',
        success: (res) => {
          if (!res.confirm) {
            // 手动输入，用户已经在输入框里了，focus一下
          }
        }
      })
    }
  }
})