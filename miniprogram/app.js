const themeManager = require('./utils/theme-manager')
const config = require('./utils/config')
const themeConfig = require('./themes/theme-config')
const bookManager = require('./utils/book-manager')

App({
  onLaunch() {
    console.log('小程序启动')
    this.initTheme()
    this.initBooks()
    this.initCache()
    this.initCloud()

    // 检查今日到期的周期账单
    setTimeout(() => {
      this.checkDueRecurringBills()
    }, 1000)  // 延迟1秒执行，避免影响启动速度
  },

  // 初始化账本（迁移旧数据）
  initBooks() {
    // 初始化账本
    bookManager.initBooks()

    // 迁移旧账单数据（添加 bookId）
    try {
      const bills = wx.getStorageSync('bills') || []
      let needsUpdate = false

      bills.forEach(bill => {
        if (!bill.bookId) {
          bill.bookId = 'default'
          needsUpdate = true
        }
      })

      if (needsUpdate) {
        wx.setStorageSync('bills', bills)
        console.log('账单数据已迁移，添加 bookId')
      }
    } catch (error) {
      console.error('迁移账单数据失败:', error)
    }

    // 迁移旧分类数据
    try {
      const categories = wx.getStorageSync('categories') || []
      let needsUpdate = false

      categories.forEach(cat => {
        if (!cat.bookId) {
          cat.bookId = 'default'
          needsUpdate = true
        }
      })

      if (needsUpdate) {
        wx.setStorageSync('categories', categories)
        console.log('分类数据已迁移，添加 bookId')
      }
    } catch (error) {
      console.error('迁移分类数据失败:', error)
    }

    // 迁移旧账户数据
    try {
      const accounts = wx.getStorageSync('accounts') || []
      let needsUpdate = false

      accounts.forEach(acc => {
        if (!acc.bookId) {
          acc.bookId = 'default'
          needsUpdate = true
        }
      })

      if (needsUpdate) {
        wx.setStorageSync('accounts', accounts)
        console.log('账户数据已迁移，添加 bookId')
      }
    } catch (error) {
      console.error('迁移账户数据失败:', error)
    }
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-d1g8mjg3m02a6eba2',  // 使用语音记账的云环境
        traceUser: true
      })
    }
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
  },

  // 检查今日到期的周期账单并提醒
  checkDueRecurringBills() {
    try {
      const recurringBills = wx.getStorageSync('recurringBills') || []
      if (!Array.isArray(recurringBills) || recurringBills.length === 0) {
        return
      }

      // 获取今天的日期
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      // 找到今天到期的账单（且开启了提醒）
      const dueToday = recurringBills.filter(bill => {
        return bill.enabled &&
               bill.reminderEnabled &&
               bill.nextDue === todayStr
      })

      if (dueToday.length > 0) {
        // 格式化到期账单列表
        const names = dueToday.map(b => b.name).join('、')
        const amounts = dueToday.reduce((sum, b) => {
          const sign = b.type === 'expense' ? '-' : '+'
          return sum + `${sign}¥${b.amount} `
        }, '').trim()

        wx.showModal({
          title: '📅 周期账单提醒',
          content: `以下账单今日到期：\n${names}\n金额：${amounts}\n\n点击确定去记账`,
          confirmText: '去记账',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('检查到期账单失败', error)
    }
  }
})