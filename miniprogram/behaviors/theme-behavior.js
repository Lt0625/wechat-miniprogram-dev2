/**
 * 主题 Behavior
 * 统一处理所有页面的主题切换、导航栏颜色、TabBar样式
 * 
 * 使用方法：
 * 1. 在页面 JS 中引入：
 *    const themeBehavior = require('../../behaviors/theme-behavior')
 * 
 * 2. 在 Page 中使用：
 *    Page({
 *      behaviors: [themeBehavior],
 *      // ... 其他代码
 *    })
 * 
 * 3. 确保页面的 WXML 根元素有 data-theme 属性：
 *    <view class="container" data-theme="{{theme}}">
 */

const themeManager = require('../utils/theme-manager')

module.exports = Behavior({
  // Behavior 内部数据
  data: {
    // 主题 key，用于 CSS 选择器匹配
    theme: 'warm',
    // 主题配置对象，包含 primary 等颜色值
    themeConfig: null
  },

  // 生命周期
  attached() {
    this.initTheme()
  },

  pageLifetimes: {
    // 页面显示时更新主题
    show() {
      this.updateTheme()
    }
  },

  methods: {
    /**
     * 初始化主题
     * 在 attached 生命周期调用，设置初始主题
     */
    initTheme() {
      const currentTheme = themeManager.getCurrentTheme()
      const themeObj = themeManager.getThemeObject()
      
      this.setData({
        theme: currentTheme,
        themeConfig: themeObj
      })
      
      // 设置导航栏颜色
      this.applyNavigationBarTheme()
      
      // 设置 TabBar 样式（仅首次生效）
      this.applyTabBarTheme()
    },

    /**
     * 更新主题
     * 在页面 show、主题切换后调用
     */
    updateTheme() {
      const currentTheme = themeManager.getCurrentTheme()
      const themeObj = themeManager.getThemeObject()
      
      // 只在主题变化时更新
      if (this.data.theme !== currentTheme) {
        this.setData({
          theme: currentTheme,
          themeConfig: themeObj
        })
        
        // 更新导航栏颜色
        this.applyNavigationBarTheme()
      }
    },

    /**
     * 应用导航栏主题色
     */
    applyNavigationBarTheme() {
      const themeObj = themeManager.getThemeObject()
      if (!themeObj) return
      
      try {
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: themeObj.primary,
          fail: (err) => {
            console.error('设置导航栏颜色失败:', err)
          }
        })
      } catch (e) {
        console.error('applyNavigationBarTheme 错误:', e)
      }
    },

    /**
     * 应用 TabBar 主题色
     * 注意：TabBar 样式全局只需要设置一次
     */
    applyTabBarTheme() {
      const themeObj = themeManager.getThemeObject()
      if (!themeObj) return
      
      // 使用全局标记避免重复设置
      if (this._tabBarStyleApplied) return
      
      try {
        wx.setTabBarStyle({
          color: '#999999',
          selectedColor: themeObj.primary,
          backgroundColor: '#ffffff',
          borderStyle: 'black',
          fail: (err) => {
            console.error('设置TabBar样式失败:', err)
          }
        })
        this._tabBarStyleApplied = true
      } catch (e) {
        console.error('applyTabBarTheme 错误:', e)
      }
    },

    /**
     * 获取当前主题配置
     * 供页面直接调用
     */
    getThemeConfig() {
      return themeManager.getThemeObject()
    },

    /**
     * 获取当前主题 key
     * 供页面直接调用
     */
    getThemeKey() {
      return themeManager.getCurrentTheme()
    }
  }
})
