/**
 * 骨架屏组件
 * 页面加载时显示占位效果，提升用户体验
 */

Component({
  properties: {
    // 骨架屏类型
    type: {
      type: String,
      value: 'list' // list | card | detail | form
    },
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 行数（用于 list 类型）
    rows: {
      type: Number,
      value: 5
    },
    // 是否显示头部（用于 list 类型）
    showHeader: {
      type: Boolean,
      value: true
    }
  },

  data: {},

  lifetimes: {
    attached() {
      // 从 storage 读取主题色
      try {
        const theme = wx.getStorageSync('appTheme') || 'warm'
        this.setData({ theme })
      } catch (e) {
        this.setData({ theme: 'warm' })
      }
    }
  }
})
