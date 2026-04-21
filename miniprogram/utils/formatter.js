/**
 * 格式化工具模块
 * 提供金额、日期、百分比等常用格式化功能
 */

/**
 * 格式化金额
 * @param {number|string} amount - 金额
 * @param {boolean} showSign - 是否显示 ¥ 符号
 * @param {number} decimals - 小数位数，默认2位
 * @returns {string} 格式化后的金额字符串
 */
function formatMoney(amount, showSign = true, decimals = 2) {
  const num = parseFloat(amount) || 0
  const fixed = num.toFixed(decimals)
  return showSign ? `¥${fixed}` : fixed
}

/**
 * 格式化金额（纯数字，不带符号）
 * @param {number|string} amount - 金额
 * @param {number} decimals - 小数位数，默认2位
 * @returns {string} 格式化后的金额字符串
 */
function formatMoneyNum(amount, decimals = 2) {
  const num = parseFloat(amount) || 0
  return num.toFixed(decimals)
}

/**
 * 安全转换为两位小数
 * @param {number} num - 数字
 * @returns {number} 保留两位小数
 */
function toFixed2(num) {
  return parseFloat((num || 0).toFixed(2))
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为自定义格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {string} format - 格式类型：'YYYY-MM-DD' | 'MM-DD' | 'MM/DD' | 'MM月DD日'
 * @returns {string} 格式化后的日期字符串
 */
function formatDateCustom(date, format = 'YYYY-MM-DD') {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  
  switch (format) {
    case 'MM-DD':
      return `${monthStr}-${dayStr}`
    case 'MM/DD':
      return `${monthStr}/${dayStr}`
    case 'MM月DD日':
      return `${month}月${day}日`
    case 'YYYY/MM/DD':
      return `${year}/${monthStr}/${dayStr}`
    case 'YYYY-MM-DD':
    default:
      return `${year}-${monthStr}-${dayStr}`
  }
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD 格式
 */
function getTodayStr() {
  return formatDate(new Date())
}

/**
 * 获取当前时间字符串 (HH:mm)
 * @returns {string} 时间字符串
 */
function getTimeStr() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 获取星期几
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {boolean} short - 是否简短格式（周一 vs 星期一）
 * @returns {string} 星期几
 */
function getWeekday(date, short = true) {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const weekdays = short 
    ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  
  return weekdays[d.getDay()]
}

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数，默认1位
 * @returns {string} 百分比字符串
 */
function formatPercent(value, decimals = 1) {
  const num = parseFloat(value) || 0
  return `${num.toFixed(decimals)}%`
}

/**
 * 计算百分比
 * @param {number} part - 部分值
 * @param {number} total - 总值
 * @param {number} decimals - 小数位数，默认1位
 * @returns {string} 百分比字符串
 */
function calcPercent(part, total, decimals = 1) {
  if (!total) return '0.0%'
  const percent = (Math.abs(part) / Math.abs(total)) * 100
  return `${percent.toFixed(decimals)}%`
}

/**
 * 数字补零
 * @param {number} num - 数字
 * @param {number} length - 总长度
 * @returns {string} 补零后的字符串
 */
function padZero(num, length = 2) {
  return String(num).padStart(length, '0')
}

/**
 * 获取指定时间段的范围
 * @param {string} period - 时间段：'week' | 'month' | 'quarter' | 'year'
 * @returns {Object} { startDate: Date, endDate: Date, startStr: string, endStr: string }
 */
function getPeriodRange(period) {
  const now = new Date()
  const todayStr = formatDate(now)
  
  let startDate = new Date()
  let endDate = new Date()
  
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 6)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return null
  }
  
  return {
    startDate,
    endDate,
    startStr: formatDate(startDate),
    endStr: todayStr
  }
}

/**
 * 获取上个月的范围
 * @returns {Object} { startDate: Date, endDate: Date, startStr: string, endStr: string }
 */
function getLastMonthRange() {
  const now = new Date()
  const currentMonth = now.getMonth()
  
  // 上个月最后一天
  const lastMonthEnd = new Date(now.getFullYear(), currentMonth, 0)
  // 上个月第一天
  const lastMonthStart = new Date(now.getFullYear(), currentMonth - 1, 1)
  
  return {
    startDate: lastMonthStart,
    endDate: lastMonthEnd,
    startStr: formatDate(lastMonthStart),
    endStr: formatDate(lastMonthEnd)
  }
}

/**
 * 数字金额中文大写
 * @param {number} amount - 金额
 * @returns {string} 中文大写金额
 */
function toChineseMoney(amount) {
  const num = parseFloat(amount) || 0
  if (num === 0) return '零元整'
  
  const fraction = ['角', '分']
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']]
  
  let s = ''
  let k = 0
  let isNegative = num < 0
  const absNum = Math.abs(num)
  
  for (let i = 0; i < fraction.length && Math.abs(num) * Math.pow(10, fraction.length - i) >= 1; i++) {
    const t = Math.floor(absNum * Math.pow(10, i + 1)) % 10
    if (t !== 0) {
      s = digit[t] + fraction[i] + s
    }
  }
  
  s = s || '整'
  
  if (Math.floor(absNum) > 0) {
    k = 0
    for (let i = 0; i < unit[0].length && Math.floor(absNum) > 0; i++) {
      let p = ''
      for (let j = 0; j < unit[1].length && Math.floor(absNum) > 0; j++) {
        p = digit[Math.floor(absNum) % 10] + unit[1][j] + p
        absNum = Math.floor(absNum / 10)
      }
      s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s
      k++
    }
  }
  
  return (isNegative ? '负' : '') + s.replace(/零+/g, '零').replace(/零整$/, '整')
}

module.exports = {
  formatMoney,
  formatMoneyNum,
  toFixed2,
  formatDate,
  formatDateCustom,
  getTodayStr,
  getTimeStr,
  getWeekday,
  formatPercent,
  calcPercent,
  padZero,
  getPeriodRange,
  getLastMonthRange,
  toChineseMoney
}
