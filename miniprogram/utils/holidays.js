/**
 * 中国传统节日数据
 * 基于 2026 年的节日日期计算
 */

module.exports = {
  /**
   * 获取指定年份的所有节日
   * @param {number} year - 年份
   * @returns {Object} 节日映射 { 'YYYY-MM-DD': '节日名称' }
   */
  getHolidays(year) {
    const holidays = {}

    // ============ 公历节日 ============
    // 元旦
    holidays[`${year}-01-01`] = '元旦'

    // 春节 (农历正月初一，2026年是2月17日)
    if (year === 2026) holidays['2026-02-17'] = '春节'
    if (year === 2027) holidays['2027-02-06'] = '春节'
    if (year === 2025) holidays['2025-01-29'] = '春节'
    if (year === 2028) holidays['2028-01-26'] = '春节'

    // 元宵节 (农历正月十五)
    if (year === 2026) holidays['2026-03-03'] = '元宵节'
    if (year === 2027) holidays['2027-02-20'] = '元宵节'
    if (year === 2025) holidays['2025-02-12'] = '元宵节'

    // 清明节 (4月4日或5日)
    holidays[`${year}-04-04`] = '清明'
    holidays[`${year}-04-05`] = '清明'

    // 劳动节
    holidays[`${year}-05-01`] = '劳动节'

    // 青年节 (5月4日)
    holidays[`${year}-05-04`] = '青年节'

    // 儿童节 (6月1日)
    holidays[`${year}-06-01`] = '儿童节'

    // 端午节 (农历五月初五)
    if (year === 2026) holidays['2026-05-31'] = '端午节'
    if (year === 2027) holidays['2027-05-20'] = '端午节'
    if (year === 2025) holidays['2025-05-31'] = '端午节'

    // 中秋节 (农历八月十五)
    if (year === 2026) holidays['2026-10-04'] = '中秋节'
    if (year === 2027) holidays['2027-09-24'] = '中秋节'
    if (year === 2025) holidays['2025-10-06'] = '中秋节'

    // 国庆节
    holidays[`${year}-10-01`] = '国庆节'

    // 重阳节 (农历九月初九)
    if (year === 2026) holidays['2026-10-25'] = '重阳节'
    if (year === 2027) holidays['2027-10-14'] = '重阳节'
    if (year === 2025) holidays['2025-10-27'] = '重阳节'

    // 腊八节 (农历十二月初八)
    if (year === 2026) holidays['2026-01-25'] = '腊八节'
    if (year === 2027) holidays['2027-02-14'] = '腊八节'

    // 小年 (农历腊月二十三或二十四)
    if (year === 2026) holidays['2026-02-10'] = '小年'
    if (year === 2027) holidays['2027-01-30'] = '小年'

    // 除夕 (农历最后一天)
    if (year === 2026) holidays['2026-02-16'] = '除夕'
    if (year === 2027) holidays['2027-02-05'] = '除夕'

    return holidays
  },

  /**
   * 获取节日的样式类名
   * @param {string} holidayName - 节日名称
   * @returns {string} CSS 类名
   */
  getHolidayClass(holidayName) {
    const majorHolidays = ['元旦', '春节', '清明节', '劳动节', '端午节', '中秋节', '国庆节']
    if (majorHolidays.includes(holidayName)) {
      return 'major'
    }
    return 'minor'
  },

  /**
   * 获取节日图标
   * @param {string} holidayName - 节日名称
   * @returns {string} 节日图标
   */
  getHolidayIcon(holidayName) {
    const icons = {
      '元旦': '🎆',
      '春节': '🧧',
      '元宵节': '🏮',
      '清明节': '🌿',
      '劳动节': '🔨',
      '青年节': '🌟',
      '儿童节': '🎈',
      '端午节': '🐉',
      '中秋节': '🥮',
      '国庆节': '🏮',
      '重阳节': '🌾',
      '腊八节': '🥣',
      '小年': '🍬',
      '除夕': '🎊'
    }
    return icons[holidayName] || '🎉'
  }
}
