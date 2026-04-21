const themeManager = require('../../utils/theme-manager')
const billHelper = require('../../utils/bill-helper')

// 安全解码函数，防止乱码
function safeDecode(str) {
  if (!str || typeof str !== 'string') return ''
  try {
    // 如果字符串包含 % 并且不是合法的 URI 编码形式，则返回原字符串
    if (str.includes('%') && !/^%[0-9A-F]{2}/i.test(str)) {
      return str
    }
    return decodeURIComponent(str)
  } catch (e) {
    // 解码失败时返回原字符串
    return str
  }
}

Page({
  data: {
    isEdit: false,
    accountName: '',
    selectedIcon: '💰',
    initialBalance: '0',
    availableIcons: [
      { icon: '💰' },
      { icon: '💳' },
      { icon: '🏦' },
      { icon: '📱' },
      { icon: '💵' },
      { icon: '🪙' },
      { icon: '💎' },
      { icon: '🎁' },
      { icon: '📊' },
      { icon: '🔒' }
    ],
    originalName: '',
    theme: themeManager.currentTheme
  },

  onLoad(options) {
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }

    if (options && options.name) {
      // 使用安全解码，防止乱码
      const name = safeDecode(options.name)
      
      // 编辑模式：从账单自动计算余额
      const bills = wx.getStorageSync('bills') || []
      const calculatedBalance = billHelper.calculateSingleAccountBalance(bills, name)
      
      this.setData({
        isEdit: true,
        accountName: name,
        originalName: name,
        selectedIcon: options.icon || '💰',
        initialBalance: calculatedBalance.toFixed(2),  // 使用计算的余额
        theme: themeManager.currentTheme,
        calculatedBalance: calculatedBalance.toFixed(2)  // 保存计算值用于重置
      })
      wx.setNavigationBarTitle({ title: '编辑账户' })
    } else {
      this.setData({ 
        theme: themeManager.currentTheme,
        initialBalance: '0'
      })
      wx.setNavigationBarTitle({ title: '添加账户' })
    }
  },

  onShow() {
    // 响应主题切换
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.getCurrentTheme() })
  },

  onAccountNameInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ accountName: e.detail.value })
    }
  },

  onBalanceInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      let value = e.detail.value
      value = value.replace(/[^\d.-]/g, '')
      const match = value.match(/^-?\d*\.?\d{0,2}$/)
      if (match) {
        this.setData({ initialBalance: value })
      }
    }
  },

  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    if (icon) {
      this.setData({ selectedIcon: icon })
    }
  },

  /**
   * 重置余额为根据账单计算的值
   */
  resetBalanceToCalculated() {
    const { originalName } = this.data
    
    wx.showLoading({ title: '计算中...' })
    
    try {
      const bills = wx.getStorageSync('bills') || []
      const calculatedBalance = billHelper.calculateSingleAccountBalance(bills, originalName)
      
      this.setData({
        initialBalance: calculatedBalance.toFixed(2)
      })
      
      wx.hideLoading()
      
      wx.showToast({
        title: '已重置',
        icon: 'success',
        duration: 1500
      })
      
      // 同时更新存储中的余额
      billHelper.updateAccountBalance(originalName, calculatedBalance)
      
    } catch (error) {
      wx.hideLoading()
      console.error('重置余额失败:', error)
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      })
    }
  },

  saveAccount() {
    try {
      const { accountName, selectedIcon, initialBalance, isEdit, originalName } = this.data

      if (!accountName || accountName.trim() === '') {
        wx.showToast({ title: '请输入账户名称', icon: 'none' })
        return
      }

      const name = accountName.trim()

      if (name.length > 20) {
        wx.showToast({ title: '账户名称过长', icon: 'none' })
        return
      }

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

      if (isEdit) {
        const index = accounts.findIndex(acc => acc.name === originalName)
        if (index !== -1) {
          var balance = parseFloat(initialBalance) || 0
          var newAccount = {}
          for (var key in accounts[index]) {
            if (accounts[index].hasOwnProperty(key)) {
              newAccount[key] = accounts[index][key]
            }
          }
          newAccount.name = name
          newAccount.icon = selectedIcon
          newAccount.balance = balance
          accounts[index] = newAccount
        } else {
          wx.showToast({ title: '未找到原账户', icon: 'none' })
          return
        }
      } else {
        const isDuplicate = accounts.some(acc =>
          acc.name && acc.name.toLowerCase() === name.toLowerCase()
        )

        if (isDuplicate) {
          wx.showToast({ title: '账户名称已存在', icon: 'none' })
          return
        }

        const balance = parseFloat(initialBalance) || 0
        accounts.push({
          name,
          icon: selectedIcon,
          balance
        })
      }

      try {
        wx.setStorageSync('accounts', accounts)
      } catch (error) {
        console.error('保存账户失败:', error)
        wx.showToast({ title: '保存失败', icon: 'none' })
        return
      }

      wx.showToast({
        title: isEdit ? '更新成功' : '添加成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('保存账户失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  deleteAccount() {
    wx.showModal({
      title: '删除账户',
      content: '确定要删除该账户吗？此操作不可撤销。',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.performDelete()
        }
      }
    })
  },

  performDelete() {
    try {
      const { originalName } = this.data

      let accounts = []
      try {
        accounts = wx.getStorageSync('accounts') || []
      } catch (error) {
        console.error('读取账户失败:', error)
        wx.showToast({ title: '删除失败', icon: 'none' })
        return
      }

      if (!Array.isArray(accounts)) {
        accounts = []
      }

      const filteredAccounts = accounts.filter(acc => acc.name !== originalName)

      if (filteredAccounts.length === accounts.length) {
        wx.showToast({ title: '未找到该账户', icon: 'none' })
        return
      }

      try {
        wx.setStorageSync('accounts', filteredAccounts)
      } catch (error) {
        console.error('保存账户失败:', error)
        wx.showToast({ title: '删除失败', icon: 'none' })
        return
      }

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('删除账户失败:', error)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})