const app = getApp()
const themeManager = require('../../utils/theme-manager')
const billHelper = require('../../utils/bill-helper')

Page({
  data: {
    theme: 'warm',
    recurringList: [],
    expandedId: null,
    showModal: false,
    isEdit: false,
    editingId: null,

    // 表单数据
    formData: {
      name: '',
      type: 'expense',
      amount: '',
      frequency: 'monthly',
      weeklyDay: null,
      monthlyDay: 1,
      yearlyMonth: 1,
      yearlyDay: 1,
      category: '',
      account: '',
      notes: '',
      reminderEnabled: false,
      reminderTime: '09:00'
    },

    // 选择器
    showCategoryModal: false,
    showAccountModal: false,
    categories: [],
    accounts: [],

    // 选择器数据
    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    days: Array.from({ length: 28 }, (_, i) => i + 1),
    months: Array.from({ length: 12 }, (_, i) => i + 1),
    yearDays: Array.from({ length: 31 }, (_, i) => i + 1)
  },

  onLoad() {
    this.initTheme()
    this.loadRecurringList()
    this.loadCategories()
    this.loadAccounts()
  },

  onShow() {
    this.updateTheme()
    this.loadRecurringList()
  },

  initTheme() {
    const theme = themeManager.getCurrentTheme()
    this.setData({ theme })
    // 设置导航栏颜色
    const themeObj = themeManager.getThemeObject()
    if (themeObj) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: themeObj.primary
      })
    }
  },

  updateTheme() {
    const theme = themeManager.getCurrentTheme()
    if (this.data.theme !== theme) {
      this.setData({ theme })
      // 设置导航栏颜色
      const themeObj = themeManager.getThemeObject()
      if (themeObj) {
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: themeObj.primary
        })
      }
    }
  },

  // 加载周期账单列表
  loadRecurringList() {
    const recurringList = wx.getStorageSync('recurringBills') || []
    // 按下次到期时间排序
    recurringList.sort((a, b) => {
      if (!a.nextDue) return 1
      if (!b.nextDue) return -1
      return a.nextDue.localeCompare(b.nextDue)
    })
    this.setData({ recurringList })
  },

  // 加载分类
  loadCategories() {
    const categories = app.getCategoriesFromCache()
    this.setData({ categories })
  },

  // 加载账户
  loadAccounts() {
    const accounts = wx.getStorageSync('accounts') || []
    this.setData({ accounts })
  },

  // 获取周期文字描述
  getFrequencyText(frequency, item) {
    const frequencyMap = {
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      yearly: '每年'
    }

    let text = frequencyMap[frequency] || frequency

    if (frequency === 'weekly' && item.weeklyDay !== null && item.weeklyDay !== undefined) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      text = '每周' + weekdays[item.weeklyDay]
    } else if (frequency === 'monthly' && item.monthlyDay) {
      text = `每月${item.monthlyDay}日`
    } else if (frequency === 'yearly' && item.yearlyMonth && item.yearlyDay) {
      text = `每年${item.yearlyMonth}月${item.yearlyDay}日`
    }

    return text
  },

  // 切换展开
  toggleExpand(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      expandedId: this.data.expandedId === id ? null : id
    })
  },

  // 显示添加弹窗
  showAddModal() {
    this.setData({
      showModal: true,
      isEdit: false,
      editingId: null,
      formData: {
        name: '',
        type: 'expense',
        amount: '',
        frequency: 'monthly',
        weeklyDay: null,
        monthlyDay: 1,
        yearlyMonth: 1,
        yearlyDay: 1,
        category: '',
        account: '',
        notes: '',
        reminderEnabled: false,
        reminderTime: '09:00'
      }
    })
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({ showModal: false })
  },

  // 表单输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onAmountInput(e) {
    this.setData({
      'formData.amount': e.detail.value
    })
  },

  onNotesInput(e) {
    this.setData({
      'formData.notes': e.detail.value
    })
  },

  // 设置类型
  setFormType(e) {
    this.setData({
      'formData.type': e.currentTarget.dataset.type
    })
  },

  // 设置周期
  setFrequency(e) {
    const frequency = e.currentTarget.dataset.freq
    let formData = { ...this.data.formData, frequency }

    // 设置默认值
    if (frequency === 'weekly' && formData.weeklyDay === null) {
      formData.weeklyDay = new Date().getDay()
    } else if (frequency === 'monthly' && !formData.monthlyDay) {
      formData.monthlyDay = new Date().getDate()
    } else if (frequency === 'yearly') {
      if (!formData.yearlyMonth) formData.yearlyMonth = new Date().getMonth() + 1
      if (!formData.yearlyDay) formData.yearlyDay = new Date().getDate()
    }

    this.setData({ formData })
  },

  // 设置周期参数
  setWeeklyDay(e) {
    this.setData({
      'formData.weeklyDay': e.currentTarget.dataset.day
    })
  },

  setMonthlyDay(e) {
    const days = this.data.days
    this.setData({
      'formData.monthlyDay': days[e.detail.value]
    })
  },

  setYearlyMonth(e) {
    const months = this.data.months
    this.setData({
      'formData.yearlyMonth': months[e.detail.value]
    })
  },

  setYearlyDay(e) {
    const yearDays = this.data.yearDays
    this.setData({
      'formData.yearlyDay': yearDays[e.detail.value]
    })
  },

  // 分类选择器
  showCategoryPicker() {
    this.setData({ showCategoryModal: true })
  },

  hideCategoryModal() {
    this.setData({ showCategoryModal: false })
  },

  selectCategory(e) {
    const name = e.currentTarget.dataset.name
    this.setData({
      'formData.category': name,
      showCategoryModal: false
    })
  },

  // 账户选择器
  showAccountPicker() {
    this.setData({ showAccountModal: true })
  },

  hideAccountModal() {
    this.setData({ showAccountModal: false })
  },

  selectAccount(e) {
    const name = e.currentTarget.dataset.name
    this.setData({
      'formData.account': name,
      showAccountModal: false
    })
  },

  // 提醒开关
  toggleReminder() {
    const newState = !this.data.formData.reminderEnabled
    this.setData({
      'formData.reminderEnabled': newState
    })

    // 如果是开启提醒，则请求订阅消息权限
    if (newState) {
      this.requestSubscribePermission()
    }
  },

  // 请求订阅消息权限
  requestSubscribePermission() {
    // 微信订阅消息模板 ID
    const templateId = '0dPTUcgkI9JVdgT6ebiRMMW5sZqUoqH_411Bkb66FlQ'

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          wx.showToast({
            title: '提醒开启成功',
            icon: 'success'
          })
          // 保存用户授权状态
          wx.setStorageSync('reminderSubscribed', true)
        } else if (res[templateId] === 'reject') {
          wx.showToast({
            title: '您已拒绝订阅',
            icon: 'none'
          })
          // 关闭提醒
          this.setData({
            'formData.reminderEnabled': false
          })
        }
      },
      fail: (err) => {
        console.error('订阅消息请求失败', err)
        wx.showToast({
          title: '订阅请求失败',
          icon: 'none'
        })
      }
    })
  },

  // 发送单条提醒（通过云函数）
  async sendReminder(recurringId) {
    try {
      const openid = wx.getStorageSync('userOpenid')
      if (!openid) {
        console.error('未找到用户 openid')
        return false
      }

      const result = await wx.cloud.callFunction({
        name: 'sendReminder',
        data: {
          recurringId,
          openid
        }
      })

      return result.result.success
    } catch (err) {
      console.error('发送提醒失败', err)
      return false
    }
  },

  // 设置提醒时间
  setReminderTime(e) {
    this.setData({
      'formData.reminderTime': e.detail.value
    })
  },

  // 保存周期账单
  saveRecurring() {
    const { formData } = this.data

    // 验证
    if (!formData.name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    if (!formData.category) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    if (!formData.account) {
      wx.showToast({ title: '请选择账户', icon: 'none' })
      return
    }

    // 找到分类图标
    const category = this.data.categories.find(c => c.name === formData.category)
    const icon = category ? category.icon : '📋'

    const recurringList = wx.getStorageSync('recurringBills') || []

    const recurringData = {
      recurringId: this.data.isEdit ? this.data.editingId : 'rec_' + Date.now(),
      name: formData.name,
      type: formData.type,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      weeklyDay: formData.frequency === 'weekly' ? formData.weeklyDay : null,
      monthlyDay: formData.frequency === 'monthly' ? formData.monthlyDay : null,
      yearlyMonth: formData.frequency === 'yearly' ? formData.yearlyMonth : null,
      yearlyDay: formData.frequency === 'yearly' ? formData.yearlyDay : null,
      category: formData.category,
      account: formData.account,
      notes: formData.notes,
      reminderEnabled: formData.reminderEnabled,
      reminderTime: formData.reminderTime || '09:00',
      icon: icon,
      enabled: true,
      createTime: this.data.isEdit ? undefined : new Date().toISOString()
    }

    // 计算下次到期
    recurringData.nextDue = billHelper.calculateNextDue(formData.frequency, {
      weeklyDay: recurringData.weeklyDay,
      monthlyDay: recurringData.monthlyDay,
      yearlyMonth: recurringData.yearlyMonth,
      yearlyDay: recurringData.yearlyDay
    })

    if (this.data.isEdit) {
      // 编辑模式：更新现有数据
      const index = recurringList.findIndex(r => r.recurringId === this.data.editingId)
      if (index !== -1) {
        recurringData.createTime = recurringList[index].createTime
        recurringList[index] = recurringData
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
    } else {
      // 添加模式
      recurringList.push(recurringData)
      wx.showToast({ title: '添加成功', icon: 'success' })
    }

    wx.setStorageSync('recurringBills', recurringList)

    this.setData({ showModal: false })
    this.loadRecurringList()
  },

  // 编辑周期账单
  editRecurring(e) {
    const id = e.currentTarget.dataset.id
    const recurring = this.data.recurringList.find(r => r.recurringId === id)

    if (!recurring) return

    this.setData({
      showModal: true,
      isEdit: true,
      editingId: id,
      formData: {
        name: recurring.name,
        type: recurring.type,
        amount: String(recurring.amount),
        frequency: recurring.frequency,
        weeklyDay: recurring.weeklyDay,
        monthlyDay: recurring.monthlyDay || 1,
        yearlyMonth: recurring.yearlyMonth || 1,
        yearlyDay: recurring.yearlyDay || 1,
        category: recurring.category,
        account: recurring.account,
        notes: recurring.notes || '',
        reminderEnabled: recurring.reminderEnabled || false,
        reminderTime: recurring.reminderTime || '09:00'
      }
    })
  },

  // 删除周期账单
  deleteRecurring(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条周期账单吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          let recurringList = wx.getStorageSync('recurringBills') || []
          recurringList = recurringList.filter(r => r.recurringId !== id)
          wx.setStorageSync('recurringBills', recurringList)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadRecurringList()
        }
      }
    })
  },

  // 切换启用状态
  toggleEnabled(e) {
    const id = e.currentTarget.dataset.id
    let recurringList = wx.getStorageSync('recurringBills') || []
    const index = recurringList.findIndex(r => r.recurringId === id)

    if (index !== -1) {
      recurringList[index].enabled = !recurringList[index].enabled
      wx.setStorageSync('recurringBills', recurringList)
      this.loadRecurringList()
    }
  },

  // 添加账单（根据周期账单生成一笔新账单）
  addBill(e) {
    const id = e.currentTarget.dataset.id
    const recurring = this.data.recurringList.find(r => r.recurringId === id)

    if (!recurring) return

    // 跳转到添加账单页，预填数据
    wx.navigateTo({
      url: `/pages/add-bill/add-bill?recurring=1&name=${encodeURIComponent(recurring.name)}&type=${recurring.type}&amount=${recurring.amount}&category=${encodeURIComponent(recurring.category)}&account=${encodeURIComponent(recurring.account)}&notes=${encodeURIComponent(recurring.notes || '')}`
    })
  }
})
