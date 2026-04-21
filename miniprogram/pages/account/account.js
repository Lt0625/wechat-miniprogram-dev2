const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')

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
    theme: themeManager.currentTheme
  },

  onLoad() {
    console.log('资产页 onLoad 触发')
    this.loadAccounts()
  },

  onShow() {
    console.log('资产页 onShow 触发')
    // 更新主题
    const theme = themeManager.getCurrentTheme()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.currentTheme })
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

      this.calculateTotals(accounts)
      this.sortAccounts(accounts)

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

    var params = 'name=' + encodeURIComponent(name) + '&icon=' + encodeURIComponent(icon) + '&balance=' + encodeURIComponent(balance)

    wx.navigateTo({
      url: '/pages/account-edit/account-edit?' + params,
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  }
})