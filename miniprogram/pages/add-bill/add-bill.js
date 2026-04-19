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
    customAccountFocus: false
  },

  onLoad(options) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    this.setData({
      date: `${year}-${month}-${day}`
    })

    if (options && options.id) {
      this.setData({ 
        isEdit: true, 
        editId: parseInt(options.id) 
      })
      this.loadBillData(options.id)
    }

    this.loadCategories()
    this.loadAccounts()
    this.loadTemplates()

    if (options && options.date) {
      this.setData({ date: options.date })
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
        categories = [
          { name: '餐饮', type: 'expense', icon: '🍔' },
          { name: '交通', type: 'expense', icon: '🚗' },
          { name: '购物', type: 'expense', icon: '🛍️' },
          { name: '娱乐', type: 'expense', icon: '🎮' },
          { name: '医疗', type: 'expense', icon: '💊' },
          { name: '教育', type: 'expense', icon: '📚' },
          { name: '住房', type: 'expense', icon: '🏠' },
          { name: '其他', type: 'expense', icon: '📦' },
          { name: '工资', type: 'income', icon: '💰' },
          { name: '奖金', type: 'income', icon: '🎁' },
          { name: '投资', type: 'income', icon: '📈' }
        ]
        
        try {
          wx.setStorageSync('categories', categories)
        } catch (error) {
          console.error('保存默认分类失败:', error)
        }
      } else {
        const iconMap = {
          '餐饮': '🍔',
          '交通': '🚗',
          '购物': '🛍️',
          '娱乐': '🎮',
          '医疗': '💊',
          '教育': '📚',
          '住房': '🏠',
          '其他': '📦',
          '工资': '💰',
          '奖金': '🎁',
          '投资': '📈'
        }
        
        categories = categories.map(function(cat) {
          var newCat = {}
          for (var key in cat) {
            if (cat.hasOwnProperty(key)) {
              newCat[key] = cat[key]
            }
          }
          newCat.icon = cat.icon || iconMap[cat.name] || '📦'
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
        const defaultAccounts = [
          { name: '现金', icon: '💵' },
          { name: '支付宝', icon: '💳' },
          { name: '微信', icon: '📱' },
          { name: '银行卡', icon: '🏦' }
        ]
        
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

      const filtered = categories.filter(cat => cat.type === this.data.type || !cat.type)
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
          notes: bill.notes || ''
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

    if (!account || account.trim() === '') {
      wx.showToast({ title: '请选择账户', icon: 'none' })
      return
    }

    if (!date) {
      wx.showToast({ title: '日期无效', icon: 'none' })
      return
    }

    const bill = {
      id: editId || Date.now(),
      type: type || 'expense',
      amount: (typeof amountValidation.value === 'number' && !isNaN(amountValidation.value)) ? amountValidation.value : 0,
      category: (category && typeof category === 'string') ? category.trim() : '未分类',
      account: (account && typeof account === 'string') ? account.trim() : '未知账户',
      date: (date && typeof date === 'string') ? date : new Date().toISOString().split('T')[0],
      notes: (notes && typeof notes === 'string') ? notes.trim() : '',
      updateTime: new Date().toISOString()
    }

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

      if (isEdit && editId) {
        const index = bills.findIndex(b => b.id === editId)
        if (index !== -1) {
          var newBill = {}
          for (var key in bill) {
            if (bill.hasOwnProperty(key)) {
              newBill[key] = bill[key]
            }
          }
          newBill.createTime = bills[index].createTime
          bills[index] = newBill
        } else {
          wx.showToast({ title: '未找到原账单，将创建新记录', icon: 'none' })
          bill.createTime = new Date().toISOString()
          bills.push(bill)
        }
      } else {
        bill.createTime = new Date().toISOString()
        bills.push(bill)
      }

      wx.setStorageSync('bills', bills)

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

            const filteredBills = bills.filter(b => b.id !== this.data.editId)
            
            wx.setStorageSync('bills', filteredBills)

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
  }
})