/**
 * 账单辅助工具模块
 * 提供余额计算、账单统计等通用功能
 */

/**
 * 根据账单数据计算所有账户的余额
 * @param {Array} bills - 账单数组
 * @param {Array} accounts - 账户数组
 * @param {boolean} preserveManualBalance - 是否保留手动设置的余额（默认true）
 * @returns {Object} { accounts: 更新后的账户数组, summary: 汇总信息 }
 */
function calculateAccountBalances(bills, accounts, preserveManualBalance = true) {
  if (!Array.isArray(accounts)) {
    accounts = []
  }
  
  if (!Array.isArray(bills)) {
    bills = []
  }

  // 初始化账户余额计算结果
  const balanceMap = {}
  const hasBillsMap = {}  // 记录哪些账户有关联账单
  
  // 为每个账户初始化余额为0
  accounts.forEach(acc => {
    if (acc && acc.name) {
      balanceMap[acc.name] = 0
      hasBillsMap[acc.name] = false
    }
  })

  // 遍历所有账单计算余额
  bills.forEach(bill => {
    if (!bill || !bill.account) return
    
    const amount = parseFloat(bill.amount) || 0
    const accountName = bill.account
    
    // 标记该账户有关联账单
    hasBillsMap[accountName] = true
    
    // 确保该账户在balanceMap中存在
    if (balanceMap[accountName] === undefined) {
      balanceMap[accountName] = 0
    }
    
    // 支出减少余额，收入增加余额
    if (bill.type === 'expense') {
      balanceMap[accountName] -= amount
    } else if (bill.type === 'income') {
      balanceMap[accountName] += amount
    }
  })

  // 更新账户数据
  const updatedAccounts = accounts.map(acc => {
    if (acc && acc.name) {
      const accountName = acc.name
      const calculatedBalance = balanceMap[accountName] !== undefined ? balanceMap[accountName] : 0
      const hasBills = hasBillsMap[accountName] === true
      
      // 如果保留手动余额且该账户没有关联账单，则保留原始余额
      // 否则使用计算出的余额
      let finalBalance
      if (preserveManualBalance && !hasBills) {
        finalBalance = acc.balance !== undefined ? acc.balance : calculatedBalance
      } else {
        finalBalance = calculatedBalance
      }
      
      return {
        ...acc,
        balance: finalBalance
      }
    }
    return acc
  })

  // 计算总资产和总负债
  let totalAssets = 0
  let totalLiability = 0
  
  Object.keys(balanceMap).forEach(name => {
    const balance = balanceMap[name]
    if (balance >= 0) {
      totalAssets += balance
    } else {
      totalLiability += Math.abs(balance)
    }
  })

  return {
    accounts: updatedAccounts,
    summary: {
      totalAssets,
      totalLiability,
      netAssets: totalAssets - totalLiability
    }
  }
}

/**
 * 根据账单计算单个账户的余额
 * @param {Array} bills - 账单数组
 * @param {string} accountName - 账户名称
 * @returns {number} 账户余额
 */
function calculateSingleAccountBalance(bills, accountName) {
  if (!Array.isArray(bills) || !accountName) {
    return 0
  }
  
  let balance = 0
  
  bills.forEach(bill => {
    if (bill && bill.account === accountName) {
      const amount = parseFloat(bill.amount) || 0
      if (bill.type === 'expense') {
        balance -= amount
      } else if (bill.type === 'income') {
        balance += amount
      }
    }
  })
  
  return balance
}

/**
 * 获取指定账户的初始余额（从账户配置中读取）
 * 用于计算从某个时间点开始的余额
 * @param {Array} accounts - 账户数组
 * @param {string} accountName - 账户名称
 * @returns {number} 初始余额
 */
function getAccountInitialBalance(accounts, accountName) {
  if (!Array.isArray(accounts) || !accountName) {
    return 0
  }
  
  const account = accounts.find(acc => acc && acc.name === accountName)
  return account ? (parseFloat(account.balance) || 0) : 0
}

/**
 * 更新单个账户的余额到存储
 * @param {string} accountName - 账户名称
 * @param {number} newBalance - 新余额
 */
