const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')
const billHelper = require('../../utils/bill-helper')
const bookManager = require('../../utils/book-manager')

Page({
  data: {
    accounts: [],
    totalAssets: 0,
    totalLiability: 0,
    netAssets: 0,
    summaryType: 'total',
    showSortMenu: false,
    sortType: 'name',
    sortLabel: '按名称',
    sortedAccounts: [],
    theme: themeManager.currentTheme,
    // 新增：余额自动计算相关
    balanceMode: 'auto',  // auto: 自动计算, manual: 手动
    showSyncTip: false,   // 是否显示同步提示
    lastSyncTime: '',       // 上次同步时间
    // 账本相关
    currentBook: { id: 'default', name: '日常账本', icon: '📒' }
  },

  onLoad() {
    console.log('资产页 onLoad 触发')
    bookManager.initBooks()
    this.loadCurrentBook()
    this.loadAccounts()
  },

  onShow() {
    console.log('资产页 onShow 触发')
    this.loadCurrentBook()
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.currentTheme })
    this.loadCurrentBook()
    this.loadAccounts()
  },

  // 加载当前账本信息
  loadCurrentBook() {
    const currentBook = bookManager.getCurrentBook()
    if (currentBook) {
      this.setData({ currentBook })
    }
  },

  // 账本切换后的回调
  onBookChanged() {
    console.log('资产页：账本已切换，刷新数据')
    this.loadCurrentBook()
    this.loadAccounts()
  },

  loadAccounts() {
    try {
      var accounts = []

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
        var defaultAccounts = config.defaultAccounts.map(function(acc) {
          return { name: acc.name, icon: acc.icon, balance: 0 }
        })

        try {
          wx.setStorageSync('accounts', defaultAccounts)
        } catch (error) {
          console.error('保存默认账户失败:', error)
        }

        accounts = defaultAccounts
      }

      // 根据账单自动计算所有账户余额（只计算当前账本的账单）
      const allBills = wx.getStorageSync('bills') || []
      const currentBookId = bookManager.getCurrentBookId()
      const bills = allBills.filter(b => b.bookId === currentBookId)
      const result = billHelper.calculateAccountBalances(bills, accounts)
      accounts = result.accounts

      this.calculateTotals(accounts)
      this.sortAccounts(accounts)

      // 更新余额计算模式显示
      this.setData({
        balanceMode: 'auto',
        showSyncTip: false
      })

    } catch (error) {
      console.error('加载账户失败:', error)
      this.setData({
        accounts: [],
        totalAssets: 0,
        totalLiability: 0,
        netAssets: 0,
        sortedAccounts: [],
        theme: themeManager.currentTheme
      })
    }
  },

  /**
   * 一键同步：根据账单重新计算所有账户余额
   */
  syncAllBalances() {
    wx.showLoading({ title: '同步中...' })
    
    try {
      const bills = wx.getStorageSync('bills') || []
      const accounts = wx.getStorageSync('accounts') || []
      
      // 重新计算所有账户余额
      const result = billHelper.calculateAccountBalances(bills, accounts)
      
      // 保存更新后的账户数据
      billHelper.updateAllAccountBalances(result.accounts)
      
      // 更新时间戳
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      wx.hideLoading()
      
      wx.showToast({
        title: '同步成功',
        icon: 'success',
        duration: 2000
      })
      
      // 重新加载账户数据
      this.setData({
        lastSyncTime: timeStr,
        showSyncTip: false
      })
      
      this.loadAccounts()
      
    } catch (error) {
      wx.hideLoading()
      console.error('同步账户余额失败:', error)
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })
    }
  },

  calculateTotals(accounts) {
    var validAccounts = accounts.map(function(account) {
      var newAccount = {}
      for (var key in account) {
        if (account.hasOwnProperty(key)) {
          newAccount[key] = account[key]
        }
      }
      newAccount.balance = (typeof account.balance === 'number' && !isNaN(account.balance)) ? account.balance : (account.balance != null ? parseFloat(account.balance) || 0 : 0)
      return newAccount
    }).filter(function(account) { return account && typeof account === 'object' })

    var totalAssets = 0
    var totalLiability = 0

    validAccounts.forEach(function(account) {
      if (account.balance >= 0) {
        totalAssets += account.balance
      } else {
        totalLiability += Math.abs(account.balance)
      }
    })

    var netAssets = totalAssets - totalLiability

    this.setData({
      accounts: validAccounts,
      totalAssets: parseFloat(totalAssets.toFixed(2)),
      totalLiability: parseFloat(totalLiability.toFixed(2)),
      netAssets: parseFloat(netAssets.toFixed(2)),
      theme: themeManager.currentTheme
    })
  },

  switchSummaryType(e) {
    var type = e.currentTarget.dataset.type
    if (type) {
      this.setData({ summaryType: type })
    }
  },

  toggleSortMenu() {
    this.setData({
      showSortMenu: !this.data.showSortMenu
    })
  },

  setSortType(e) {
    var type = e.currentTarget.dataset.type
    if (!type) return

    var labels = {
      'name': '按名称',
      'balance-desc': '余额降序',
      'balance-asc': '余额升序'
    }

    this.setData({
      sortType: type,
      sortLabel: labels[type] || '按名称',
      showSortMenu: false
    })

    this.sortAccounts(this.data.accounts)
  },

  sortAccounts(accounts) {
    var sorted = []
    for (var i = 0; i < accounts.length; i++) {
      sorted.push(accounts[i])
    }

    var sortType = this.data.sortType

    switch (sortType) {
      case 'balance-desc':
        sorted.sort(function(a, b) { return (b.balance || 0) - (a.balance || 0) })
        break
      case 'balance-asc':
        sorted.sort(function(a, b) { return (a.balance || 0) - (b.balance || 0) })
        break
      case 'name':
      default:
        sorted.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '') })
        break
    }

    this.setData({ sortedAccounts: sorted })
  },

  goToAddAccount() {
    wx.navigateTo({
      url: '/pages/account-edit/account-edit',
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  },

  editAccount(e) {
    var dataset = e.currentTarget.dataset
    var name = dataset.name || ''
    var icon = dataset.icon || '💰'
    var balance = dataset.balance != null ? String(dataset.balance) : '0'

    // 对名称进行编码，防止中文乱码
    var params = 'name=' + encodeURIComponent(name) + '&icon=' + encodeURIComponent(icon) + '&balance=' + encodeURIComponent(balance)

    wx.navigateTo({
      url: '/pages/account-edit/account-edit?' + params,
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  }
})