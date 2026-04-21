const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')

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
    theme: themeManager.currentTheme
  },

  onLoad() {
    this.generateCalendar()
    this.selectToday()
    this.setData({ theme: themeManager.currentTheme })
  },

  onShow() {
    console.log('日历页 onShow 触发（刷新数据）')
    // 更新主题
    const theme = themeManager.getCurrentTheme()
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
      let bills = []
      
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        console.error('读取账单失败:', error)
        bills = []
      }

      if (!Array.isArray(bills)) {
        bills = []
      }

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
            amount: Math.abs(amount),
            fullDate,
            isFuture: fullDate > todayStr
          })
        } catch (error) {
          days.push({ day, isCurrentMonth: false, hasBills: false, amount: 0, fullDate, isFuture: fullDate > todayStr })
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
            amount: Math.abs(amount),
            fullDate,
            isFuture: false
          })
        } catch (error) {
          days.push({ day: i, isCurrentMonth: true, hasBills: false, amount: 0, fullDate, isFuture: false })
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
            amount: Math.abs(amount),
            fullDate,
            isFuture: fullDate > todayStr
          })
        } catch (error) {
          days.push({ day: i, isCurrentMonth: false, hasBills: false, amount: 0, fullDate, isFuture: fullDate > todayStr })
        }
      }

      this.setData({ calendarDays: days })

    } catch (error) {
      console.error('生成日历失败:', error)
      this.setData({ calendarDays: [] })
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
      this.closeDetail()
    } catch (error) {
      console.error('切换月份失败:', error)
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

      let bills = []
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        console.error('读取账单失败:', error)
        bills = []
      }

      if (!Array.isArray(bills)) {
        bills = []
      }

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
        return new Date(timeA) - new Date(timeB)
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

    wx.navigateTo({
      url: `/pages/add-bill/add-bill?date=${this.data.selectedDate}`,
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
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