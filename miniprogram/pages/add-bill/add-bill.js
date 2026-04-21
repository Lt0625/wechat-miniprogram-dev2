const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')
const billHelper = require('../../utils/bill-helper')
const bookManager = require('../../utils/book-manager')

Page({
  data: {
    isEdit: false,
    editId: null,
    type: 'expense',
    amount: '',
    category: '',
    account: '',
    date: '',
    notes: '',
    quickAmounts: [10, 20, 50, 100, 200, 500],
    categories: [],
    filteredCategories: [],
    accounts: [],
    templates: [],
    showCustomAccountInput: false,
    customAccountName: '',
    customAccountFocus: false,
    // 语音记账相关状态
    voiceStatus: 'idle',  // idle | recording | processing
    voiceResult: {
      text: '',
      parsed: false
    },
    cloudEnvInited: false,
    theme: themeManager.currentTheme,
    // 账本相关
    currentBook: { id: 'default', name: '日常账本', icon: '📒' },
    // 编辑时的原始账单数据（用于计算余额变化）
    originalBill: null
  },

  onLoad(options) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    this.setData({
      date: `${year}-${month}-${day}`,
      theme: themeManager.currentTheme
    })

    // 处理账单复制模式
    if (options && options.isCopy === 'true') {
      // 从首页复制的账单，预填数据
      const prefilledData = {
        type: options.type || 'expense',
        amount: options.amount || '',
        category: options.category ? decodeURIComponent(options.category) : '',
        account: options.account ? decodeURIComponent(options.account) : '',
        notes: options.notes ? decodeURIComponent(options.notes) : ''
      }
      
      this.setData({
        ...prefilledData,
        isEdit: false  // 复制模式不是编辑
      })
      
      wx.setNavigationBarTitle({ title: '复制账单' })
    } else if (options && options.id) {
      this.setData({ 
        isEdit: true, 
        editId: parseInt(options.id) 
      })
      this.loadBillData(options.id)
    }

    this.loadCategories()
    this.loadAccounts()
    this.loadTemplates()
    this.initCloud()

    if (options && options.date) {
      this.setData({ date: options.date })
    }
  },

  onShow() {
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.currentTheme })
  },

  // ============================================================
  // 云开发初始化
  // ============================================================
  initCloud() {
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: config.cloudEnv,  // 从 config.js 读取
          traceUser: false
        })
        this.setData({ cloudEnvInited: true })
        console.log('云开发初始化成功')
      } else {
        console.warn('当前微信版本不支持云开发')
      }
    } catch (e) {
      console.error('云开发初始化失败:', e)
    }
  },

  // ============================================================
  // 语音记账相关方法
  // ============================================================

  /**
   * 按住麦克风按钮 - 开始录音
   */
  onVoiceStart() {
    if (this.data.voiceStatus === 'processing') return

    // 请求麦克风权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this._startRecording()
      },
      fail: () => {
        // 权限被拒绝，引导用户开启
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
        this.setData({ voiceStatus: 'idle' })
        wx.showToast({ title: '录音失败，请重试', icon: 'none' })
      })
    }

    this.recorderManager.start({
      duration: 30000,   // 最长30秒
      sampleRate: 16000, // 16k采样率
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'wav'      // 使用 wav 格式，ASR最稳定
    })

    this.setData({ voiceStatus: 'recording' })
    wx.vibrateShort({ type: 'light' }) // 触觉反馈
  },

  /**
   * 松开麦克风按钮 - 停止录音
   */
  onVoiceEnd() {
    if (this.data.voiceStatus !== 'recording') return
    if (this.recorderManager) {
      this.recorderManager.stop()
      this.setData({ voiceStatus: 'processing' })
    }
  },

  /**
   * 取消录音（手指滑出按钮区域）
   */
  onVoiceCancel() {
    if (this.data.voiceStatus === 'recording' && this.recorderManager) {
      this.recorderManager.stop()
      this.setData({ voiceStatus: 'idle' })
    }
  },

  /**
   * 处理录音：上传到云存储 → 调用云函数识别
   */
  async _processVoice(tempFilePath) {
    if (!this.data.cloudEnvInited) {
      // 云开发未初始化，提示用户配置
      wx.showModal({
        title: '提示',
        content: '语音记账需要配置云开发环境ID，请联系开发者',
        showCancel: false
      })
      this.setData({ voiceStatus: 'idle' })
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
        // 识别失败
        const errMsg = (fnResult && fnResult.message) || '未能识别语音，请手动输入'
        wx.showToast({ title: errMsg, icon: 'none', duration: 2000 })
        this.setData({ voiceStatus: 'idle' })
      }

      // Step 3: 异步删除云存储中的临时音频（不阻塞主流程）
      wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})

    } catch (err) {
      wx.hideLoading()
      console.error('语音处理失败:', err)
      wx.showToast({ title: '识别失败，请重试', icon: 'none' })
      this.setData({ voiceStatus: 'idle' })
    }
  },

  /**
   * 将语音识别结果填入表单
   */
  _applyVoiceResult(text, bill) {
    const updates = {
      voiceStatus: 'idle',
      voiceResult: {
        text: text || '',
        parsed: bill.success
      }
    }

    if (bill.success) {
      if (bill.type) updates.type = bill.type
      if (bill.amount != null) updates.amount = String(bill.amount)
      if (bill.notes) updates.notes = bill.notes
      
      this.setData(updates)

      // 更新分类列表后再设置分类（需要先过滤到对应类型）
      this.filterCategoriesByType(this.data.categories)
      
      if (bill.category) {
        this.setData({ category: bill.category })
      }

      wx.vibrateShort({ type: 'medium' })
      wx.showToast({ title: '识别成功 ✅', icon: 'none' })
    } else {
      // 识别到文字但解析不到金额
      this.setData(updates)
      wx.showToast({ title: '请补充金额信息', icon: 'none' })
    }
  },

  loadCategories() {
    try {
      let categories = []
      
      try {
        categories = wx.getStorageSync('categories') || []
      } catch (error) {
        console.error('读取分类失败:', error)
        categories = []
      }
      
      if (categories.length === 0) {
        // 使用 config.js 中的默认分类（统一来源）
        categories = config.defaultCategories.map(function(cat) {
          return {
            name: cat.name,
            type: cat.type,
            icon: config.iconMap[cat.name] || '📦'
          }
        })
        
        try {
          wx.setStorageSync('categories', categories)
        } catch (error) {
          console.error('保存默认分类失败:', error)
        }
      } else {
        // 补充缺失的 icon
        categories = categories.map(function(cat) {
          var newCat = {}
          for (var key in cat) {
            if (cat.hasOwnProperty(key)) {
              newCat[key] = cat[key]
            }
          }
          newCat.icon = cat.icon || config.iconMap[cat.name] || '📦'
          return newCat
        })
      }

      this.filterCategoriesByType(categories)
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({
        categories: [],
        filteredCategories: []
      })
    }
  },

  loadAccounts() {
    try {
      let accounts = []
      
      try {
        accounts = wx.getStorageSync('accounts') || []
      } catch (error) {
        console.error('读取账户失败:', error)
        accounts = []
      }

      if (!Array.isArray(accounts)) {
        accounts = []
      }

      if (accounts.length === 0) {
        // 使用 config.js 中的默认账户（统一来源）
        const defaultAccounts = config.defaultAccounts
        
        try {
          wx.setStorageSync('accounts', defaultAccounts)
        } catch (error) {
          console.error('保存默认账户失败:', error)
        }

        this.setData({ accounts: defaultAccounts })
      } else {
        this.setData({ accounts })
      }

    } catch (error) {
      console.error('加载账户失败:', error)
      this.setData({ accounts: [] })
    }
  },

  filterCategoriesByType(categories) {
    try {
      if (!Array.isArray(categories)) {
        this.setData({ filteredCategories: [] })
        return
      }

      let filtered = categories.filter(cat => cat.type === this.data.type || !cat.type)
      
      // 确保"其他"分类始终在最后一位
      filtered.sort((a, b) => {
        if (a.name === '其他') return 1
        if (b.name === '其他') return -1
        return 0
      })
      
      this.setData({ 
        categories,
        filteredCategories: filtered.length > 0 ? filtered : categories
      })
    } catch (error) {
      console.error('过滤分类失败:', error)
      this.setData({ 
        categories: Array.isArray(categories) ? categories : [],
        filteredCategories: Array.isArray(categories) ? categories : []
      })
    }
  },

  loadBillData(id) {
    try {
      if (!id || isNaN(parseInt(id))) {
        wx.showToast({ title: '无效的账单ID', icon: 'none' })
        return
      }

      let bills = []
      
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        console.error('读取账单失败:', error)
        wx.showToast({ title: '读取账单失败', icon: 'none' })
        return
      }

      if (!Array.isArray(bills)) {
        bills = []
      }

      const bill = bills.find(b => b.id === parseInt(id))
      
      if (bill) {
        this.setData({
          type: bill.type || 'expense',
          amount: bill.amount != null && !isNaN(bill.amount) ? String(bill.amount) : '',
          category: bill.category || '',
          account: bill.account || '',
          date: bill.date || this.data.date,
          notes: bill.notes || '',
          originalBill: bill  // 保存原始账单数据
        })
        
        this.loadCategories()
      } else {
        wx.showToast({ title: '未找到该账单记录', icon: 'none' })
      }
    } catch (error) {
      console.error('加载账单数据失败:', error)
      wx.showToast({ title: '加载数据失败', icon: 'none' })
    }
  },

  loadTemplates() {
    try {
      const templates = wx.getStorageSync('templates') || []
      this.setData({ templates: Array.isArray(templates) ? templates : [] })
    } catch (error) {
      console.error('加载模板失败:', error)
      this.setData({ templates: [] })
    }
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type && ['expense', 'income'].includes(type)) {
      this.setData({ type, category: '' })
      this.filterCategoriesByType(this.data.categories)
    }
  },

  onAmountInput(e) {
    try {
      let value = e.detail.value
      
      if (!value || typeof value !== 'string') {
        this.setData({ amount: '' })
        return
      }
      
      value = value.replace(/[^\d.]/g, '')
      
      const parts = value.split('.')
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
      }
      
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
      }
      
      this.setData({ amount: value })
    } catch (error) {
      console.error('金额输入处理失败:', error)
    }
  },

  setQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    if (amount != null && !isNaN(amount)) {
      this.setData({ amount: String(amount) })
    }
  },

  selectCategory(e) {
    const name = e.currentTarget.dataset.name
    if (name) {
      this.setData({ category: name })
    }
  },

  selectAccount(e) {
    const name = e.currentTarget.dataset.name
    if (name) {
      this.setData({ 
        account: name,
        showCustomAccountInput: false,
        customAccountName: ''
      })
    }
  },

  selectOtherAccount() {
    this.setData({
      account: '其他',
      showCustomAccountInput: true,
      customAccountName: '',
      customAccountFocus: true
    })
  },

  onCustomAccountInput(e) {
    const value = e.detail.value
    if (value !== undefined) {
      this.setData({ 
        customAccountName: value,
        account: value.trim() || '其他'
      })
    }
  },

  onCustomAccountBlur() {
    const { customAccountName } = this.data
    if (customAccountName && customAccountName.trim()) {
      this.saveCustomAccount(customAccountName.trim())
      this.setData({ 
        account: customAccountName.trim(),
        customAccountFocus: false
      })
    } else {
      this.setData({
        account: '其他',
        customAccountFocus: false
      })
    }
  },

  saveCustomAccount(accountName) {
    try {
      let accounts = []
      
      try {
        accounts = wx.getStorageSync('accounts') || []
      } catch (error) {
        console.error('读取账户失败:', error)
        accounts = []
      }

      if (!Array.isArray(accounts)) {
        accounts = []
      }

      const exists = accounts.some(acc => acc.name === accountName)
      
      if (!exists) {
        accounts.push({ name: accountName, icon: '📝' })
        
        try {
          wx.setStorageSync('accounts', accounts)
          this.setData({ accounts })
        } catch (error) {
          console.error('保存自定义账户失败:', error)
        }
      }
    } catch (error) {
      console.error('保存自定义账户失败:', error)
    }
  },

  onDateChange(e) {
    const value = e.detail.value
    if (value) {
      this.setData({ date: value })
    }
  },

  onNotesInput(e) {
    const value = e.detail.value
    if (value !== undefined) {
      this.setData({ notes: value })
    }
  },

  saveAsTemplate() {
    const { type, amount, category, account } = this.data

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: '请先输入有效金额', icon: 'none' })
      return
    }
    if (!category) {
      wx.showToast({ title: '请先选择分类', icon: 'none' })
      return
    }
    if (!account) {
      wx.showToast({ title: '请先选择账户', icon: 'none' })
      return
    }

    wx.showModal({
      title: '保存模板',
      content: '请输入模板名称',
      editable: true,
      placeholderText: '例如：午餐、打车等',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          try {
            var templates = []
            for (var t = 0; t < this.data.templates.length; t++) {
              templates.push(this.data.templates[t])
            }
            templates.push({
              id: Date.now(),
              name: res.content.trim(),
              type,
              amount: parseFloat(amount),
              category,
              account
            })
            
            wx.setStorageSync('templates', templates)
            this.loadTemplates()
            wx.showToast({ title: '模板已保存', icon: 'success' })
          } catch (error) {
            console.error('保存模板失败:', error)
            wx.showToast({ title: '保存模板失败', icon: 'none' })
          }
        }
      }
    })
  },

  useTemplate(e) {
    const id = parseInt(e.currentTarget.dataset.id)
    if (isNaN(id)) return

    const template = this.data.templates.find(t => t.id === id)
    
    if (template) {
      this.setData({
        type: template.type || 'expense',
        amount: template.amount != null ? String(template.amount) : '',
        category: template.category || '',
        account: template.account || ''
      })
      
      this.filterCategoriesByType(this.data.categories)
      wx.showToast({ title: '模板已应用', icon: 'success' })
    }
  },

  validateAmount() {
    const { amount } = this.data

    if (!amount || amount.trim() === '') {
      return { valid: false, message: '请输入金额' }
    }

    const numAmount = parseFloat(amount)

    if (isNaN(numAmount)) {
      return { valid: false, message: '金额格式不正确' }
    }

    if (numAmount <= 0) {
      return { valid: false, message: '金额必须大于0' }
    }

    if (numAmount > 999999.99) {
      return { valid: false, message: '金额不能超过999999.99' }
    }

    return { valid: true, value: numAmount }
  },

  saveBill() {
    const { type, category, account, date, notes, isEdit, editId } = this.data

    const amountValidation = this.validateAmount()
    if (!amountValidation.valid) {
      wx.showToast({ title: amountValidation.message, icon: 'none' })
      return
    }

    if (!category || category.trim() === '') {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    if (!date) {
      wx.showToast({ title: '日期无效', icon: 'none' })
      return
    }

    // 如果用户没有选择账户，默认设为"其他"
    const finalAccount = (!account || account.trim() === '') ? '其他' : account.trim()

    // 获取当前时间用于排序
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const bill = {
      id: editId || Date.now(),
      type: type || 'expense',
      amount: (typeof amountValidation.value === 'number' && !isNaN(amountValidation.value)) ? amountValidation.value : 0,
      category: (category && typeof category === 'string') ? category.trim() : '未分类',
      account: finalAccount,
      date: (date && typeof date === 'string') ? date : new Date().toISOString().split('T')[0],
      time: timeStr,
      notes: (notes && typeof notes === 'string') ? notes.trim() : '',
      updateTime: new Date().toISOString()
    }

    // 检测重复账单（只检测当前账本同一天的重复）
    const allBills = wx.getStorageSync('bills') || []
    const currentBookId = bookManager.getCurrentBookId()
    // 只检测当前账本的账单
    const billsForCheck = allBills.filter(b => b.bookId === currentBookId)
    // 编辑模式下排除自身
    const billsToCheck = isEdit && editId 
      ? billsForCheck.filter(b => b.id !== editId) 
      : billsForCheck
    const duplicateResult = billHelper.detectDuplicateBills(billsToCheck, bill, 2, isEdit ? editId : null)

    // 如果检测到重复，弹出确认框
    if (duplicateResult.isDuplicate) {
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
            this._doSaveBill(bill, finalAccount, type, amountValidation.value, isEdit, editId)
          }
        }
      })
      return
    }

    // 没有重复，直接保存
    this._doSaveBill(bill, finalAccount, type, amountValidation.value, isEdit, editId)
  },

  /**
   * 实际执行保存账单（内部方法）
   */
  _doSaveBill(bill, finalAccount, type, amount, isEdit, editId) {
    try {
      let bills = []
      
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        console.error('读取账单列表失败:', error)
        bills = []
      }

      if (!Array.isArray(bills)) {
        bills = []
      }

      // 确保所有账单都有 bookId
      bills.forEach(b => {
        if (!b.bookId) b.bookId = 'default'
      })

      // 获取当前账本ID
      const currentBookId = bookManager.getCurrentBookId()

      if (isEdit && editId) {
        // 编辑时需要找到当前账本的账单
        const index = bills.findIndex(b => b.id === editId && b.bookId === currentBookId)
        if (index !== -1) {
          var newBill = {}
          for (var key in bill) {
            if (bill.hasOwnProperty(key)) {
              newBill[key] = bill[key]
            }
          }
          newBill.bookId = currentBookId
          newBill.createTime = bills[index].createTime
          bills[index] = newBill
        } else {
          // 原账单已被删除，阻止保存，提示用户
          wx.showToast({ title: '该账单已被删除，无法更新', icon: 'none' })
          return
        }
      } else {
        bill.bookId = currentBookId
        bill.createTime = new Date().toISOString()
        bills.push(bill)
      }

      wx.setStorageSync('bills', bills)

      // 自动更新账户余额
      this._updateAccountBalanceAfterBillChange(finalAccount, type, amount, isEdit ? 'edit' : 'add', this.data.originalBill)

      try {
        const app = getApp()
        if (app && app.invalidateCache) {
          app.invalidateCache()
        }
      } catch (error) {
        console.error('缓存失效失败:', error)
      }

      wx.showToast({
        title: isEdit ? '更新成功' : '保存成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack({
          fail: () => {
            wx.switchTab({ url: '/pages/index/index' })
          }
        })
      }, 1500)

    } catch (error) {
      console.error('保存账单失败:', error)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  deleteBill() {
    if (!this.data.editId) {
      wx.showToast({ title: '无效的账单ID', icon: 'none' })
      return
    }

    // 获取要删除的账单信息（用于更新余额）
    const bills = wx.getStorageSync('bills') || []
    const currentBookId = bookManager.getCurrentBookId()
    const billToDelete = bills.find(b => b.id === this.data.editId && b.bookId === currentBookId)

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条账单吗？此操作不可恢复。',
      confirmColor: '#ff6b6b',
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

            // 只删除当前账本的账单
            const filteredBills = bills.filter(b => !(b.id === this.data.editId && b.bookId === currentBookId))
            
            wx.setStorageSync('bills', filteredBills)

            // 删除后自动更新账户余额
            if (billToDelete) {
              this._updateAccountBalanceAfterBillChange(
                billToDelete.account,
                billToDelete.type,
                billToDelete.amount,
                'delete',
                null
              )
            }

            try {
              const app = getApp()
              if (app && app.invalidateCache) {
                app.invalidateCache()
              }
            } catch (error) {
              console.error('缓存失效失败:', error)
            }

            wx.showToast({ title: '删除成功', icon: 'success' })

            setTimeout(() => {
              wx.navigateBack({
                fail: () => {
                  wx.switchTab({ url: '/pages/index/index' })
                }
              })
            }, 1500)

          } catch (error) {
            console.error('删除账单失败:', error)
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  },

  /**
   * 账单变更后自动更新账户余额
   * @param {string} accountName - 账户名称
   * @param {string} billType - 账单类型 expense/income
   * @param {number} amount - 金额
   * @param {string} action - 操作类型 add/edit/delete
   * @param {Object} oldBill - 编辑前的旧账单（仅编辑时需要）
   */
  _updateAccountBalanceAfterBillChange(accountName, billType, amount, action, oldBill) {
    try {
      const bills = wx.getStorageSync('bills') || []
      const accounts = wx.getStorageSync('accounts') || []
      
      // 计算指定账户的余额
      const newBalance = billHelper.calculateSingleAccountBalance(bills, accountName)
      
      // 更新账户余额
      const index = accounts.findIndex(acc => acc && acc.name === accountName)
      if (index !== -1) {
        accounts[index] = {
          ...accounts[index],
          balance: newBalance
        }
        wx.setStorageSync('accounts', accounts)
      }
      
      // 如果是编辑模式，且账户发生了变化，也需要更新原账户的余额
      if (action === 'edit' && oldBill && oldBill.account && oldBill.account !== accountName) {
        const oldAccountBalance = billHelper.calculateSingleAccountBalance(bills, oldBill.account)
        const oldIndex = accounts.findIndex(acc => acc && acc.name === oldBill.account)
        if (oldIndex !== -1) {
          // 重新读取账户列表（因为上面的更新可能改变了它）
          const currentAccounts = wx.getStorageSync('accounts') || []
          const idx = currentAccounts.findIndex(acc => acc && acc.name === oldBill.account)
          if (idx !== -1) {
            currentAccounts[idx] = {
              ...currentAccounts[idx],
              balance: oldAccountBalance
            }
            wx.setStorageSync('accounts', currentAccounts)
          }
        }
      }
    } catch (error) {
      console.error('更新账户余额失败:', error)
    }
  }
})