const themeManager = require('../../utils/theme-manager')

Page({
  data: {
    nickname: '',
    avatarUrl: '/images/default-avatar.jpg',
    billCount: 0,
    version: '1.0.0',
    themes: [],
    currentTheme: 'warm',
    theme: themeManager.currentTheme
  },

  onLoad() {
    this.loadUserInfo()
    this.loadThemes()
    this.setData({ theme: themeManager.currentTheme })
  },

  onShow() {
    // 更新主题
    const theme = themeManager.getCurrentTheme()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.loadUserInfo()
    this.setData({ theme: themeManager.currentTheme })
  },

  loadThemes() {
    const themes = themeManager.getAllThemes()
    const currentTheme = themeManager.currentTheme
    
    this.setData({
      themes,
      currentTheme,
      theme: currentTheme
    })
  },

  selectTheme(e) {
    const themeKey = e.currentTarget.dataset.theme
    
    wx.showModal({
      title: '切换主题',
      content: `确定要切换到${themeManager.getAllThemes().find(t => t.key === themeKey).name}主题吗？`,
      success: (res) => {
        if (res.confirm) {
          const success = themeManager.setTheme(themeKey)
          
          if (success) {
            this.setData({
              currentTheme: themeKey,
              theme: themeKey
            })
            
            // 通知所有 tabBar 页面更新主题
            const pages = getCurrentPages()
            pages.forEach(page => {
              if (page && page.setData) {
                page.setData({ theme: themeKey })
              }
            })
            
            wx.showToast({
              title: '主题切换成功',
              icon: 'success'
            })
          }
        }
      }
    })
  },

  loadUserInfo() {
    try {
      let bills = []
      try {
        bills = wx.getStorageSync('bills') || []
      } catch (error) {
        console.error('读取账单失败:', error)
        bills = []
      }

      const billCount = Array.isArray(bills) ? bills.length : 0

      try {
        const localUserInfo = wx.getStorageSync('localUserInfo')
        if (localUserInfo && typeof localUserInfo === 'object') {
          this.setData({
            nickname: localUserInfo.nickname || '',
            avatarUrl: localUserInfo.avatarUrl || ''
          })
        }
      } catch (error) {
        console.error('读取本地用户信息失败:', error)
      }

      this.setData({ billCount })

    } catch (error) {
      console.error('加载用户信息失败:', error)
      this.setData({
        billCount: 0,
        nickname: '',
        avatarUrl: ''
      })
    }
  },

  editUserInfo() {
    wx.showActionSheet({
      itemList: ['修改头像', '修改昵称'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseAvatar()
        } else if (res.tapIndex === 1) {
          this.editNickname()
        }
      },
      fail: () => {
        console.log('取消操作')
      }
    })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        this.setData({ avatarUrl: tempFilePath })
        
        try {
          const localUserInfo = wx.getStorageSync('localUserInfo') || {}
          localUserInfo.avatarUrl = tempFilePath
          localUserInfo.nickname = this.data.nickname
          wx.setStorageSync('localUserInfo', localUserInfo)
          
          wx.showToast({
            title: '头像设置成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('保存头像失败:', error)
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        console.log('取消选择')
      }
    })
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入您的昵称',
      content: this.data.nickname || '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newNickname = res.content.trim()
          
          this.setData({ nickname: newNickname })
          
          try {
            const localUserInfo = wx.getStorageSync('localUserInfo') || {}
            localUserInfo.nickname = newNickname
            localUserInfo.avatarUrl = this.data.avatarUrl
            wx.setStorageSync('localUserInfo', localUserInfo)
            
            wx.showToast({
              title: '昵称修改成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('保存昵称失败:', error)
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        } else if (res.confirm) {
          wx.showToast({
            title: '昵称不能为空',
            icon: 'none'
          })
        }
      },
      fail: () => {
        console.log('取消编辑')
      }
    })
  },

  onAvatarError() {
    this.setData({ avatarUrl: '' })
  },

  goToCategoryManage() {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage',
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  },

  backupData() {
    wx.showModal({
      title: '数据备份',
      content: '确定要备份所有账单数据吗？',
      success: (res) => {
        if (res.confirm) {
          this.performBackup()
        }
      },
      fail: () => {
        wx.showToast({ title: '操作取消', icon: 'none' })
      }
    })
  },

  performBackup() {
    try {
      wx.showLoading({ title: '备份中...' })

      const backupData = {}
      
      try {
        const bills = wx.getStorageSync('bills') || []
        if (Array.isArray(bills)) {
          backupData.bills = bills
        }
      } catch (error) {
        console.error('备份账单失败:', error)
      }

      try {
        const categories = wx.getStorageSync('categories') || []
        if (Array.isArray(categories)) {
          backupData.categories = categories
        }
      } catch (error) {
        console.error('备份分类失败:', error)
      }

      try {
        const accounts = wx.getStorageSync('accounts') || []
        if (Array.isArray(accounts)) {
          backupData.accounts = accounts
        }
      } catch (error) {
        console.error('备份账户失败:', error)
      }

      backupData.backupTime = new Date().toISOString()

      try {
        wx.setStorageSync('backupData', backupData)
        
        wx.hideLoading()
        wx.showToast({
          title: '备份成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('保存备份数据失败:', error)
        wx.hideLoading()
        wx.showToast({
          title: '备份失败，存储空间不足',
          icon: 'none'
        })
      }

    } catch (error) {
      console.error('备份操作失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      })
    }
  },

  restoreData() {
    wx.showModal({
      title: '数据恢复',
      content: '确定要从备份恢复数据吗？当前数据将被覆盖。',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.performRestore()
        }
      },
      fail: () => {
        wx.showToast({ title: '操作取消', icon: 'none' })
      }
    })
  },

  performRestore() {
    try {
      let backupData = null
      
      try {
        backupData = wx.getStorageSync('backupData')
      } catch (error) {
        console.error('读取备份数据失败:', error)
        wx.showToast({ title: '未找到备份数据', icon: 'none' })
        return
      }

      if (!backupData || typeof backupData !== 'object') {
        wx.showToast({ title: '未找到备份数据', icon: 'none' })
        return
      }

      wx.showLoading({ title: '恢复中...' })

      let restoredCount = 0

      if (backupData.bills && Array.isArray(backupData.bills)) {
        try {
          wx.setStorageSync('bills', backupData.bills)
          restoredCount += backupData.bills.length
        } catch (error) {
          console.error('恢复账单失败:', error)
        }
      }

      if (backupData.categories && Array.isArray(backupData.categories)) {
        try {
          wx.setStorageSync('categories', backupData.categories)
        } catch (error) {
          console.error('恢复分类失败:', error)
        }
      }

      if (backupData.accounts && Array.isArray(backupData.accounts)) {
        try {
          wx.setStorageSync('accounts', backupData.accounts)
        } catch (error) {
          console.error('恢复账户失败:', error)
        }
      }

      wx.hideLoading()
      
      try {
        const app = getApp()
        if (app && app.invalidateCache) {
          app.invalidateCache()
        }
      } catch (error) {
        console.error('缓存失效失败:', error)
      }
      
      if (restoredCount > 0) {
        wx.showToast({
          title: `恢复成功，共${restoredCount}条记录`,
          icon: 'success'
        })
        this.loadUserInfo()
      } else {
        wx.showToast({
          title: '恢复完成，但无有效数据',
          icon: 'none'
        })
      }

    } catch (error) {
      console.error('恢复操作失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  clearData() {
    wx.showModal({
      title: '清空数据',
      content: '确定要清空所有账单数据吗？此操作不可撤销！',
      confirmText: '确认删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.performClear()
        }
      },
      fail: () => {
        wx.showToast({ title: '操作取消', icon: 'none' })
      }
    })
  },

  performClear() {
    try {
      wx.showLoading({ title: '清除中...' })

      try {
        wx.removeStorageSync('bills')
      } catch (error) {
        console.error('清除账单失败:', error)
      }

      try {
        wx.removeStorageSync('backupData')
      } catch (error) {
        console.error('清除备份失败:', error)
      }

      wx.hideLoading()
      
      try {
        const app = getApp()
        if (app && app.invalidateCache) {
          app.invalidateCache()
        }
      } catch (error) {
        console.error('缓存失效失败:', error)
      }
      
      this.setData({ billCount: 0 })
      
      wx.showToast({
        title: '已清空所有数据',
        icon: 'success'
      })

    } catch (error) {
      console.error('清除操作失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '清除失败',
        icon: 'none'
      })
    }
  },

  showAbout() {
    wx.showModal({
      title: '关于记账本',
      content: '版本：1.0.0\n\n一款简单易用的微信小程序记账工具，帮助您轻松管理日常收支。\n\n功能特点：\n• 快速记账\n• 分类统计\n• 数据可视化\n• 数据备份与恢复',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})