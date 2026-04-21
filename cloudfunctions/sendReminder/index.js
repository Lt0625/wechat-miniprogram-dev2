// 云函数：sendReminder
// 功能：发送周期账单调起订阅消息
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 发送周期账单到期提醒
 * @param {Object} data - 包含 recurringId 和 openid
 */
exports.main = async (event, context) => {
  const { recurringId, openid } = event

  if (!recurringId || !openid) {
    return {
      success: false,
      error: '缺少必要参数'
    }
  }

  try {
    // 获取周期账单信息
    const recurringList = wx.getStorageSync('recurringList') || []
    const recurring = recurringList.find(item => item.recurringId === recurringId)

    if (!recurring) {
      return {
        success: false,
        error: '未找到周期账单'
      }
    }

    // 构建订阅消息内容
    const amountStr = recurring.amount
    const typeText = recurring.type === 'expense' ? '支出' : '收入'
    const sign = recurring.type === 'expense' ? '-' : '+'

    // 调用微信订阅消息 API
    // 模板字段：账单金额(amount10)、记账时间(date12)、账本名称(thing24)
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: '/pages/add-bill/add-bill',  // 点击消息跳转到添加账单页面
      data: {
        amount10: {
          value: `${sign}¥${amountStr}`  // 账单金额
        },
        date12: {
          value: recurring.nextDue  // 记账时间（到期日期）
        },
        thing24: {
          value: `${recurring.name} ${typeText}`  // 账本名称
        }
      },
      // 微信订阅消息模板 ID - 账单通知
      templateId: '0dPTUcgkI9JVdgT6ebiRMMW5sZqUoqH_411Bkb66FlQ'
    })

    return {
      success: true,
      result
    }
  } catch (err) {
    console.error('发送订阅消息失败', err)
    return {
      success: false,
      error: err.message || '发送失败'
    }
  }
}
