const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')

Page({
  data: {
    currentPeriod: 'month',
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
    theme: themeManager.currentTheme
  },

  onLoad() {
    console.log('首页 onLoad 触发')
    this.initPage()
  },

  onShow() {
    console.log('首页 onShow 触发（强制刷新）')
    // 更新主题
    const theme = themeManager.getCurrentTheme()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.currentTheme })
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
      let startDate

      switch (this.data.currentPeriod) {
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          return bills
      }

      return bills.filter(bill => {
        if (!bill.date) return false
        const billDate = new Date(bill.date)
        return billDate >= startDate && !isNaN(billDate.getTime())
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

    this.setData({
      summary: {
        expense: parseFloat(expense.toFixed(2)),
        income: parseFloat(income.toFixed(2)),
        balance: parseFloat((income - expense).toFixed(2))
      }
    })
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
      const dayBills = grouped[date]
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
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period && ['week', 'month'].includes(period)) {
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
      
      wx.navigateTo({
        url: `/pages/add-bill/add-bill?id=${id}`,
        fail: () => {
          wx.showToast({ title: '跳转失败', icon: 'none' })
        }
      })
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
  }
})