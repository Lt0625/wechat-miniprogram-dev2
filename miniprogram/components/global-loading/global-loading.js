/**
 * 全局 Loading 组件
 * 提供美观的 loading 弹窗，支持自定义文字和图标动画
 */

Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 提示文字
    title: {
      type: String,
      value: '加载中...'
    },
    // 是否显示遮罩层
    mask: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 动画状态
    animating: false
  },

  lifetimes: {
    attached() {
      // 组件创建时，如果有自定义样式，从 storage 读取主题色
      try {
        const theme = wx.getStorageSync('appTheme') || 'warm'
        this.setData({ theme })
      } catch (e) {
        this.setData({ theme: 'warm' })
      }
    }
  },

  methods: {
    // 显示 loading
    showLoading(options = {}) {
      const { title = '加载中...', mask = true } = options
      this.setData({
        show: true,
        title,
        mask,
        animating: true
      })
    },

    // 隐藏 loading
    hideLoading() {
      this.setData({
        show: false,
        animating: false
      })
    }
  }
})