function updateAccountBalance(accountName, newBalance) {
  try {
    let accounts = wx.getStorageSync('accounts') || []
    
    if (!Array.isArray(accounts)) {
      accounts = []
    }
    
    const index = accounts.findIndex(acc => acc && acc.name === accountName)
    
    if (index !== -1) {
      accounts[index] = {
        ...accounts[index],
        balance: newBalance
      }
      wx.setStorageSync('accounts', accounts)
      return true
    }
    
    return false
  } catch (error) {
    console.error('更新账户余额失败:', error)
    return false
  }
}

/**
 * 批量更新所有账户余额
 * @param {Array} accounts - 更新后的账户数组
 */
function updateAllAccountBalances(accounts) {
  try {
    wx.setStorageSync('accounts', accounts)
    return true
  } catch (error) {
    console.error('批量更新账户余额失败:', error)
    return false
  }
}

/**
 * 检测账单是否重复（只检测同一天内的重复）
 * @param {Array} bills - 账单数组
 * @param {Object} newBill - 新账单（必须包含date字段）
 * @param {number} tolerance - 金额容差（默认5元）
 * @param {string} excludeBillId - 排除的账单ID（编辑时排除自身）
 * @returns {Object} { isDuplicate: boolean, similarBills: Array }
 */
function detectDuplicateBills(bills, newBill, tolerance = 5, excludeBillId = null) {
  if (!Array.isArray(bills) || !newBill) {
    return { isDuplicate: false, similarBills: [] }
  }
  
  // 必须有日期才能检测重复
  if (!newBill.date) {
    return { isDuplicate: false, similarBills: [] }
  }
  
  const similarBills = bills.filter(bill => {
    // 排除自身（编辑时）
    if (excludeBillId && bill.id === excludeBillId) return false
    
    // 必须同一天
    if (bill.date !== newBill.date) return false
    
    // 类型必须相同
    if (!bill || bill.type !== newBill.type) return false
    
    // 分类必须相同
    if (bill.category !== newBill.category) return false
    
    // 账户必须相同
    if (bill.account !== newBill.account) return false
    
    // 金额在容差范围内
    const amountDiff = Math.abs((parseFloat(bill.amount) || 0) - (parseFloat(newBill.amount) || 0))
    return amountDiff <= tolerance
  })
  
  return {
    isDuplicate: similarBills.length > 0,
    similarBills
  }
}

/**
 * 计算周期账单的下次到期日期
 * @param {string} frequency - 周期类型：daily, weekly, monthly, yearly
 * @param {Object} params - 周期参数
 * @param {number} params.weeklyDay - 星期几（0-6，weekly时使用）
 * @param {number} params.monthlyDay - 日期（1-31，monthly时使用）
 * @param {number} params.yearlyMonth - 月份（1-12，yearly时使用）
 * @param {number} params.yearlyDay - 日期（1-31，yearly时使用）
 * @returns {string} 下次到期日期（YYYY-MM-DD格式）
 */
function calculateNextDue(frequency, params = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let nextDue = new Date(today)

  switch (frequency) {
    case 'daily':
      nextDue.setDate(today.getDate() + 1)
      break

    case 'weekly':
      const targetDay = params.weeklyDay !== null && params.weeklyDay !== undefined
        ? params.weeklyDay
        : today.getDay()
      let daysUntil = targetDay - today.getDay()
      if (daysUntil <= 0) daysUntil += 7
      nextDue.setDate(today.getDate() + daysUntil)
      break

    case 'monthly':
      const targetMonthDay = params.monthlyDay || 1
      nextDue.setDate(targetMonthDay)
      if (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 1)
      }
      break

    case 'yearly':
      const targetMonth = (params.yearlyMonth || 1) - 1
      const targetDayOfMonth = params.yearlyDay || 1
      nextDue.setMonth(targetMonth)
      nextDue.setDate(targetDayOfMonth)
      if (nextDue <= today) {
        nextDue.setFullYear(nextDue.getFullYear() + 1)
      }
      break

    default:
      nextDue.setDate(today.getDate() + 1)
  }

  const year = nextDue.getFullYear()
  const month = String(nextDue.getMonth() + 1).padStart(2, '0')
  const day = String(nextDue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = {
  calculateAccountBalances,
  calculateSingleAccountBalance,
  getAccountInitialBalance,
  updateAccountBalance,
  updateAllAccountBalances,
  detectDuplicateBills,
  calculateNextDue
}
