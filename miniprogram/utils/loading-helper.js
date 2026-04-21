/**
 * 全局 Loading 辅助工具
 * 统一管理页面 loading 状态，避免散落在各处
 * 
 * 使用方法：
 * 1. 在页面 js 中引入：const loadingHelper = require('../../utils/loading-helper')
 * 2. 显示 loading：loadingHelper.show(this, '保存中...')
 * 3. 隐藏 loading：loadingHelper.hide(this)
 * 4. 带回调隐藏：loadingHelper.hide(this, () => { ... })
 * 
 * 注意：需要确保页面 data 中有 _loading 字段
 */

// 显示 loading
function show(page, title = '加载中...') {
  if (!page) return
  
  page.setData({
    _loading: true,
    _loadingTitle: title
  })
}

// 隐藏 loading
function hide(page, callback) {
  if (!page) return
  
  page.setData({
    _loading: false
  }, () => {
    // 回调函数在 setData 完成后执行
    if (callback && typeof callback === 'function') {
      callback()
    }
  })
}

// 显示 loading 并执行异步操作，完成后自动隐藏
async function exec(page, title, asyncFunc) {
  show(page, title)
  try {
    const result = await asyncFunc()
    return result
  } finally {
    hide(page)
  }
}

// 带成功提示的 loading
async function execWithSuccess(page, title, asyncFunc, successTitle = '操作成功') {
  show(page, title)
  try {
    const result = await asyncFunc()
    wx.showToast({
      title: successTitle,
      icon: 'success',
      duration: 1500
    })
    return result
  } catch (error) {
    wx.showToast({
      title: error.message || '操作失败',
      icon: 'none',
      duration: 2000
    })
    throw error
  } finally {
    hide(page)
  }
}

// 带失败提示的 loading
async function execWithError(page, title, asyncFunc, errorTitle = '操作失败') {
  show(page, title)
  try {
    const result = await asyncFunc()
    return result
  } catch (error) {
    wx.showToast({
      title: errorTitle,
      icon: 'none',
      duration: 2000
    })
    throw error
  } finally {
    hide(page)
  }
}

// 导出
module.exports = {
  show,
  hide,
  exec,
  execWithSuccess,
  execWithError
}
