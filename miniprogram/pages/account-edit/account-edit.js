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
    originalName: ''
  },

  onLoad(options) {
    if (options && options.name) {
      const name = decodeURIComponent(options.name)
      this.setData({
        isEdit: true,
        accountName: name,
        originalName: name,
        selectedIcon: options.icon || '💰',
        initialBalance: options.balance || '0'
      })
      wx.setNavigationBarTitle({ title: '编辑账户' })
    } else {
      wx.setNavigationBarTitle({ title: '添加账户' })
    }
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