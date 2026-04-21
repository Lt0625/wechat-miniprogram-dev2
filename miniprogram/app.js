const themeManager = require('./utils/theme-manager')
const config = require('./utils/config')
const themeConfig = require('./themes/theme-config')

App({
  onLaunch() {
    console.log('小程序启动')
    this.initTheme()
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
    CACHE_DURATION: 60000,  // 缓存有效期 1 分钟（原 5 秒太短）
    currentTheme: 'warm'
  },

  initTheme() {
    const themeKey = themeManager.getStoredTheme() || themeConfig.defaultTheme
    themeManager.applyTheme(themeKey)
    this.globalData.currentTheme = themeKey
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
      
      if (!Array.isArray(categories) || categories.length === 0) {
        // 使用 config.js 中的默认分类（带图标）
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
        // 补充缺失的 icon 字段
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