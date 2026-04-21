const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')
const billHelper = require('../../utils/bill-helper')
const holidays = require('../../utils/holidays')
const bookManager = require('../../utils/book-manager')

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarDays: [],
    selectedDate: null,
    showDetail: false,
    dateDetail: [],
    dateExpense: 0,
    dateIncome: 0,
    detailAnimation: null,
    theme: themeManager.currentTheme,
    // 月度收支汇总
    monthSummary: {
      expense: 0,
      income: 0,
      balance: 0
    },
    // 快捷记账弹窗
    showQuickAdd: false,
    quickType: 'expense',
    quickAmount: '',
    quickCategory: '',
    quickCategories: [],
    quickNotes: '',
    quickAmounts: [10, 20, 50, 100, 200, 500],
    // 语音记账相关状态
    quickVoiceStatus: 'idle',
    cloudEnvInited: false,
    // 编辑模式
    isEditBill: false,
    editBillId: null,
    // 汇总卡片折叠状态
    summaryCollapsed: false,
    // 月份导航显示
    prevMonthName: '',
    nextMonthName: '',
    // 账本相关
    currentBook: { id: 'default', name: '日常账本', icon: '📒' }
  },

  onLoad() {
    bookManager.initBooks()
    this.loadCurrentBook()
    this.generateCalendar()
    this.selectToday()
    this.setData({ theme: themeManager.currentTheme })
    this.updateMonthNames()
  },

  onShow() {
    this.loadCurrentBook()
    this.generateCalendar()
  },

  // 加载当前账本信息
  loadCurrentBook() {
    const currentBook = bookManager.getCurrentBook()
    if (currentBook) {
      this.setData({ currentBook })
    }
  },

  // 获取当前账本的账单
  getCurrentBookBills() {
    const currentBookId = bookManager.getCurrentBookId()
    const bills = wx.getStorageSync('bills') || []
    return bills.filter(b => b.bookId === currentBookId)
  },

  // 账本切换后的回调
  onBookChanged() {
    console.log('日历页：账本已切换，刷新数据')
    this.loadCurrentBook()
    this.generateCalendar()
    if (this.data.selectedDate) {
      this.selectDate({ currentTarget: { dataset: { date: this.data.selectedDate } } })
    }
  },

  onShow() {
    console.log('日历页 onShow 触发（刷新数据）')
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.generateCalendar()
    this.setData({ theme: themeManager.currentTheme })
    if (!this.data.selectedDate) {
      this.selectToday()
    } else {
      this.loadDateDetail(this.data.selectedDate)
    }
  },

  selectToday() {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayDate = `${year}-${month}-${day}`
      
      this.setData({ selectedDate: todayDate })
      this.loadDateDetail(todayDate)
      this.openDetail()
    } catch (error) {
      console.error('选择今天失败:', error)
    }
  },

  generateCalendar() {
    try {
      const { currentYear, currentMonth } = this.data
      
      if (!currentYear || !currentMonth || currentYear < 1900 || currentYear > 2100 || 
          currentMonth < 1 || currentMonth > 12) {
        const now = new Date()
        this.setData({
          currentYear: now.getFullYear(),
          currentMonth: now.getMonth() + 1
        })
        return
      }

      // 获取节日数据
      const holidayMap = holidays.getHolidays(currentYear)

      const firstDay = new Date(currentYear, currentMonth - 1, 1)
      const lastDay = new Date(currentYear, currentMonth, 0)
      
      if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
        console.error('日期计算错误')
        return
      }

      const startDay = firstDay.getDay()
      const totalDays = lastDay.getDate()

      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const prevLastDay = new Date(currentYear, currentMonth - 1, 0).getDate()
      let bills = this.getCurrentBookBills()

      bills = bills.map(function(bill) {
        var newBill = {}
        for (var key in bill) {
          if (bill.hasOwnProperty(key)) {
            newBill[key] = bill[key]
          }
        }
        newBill.amount = (typeof bill.amount === 'number' && !isNaN(bill.amount)) ? bill.amount : (bill.amount != null ? parseFloat(bill.amount) || 0 : 0)
        return newBill
      })

      var days = []

      for (var i = startDay - 1; i >= 0; i--) {
        const day = prevLastDay - i
        let month = currentMonth - 1
        let year = currentYear

        if (month === 0) {
          month = 12
          year -= 1
        }

        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        
        try {
          const dayBills = Array.isArray(bills) ? bills.filter(bill => bill.date === fullDate) : []
          const amount = dayBills.reduce((sum, bill) => {
            if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
              return bill.type === 'expense' ? sum + bill.amount : sum - bill.amount
            }
            return sum
          }, 0)

          days.push({
            day,
            isCurrentMonth: false,
            hasBills: dayBills.length > 0,
            amount: parseFloat(Math.abs(amount).toFixed(2)),
            fullDate,
            isFuture: fullDate > todayStr,
            isToday: false,
            holiday: holidayMap[fullDate] || null,
            holidayIcon: holidayMap[fullDate] ? holidays.getHolidayIcon(holidayMap[fullDate]) : null,
            holidayClass: holidayMap[fullDate] ? holidays.getHolidayClass(holidayMap[fullDate]) : null
          })
        } catch (error) {
          days.push({ day, isCurrentMonth: false, hasBills: false, amount: 0, fullDate, isFuture: fullDate > todayStr, isToday: false })
        }
      }

      for (let i = 1; i <= totalDays; i++) {
        const fullDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        
        try {
          const dayBills = Array.isArray(bills) ? bills.filter(bill => bill.date === fullDate) : []
          const amount = dayBills.reduce((sum, bill) => {
            if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
              return bill.type === 'expense' ? sum + bill.amount : sum - bill.amount
            }
            return sum
          }, 0)

          days.push({
            day: i,
            isCurrentMonth: true,
            hasBills: dayBills.length > 0,
            amount: parseFloat(Math.abs(amount).toFixed(2)),
            fullDate,
            isFuture: false,
            isToday: fullDate === todayStr,
            holiday: holidayMap[fullDate] || null,
            holidayIcon: holidayMap[fullDate] ? holidays.getHolidayIcon(holidayMap[fullDate]) : null,
            holidayClass: holidayMap[fullDate] ? holidays.getHolidayClass(holidayMap[fullDate]) : null
          })
        } catch (error) {
          days.push({ day: i, isCurrentMonth: true, hasBills: false, amount: 0, fullDate, isFuture: false, isToday: fullDate === todayStr })
        }
      }

      const remainingCells = 42 - days.length
      for (let i = 1; i <= remainingCells; i++) {
        let month = currentMonth + 1
        let year = currentYear

        if (month > 12) {
          month = 1
          year += 1
        }

        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        
        try {
          const dayBills = Array.isArray(bills) ? bills.filter(bill => bill.date === fullDate) : []
          const amount = dayBills.reduce((sum, bill) => {
            if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
              return bill.type === 'expense' ? sum + bill.amount : sum - bill.amount
            }
            return sum
          }, 0)

          days.push({
            day: i,
            isCurrentMonth: false,
            hasBills: dayBills.length > 0,
            amount: parseFloat(Math.abs(amount).toFixed(2)),
            fullDate,
            isFuture: fullDate > todayStr,
            isToday: false,
            holiday: holidayMap[fullDate] || null,
            holidayIcon: holidayMap[fullDate] ? holidays.getHolidayIcon(holidayMap[fullDate]) : null,
            holidayClass: holidayMap[fullDate] ? holidays.getHolidayClass(holidayMap[fullDate]) : null
          })
        } catch (error) {
          days.push({ day: i, isCurrentMonth: false, hasBills: false, amount: 0, fullDate, isFuture: fullDate > todayStr, isToday: false })
        }
      }

      // 计算月度收支汇总
      const monthStartStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const monthEndStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`
      
      const monthBills = bills.filter(bill => {
        if (!bill.date || typeof bill.date !== 'string') return false
        return bill.date >= monthStartStr && bill.date <= monthEndStr
      })
      
      let monthExpense = 0
      let monthIncome = 0
      monthBills.forEach(bill => {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          if (bill.type === 'expense') {
            monthExpense += bill.amount
          } else {
            monthIncome += bill.amount
          }
        }
      })
      
      const monthSummary = {
        expense: parseFloat(monthExpense.toFixed(2)),
        income: parseFloat(monthIncome.toFixed(2)),
        balance: parseFloat((monthIncome - monthExpense).toFixed(2))
      }

      this.setData({ 
        calendarDays: days,
        monthSummary
      })

    } catch (error) {
      console.error('生成日历失败:', error)
      this.setData({ calendarDays: [] })
    }
  },

  /**
   * 切换汇总卡片折叠状态
   */
  toggleSummary() {
    this.setData({ summaryCollapsed: !this.data.summaryCollapsed })
  },

  /**
   * 更新月份导航名称
   */
  updateMonthNames() {
    const { currentMonth, currentYear } = this.data
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
    
    // 上个月
    let prevM = currentMonth - 1
    if (prevM < 1) prevM = 12
    // 下个月
    let nextM = currentMonth + 1
    if (nextM > 12) nextM = 1
    
    this.setData({
      prevMonthName: monthNames[prevM - 1],
      nextMonthName: monthNames[nextM - 1]
    })
  },

  // ==================== 滑动事件处理 ====================
  
  // 卡片滑动相关变量
  _cardTouchStartX: 0,
  _cardTouchStartY: 0,
  _calendarTouchStartX: 0,
  _calendarTouchStartY: 0,

  /**
   * 顶部卡片滑动开始
   */
  onCardTouchStart(e) {
    this._cardTouchStartX = e.touches[0].clientX
    this._cardTouchStartY = e.touches[0].clientY
  },

  /**
   * 顶部卡片滑动结束 - 切换年份
   */
  onCardTouchEnd(e) {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - this._cardTouchStartX
    const deltaY = endY - this._cardTouchStartY
    
    // 水平滑动超过垂直滑动认为是左右滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // 向左滑 → 下一年
        this.nextYear()
      } else {
        // 向右滑 → 上一年
        this.prevYear()
      }
    }
  },

  /**
   * 日历区域滑动开始
   */
  onCalendarTouchStart(e) {
    this._calendarTouchStartX = e.touches[0].clientX
    this._calendarTouchStartY = e.touches[0].clientY
  },

  /**
   * 日历区域滑动结束 - 切换月份
   */
  onCalendarTouchEnd(e) {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - this._calendarTouchStartX
    const deltaY = endY - this._calendarTouchStartY
    
    // 水平滑动超过垂直滑动认为是左右滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // 向左滑 → 下个月
        this.nextMonth()
      } else {
        // 向右滑 → 上个月
        this.prevMonth()
      }
    }
  },

  prevMonth() {
    try {
      if (this.data.currentMonth === 1) {
        this.setData({ 
          currentYear: this.data.currentYear - 1,
          currentMonth: 12 
        })
      } else {
        this.setData({ currentMonth: this.data.currentMonth - 1 })
      }
      
      this.generateCalendar()
      this.updateMonthNames()
      this.closeDetail()
    } catch (error) {
      console.error('切换月份失败:', error)
    }
  },

  nextMonth() {
    try {
      if (this.data.currentMonth === 12) {
        this.setData({ 
          currentYear: this.data.currentYear + 1,
          currentMonth: 1 
        })
      } else {
        this.setData({ currentMonth: this.data.currentMonth + 1 })
      }
      
      this.generateCalendar()
      this.updateMonthNames()
      this.closeDetail()
    } catch (error) {
      console.error('切换月份失败:', error)
    }
  },

  prevYear() {
    try {
      this.setData({ currentYear: this.data.currentYear - 1 })
      this.generateCalendar()
      this.updateMonthNames()
      this.closeDetail()
    } catch (error) {
      console.error('切换年份失败:', error)
    }
  },

  nextYear() {
    try {
      this.setData({ currentYear: this.data.currentYear + 1 })
      this.generateCalendar()
      this.updateMonthNames()
      this.closeDetail()
    } catch (error) {
      console.error('切换年份失败:', error)
    }
  },

  selectDate(e) {
    try {
      const date = e.currentTarget.dataset.date
      
      if (!date) return

      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      if (date > todayStr) {
        wx.showToast({
          title: '不能选择未来日期',
          icon: 'none'
        })
        return
      }

      if (date === this.data.selectedDate && this.data.showDetail) {
        this.closeDetail()
      } else {
        this.setData({ selectedDate: date })
        this.loadDateDetail(date)
        this.openDetail()
      }
    } catch (error) {
      console.error('选择日期失败:', error)
    }
  },

  openDetail() {
    try {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-in-out'
      })

      animation.height('auto').opacity(1).step()

      this.setData({
        showDetail: true,
        detailAnimation: animation.export()
      })
    } catch (error) {
      console.error('展开详情失败:', error)
      this.setData({ showDetail: true })
    }
  },

  closeDetail() {
    try {
      const animation = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease-in-out'
      })

      animation.height(0).opacity(0).step()

      this.setData({
        showDetail: false,
        detailAnimation: animation.export(),
        dateDetail: [],
        dateExpense: 0,
        dateIncome: 0
      })

      setTimeout(() => {
        this.setData({ selectedDate: null })
      }, 200)
    } catch (error) {
      console.error('关闭详情失败:', error)
      this.setData({
        showDetail: false,
        selectedDate: null,
        dateDetail: [],
        dateExpense: 0,
        dateIncome: 0
      })
    }
  },

  loadDateDetail(date) {
    try {
      if (!date) return

      let bills = this.getCurrentBookBills()

      bills = bills.map(function(bill) {
        var newBill = {}
        for (var key in bill) {
          if (bill.hasOwnProperty(key)) {
            newBill[key] = bill[key]
          }
        }
        newBill.amount = (typeof bill.amount === 'number' && !isNaN(bill.amount)) ? bill.amount : (bill.amount != null ? parseFloat(bill.amount) || 0 : 0)
        return newBill
      })

      // 使用 config.js 的 iconMap（统一来源）
      const dateBills = bills.filter(bill => bill.date === date).sort((a, b) => {
        const timeA = a.updateTime || a.createTime || ''
        const timeB = b.updateTime || b.createTime || ''
        return new Date(timeB) - new Date(timeA)
      }).map(function(bill) {
        var newBill = {}
        for (var key in bill) {
          if (bill.hasOwnProperty(key)) {
            newBill[key] = bill[key]
          }
        }
        newBill.icon = config.iconMap[bill.category] || '📊'
        return newBill
      })

      let expense = 0
      let income = 0

      dateBills.forEach(bill => {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          if (bill.type === 'expense') {
            expense += bill.amount
          } else {
            income += bill.amount
          }
        }
      })

      // 使用 parseFloat 确保浮点数精度，显示时保留两位小数
      expense = parseFloat(expense.toFixed(2))
      income = parseFloat(income.toFixed(2))

      this.setData({
        dateDetail: dateBills,
        dateExpense: expense,
        dateIncome: income
      })
    } catch (error) {
      console.error('加载日期详情失败:', error)
      this.setData({
        dateDetail: [],
        dateExpense: 0,
        dateIncome: 0
      })
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
      const bills = this.getCurrentBookBills()
      
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
      
      this.loadQuickCategories()
      this.initCloud()
      
    } catch (error) {
      console.error('编辑账单失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  addBillForDate() {
    if (!this.data.selectedDate) return

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    if (this.data.selectedDate > todayStr) {
      wx.showToast({
        title: '不能为未来日期添加账单',
        icon: 'none'
      })
      return
    }

    // 打开快捷记账弹窗
    this.setData({
      showQuickAdd: true,
      quickType: 'expense',
      quickAmount: '',
      quickCategory: '',
      quickVoiceStatus: 'idle',
      isEditBill: false,
      editBillId: null
    })
    this.loadQuickCategories()
    this.initCloud()
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
      this.loadQuickCategories()
      this.initCloud()
    }
  },

  /**
   * 初始化云开发
   */
  initCloud() {
    if (this.data.cloudEnvInited) return
    
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: config.cloudEnv,
          traceUser: false
        })
        this.setData({ cloudEnvInited: true })
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
      
      const filtered = categories.filter(cat => cat.type === this.data.quickType)
      
      // 确保"其他"分类始终在最后一位
      filtered.sort((a, b) => {
        if (a.name === '其他') return 1
        if (b.name === '其他') return -1
        return 0
      })
      
      this.setData({ quickCategories: filtered })
    } catch (error) {
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
   * 提交快捷账单
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
    
    // 使用日历选中的日期
    const date = this.data.selectedDate || new Date().toISOString().split('T')[0]
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
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
    const bills = this.getCurrentBookBills()
    
    const billsToCheck = isEditBill && editBillId 
      ? bills.filter(b => b.id !== editBillId) 
      : bills
    
    const duplicateResult = billHelper.detectDuplicateBills(billsToCheck, bill, 2)
    
    if (duplicateResult.isDuplicate && !isEditBill) {
      const similarBill = duplicateResult.similarBills[0]
      const dateStr = similarBill.date || ''
      const timeStr2 = similarBill.time || ''
      const amountStr = similarBill.amount != null ? similarBill.amount : 0
      const amountSign = similarBill.type === 'income' ? '+' : '-'
      
      wx.showModal({
        title: '⚠️ 检测到相似账单',
        content: `${dateStr.slice(5)} ${timeStr2} 有一条相似账单：\n${amountSign}¥${amountStr}（${similarBill.category}）\n\n是否仍要保存这条账单？`,
        confirmText: '仍要保存',
        cancelText: '取消',
        confirmColor: '#e74c3c',
        success: (res) => {
          if (res.confirm) {
            this._doSaveBill(bill)
          }
        }
      })
      return
    }
    
    this._doSaveBill(bill)
  },

  /**
   * 实际执行保存账单
   */
  _doSaveBill(bill) {
    const { isEditBill, editBillId } = this.data
    
    try {
      let bills = wx.getStorageSync('bills') || []
      if (!Array.isArray(bills)) bills = []

      // 确保所有账单都有 bookId
      bills.forEach(b => {
        if (!b.bookId) b.bookId = 'default'
      })
      
      // 获取当前账本ID
      const currentBookId = bookManager.getCurrentBookId()
      
      // 添加账本ID到新账单
      bill.bookId = currentBookId
      
      let account = '其他'
      
      if (isEditBill && editBillId) {
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
        bill.createTime = new Date().toISOString()
        bills.push(bill)
        wx.showToast({ title: '记账成功', icon: 'success' })
      }
      
      wx.setStorageSync('bills', bills)
      
      billHelper.updateAccountBalance(account, 
        billHelper.calculateSingleAccountBalance(bills, account))
      
      const app = getApp()
      if (app && app.invalidateCache) {
        app.invalidateCache()
      }
      
      this.setData({
        showQuickAdd: false,
        isEditBill: false,
        editBillId: null
      })
      
      // 刷新日历和详情
      this.generateCalendar()
      if (this.data.selectedDate) {
        this.loadDateDetail(this.data.selectedDate)
      }
      
    } catch (error) {
      console.error('保存快捷账单失败:', error)
      wx.showToast({ title: '保存失败', icon: 'none' })
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
            
            const currentBookId = bookManager.getCurrentBookId()
            
            const billToDelete = bills.find(b => b.id === editBillId && b.bookId === currentBookId)
            const account = billToDelete ? (billToDelete.account || '其他') : '其他'
            
            // 只删除当前账本的账单
            const updatedBills = bills.filter(b => !(b.id === editBillId && b.bookId === currentBookId))
            wx.setStorageSync('bills', updatedBills)
            
            billHelper.updateAccountBalance(account, 
              billHelper.calculateSingleAccountBalance(updatedBills, account))
            
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
            this.generateCalendar()
            if (this.data.selectedDate) {
              this.loadDateDetail(this.data.selectedDate)
            }
            
          } catch (error) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // ==================== 语音记账 ====================

  /**
   * 点击麦克风按钮 - 开始/停止录音
   */
  toggleVoiceRecord() {
    const status = this.data.quickVoiceStatus
    
    if (status === 'processing') return
    
    if (status === 'idle') {
      this._requestPermissionAndRecord()
    } else if (status === 'recording') {
      this._stopRecording()
    }
  },

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
        if (res.tempFilePath) {
          this._processVoice(res.tempFilePath)
        }
      })

      this.recorderManager.onError((err) => {
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

  _stopRecording() {
    if (this.recorderManager) {
      this.recorderManager.stop()
      this.setData({ quickVoiceStatus: 'processing' })
    }
  },

  async _processVoice(tempFilePath) {
    if (!this.data.cloudEnvInited) {
      wx.showModal({
        title: '提示',
        content: '语音记账需要配置云开发环境ID',
        showCancel: false
      })
      this.setData({ quickVoiceStatus: 'idle' })
      return
    }

    wx.showLoading({ title: '识别中...' })

    try {
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

      const result = await wx.cloud.callFunction({
        name: 'voiceBill',
        data: { fileID }
      })

      const { result: fnResult } = result

      wx.hideLoading()

      if (fnResult && fnResult.success && fnResult.bill) {
        this._applyVoiceResult(fnResult.recognizedText, fnResult.bill)
      } else {
        wx.showModal({
          title: '没听清楚 😢',
          content: '请稍微说慢一点，或者靠近手机再说一遍',
          confirmText: '重新录音',
          cancelText: '手动输入',
          success: (res) => {
            this.setData({ quickVoiceStatus: 'idle' })
          }
        })
      }

      wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})

    } catch (err) {
      wx.hideLoading()
      wx.showModal({
        title: '网络有点问题 🌐',
        content: '请检查网络后重新录音',
        confirmText: '知道了',
        showCancel: false
      })
      this.setData({ quickVoiceStatus: 'idle' })
    }
  },

  _applyVoiceResult(text, bill) {
    const updates = { quickVoiceStatus: 'idle' }

    if (bill.success) {
      if (bill.type) updates.quickType = bill.type
      if (bill.amount != null) updates.quickAmount = String(bill.amount)
      if (bill.category) updates.quickCategory = bill.category
      
      this.setData(updates)
      
      if (bill.type) {
        this.setData({ quickType: bill.type })
        this.loadQuickCategories()
        setTimeout(() => {
          this.setData({ quickCategory: bill.category })
        }, 100)
      }

      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: '识别成功 ✅', icon: 'none' })
    } else {
      this.setData(updates)
      wx.showModal({
        title: '金额没听清 💰',
        content: '请手动输入金额，或者重新录一遍',
        confirmText: '重新录音',
        cancelText: '手动输入'
      })
    }
  }
})