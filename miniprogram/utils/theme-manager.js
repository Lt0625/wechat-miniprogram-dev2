const themeConfig = require('../themes/theme-config')

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || themeConfig.defaultTheme
  }

  getStoredTheme() {
    try {
      return wx.getStorageSync('selectedTheme')
    } catch (e) {
      return null
    }
  }

  setTheme(themeKey) {
    if (!themeConfig.themes[themeKey]) {
      console.error('主题不存在:', themeKey)
      return false
    }
    
    this.currentTheme = themeKey
    wx.setStorageSync('selectedTheme', themeKey)
    
    this.applyTheme(themeKey)
    return true
  }

  getCurrentTheme() {
    return themeConfig.themes[this.currentTheme]
  }

  applyTheme(themeKey) {
    const theme = themeConfig.themes[themeKey]
    
    // 更新所有已加载页面的 data
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (page && page.setData) {
        page.setData({ theme: themeKey })
      }
    })
    
    // 设置导航栏颜色（只设置一次，以最后一次为准）
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.primary,
      fail: (err) => console.error('设置导航栏颜色失败:', err)
    })
    
    // 设置 tabBar 样式（全局只需要设置一次）
    wx.setTabBarStyle({
      color: '#999999',
      selectedColor: theme.primary,
      backgroundColor: '#ffffff',
      borderStyle: 'black',
      fail: (err) => console.error('设置tabBar失败:', err)
    })
  }

  getAllThemes() {
    return Object.keys(themeConfig.themes).map(key => ({
      key,
      ...themeConfig.themes[key]
    }))
  }
}

module.exports = new ThemeManager()
