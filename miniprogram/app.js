App({
  onLaunch() {
    console.log('小程序启动')
    this.initCache()
  },

  globalData: {
    userInfo: null,
    cache: {
      bills: null,
      categories: null,
      accounts: null,
      budgetSetting: null,
      lastUpdateTime: 0
    },
    CACHE_DURATION: 5000
  },

  initCache() {
    try {
      const bills = wx.getStorageSync('bills') || []
      const categories = wx.getStorageSync('categories') || []
      const accounts = wx.getStorageSync('accounts') || []
      const budgetSetting = wx.getStorageSync('budgetSetting') || {}

      this.globalData.cache = {
        bills: Array.isArray(bills) ? bills : [],
        categories: Array.isArray(categories) ? categories : [],
        accounts: Array.isArray(accounts) ? accounts : [],
        budgetSetting: budgetSetting,
        lastUpdateTime: Date.now()
      }
    } catch (error) {
      console.error('初始化缓存失败:', error)
    }
  },

  getBillsFromCache(forceRefresh = false) {
    if (forceRefresh || !this.isCacheValid()) {
      this.refreshBillsCache()
    }
    return this.globalData.cache.bills || []
  },

  refreshBillsCache() {
    try {
      let bills = wx.getStorageSync('bills') || []
      
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
        newBill.amount = (typeof bill.amount === 'number' && !isNaN(bill.amount)) ?
          bill.amount : (bill.amount != null ? parseFloat(bill.amount) || 0 : 0)
        return newBill
      })

      this.globalData.cache.bills = bills
      this.globalData.cache.lastUpdateTime = Date.now()
      
      return bills
    } catch (error) {
      console.error('刷新账单缓存失败:', error)
      return this.globalData.cache.bills || []
    }
  },

  getCategoriesFromCache(forceRefresh = false) {
    if (forceRefresh || !this.isCacheValid()) {
      this.refreshCategoriesCache()
    }
    return this.globalData.cache.categories || []
  },

  refreshCategoriesCache() {
    try {
      let categories = wx.getStorageSync('categories') || []
      
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
      
      if (!Array.isArray(categories) || categories.length === 0) {
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

      this.globalData.cache.categories = categories
      this.globalData.cache.lastUpdateTime = Date.now()
      
      return categories
    } catch (error) {
      console.error('刷新分类缓存失败:', error)
      return this.globalData.cache.categories || []
    }
  },

  isCacheValid() {
    return (Date.now() - this.globalData.cache.lastUpdateTime) < this.globalData.CACHE_DURATION
  },

  invalidateCache() {
    this.globalData.cache.lastUpdateTime = 0
  }
})