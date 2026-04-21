/**
 * 账本管理模块
 * 支持多账本隔离，每个账本有独立的账单、分类、账户数据
 */

const DEFAULT_ICON = '📒'
const DEFAULT_NAME = '日常账本'

// 预设图标列表
const PRESET_ICONS = [
  '📒', '💰', '🏠', '🚗', '✈️', '🛒', '🎮', '🎓',
  '💼', '🏥', '👶', '🐱', '🌴', '🎁', '⚽', '🎸',
  '🏖️', '📱', '💳', '🎯'
]

/**
 * 获取账本列表
 */
function getBooks() {
  try {
    const books = wx.getStorageSync('books') || []
    return Array.isArray(books) ? books : []
  } catch (error) {
    console.error('读取账本失败:', error)
    return []
  }
}

/**
 * 保存账本列表
 */
function saveBooks(books) {
  try {
    wx.setStorageSync('books', books)
    return true
  } catch (error) {
    console.error('保存账本失败:', error)
    return false
  }
}

/**
 * 初始化账本（首次使用时创建默认账本）
 */
function initBooks() {
  const books = getBooks()
  if (books.length === 0) {
    const defaultBook = {
      id: 'default',
      name: DEFAULT_NAME,
      icon: DEFAULT_ICON,
      isDefault: true,
      createTime: new Date().toISOString()
    }
    saveBooks([defaultBook])
  }
  return getBooks()
}

/**
 * 获取当前选中的账本ID
 */
function getCurrentBookId() {
  try {
    return wx.getStorageSync('currentBookId') || 'default'
  } catch (error) {
    return 'default'
  }
}

/**
 * 设置当前选中的账本ID
 */
function setCurrentBookId(bookId) {
  try {
    wx.setStorageSync('currentBookId', bookId)
    return true
  } catch (error) {
    console.error('保存当前账本失败:', error)
    return false
  }
}

/**
 * 获取当前账本信息
 */
function getCurrentBook() {
  const books = getBooks()
  const currentId = getCurrentBookId()
  return books.find(b => b.id === currentId) || books[0] || null
}

/**
 * 添加账本
 * @param {string} name - 账本名称
 * @param {string} icon - 账本图标
 * @returns {Object} { success: boolean, book: Object, error: string }
 */
function addBook(name, icon = DEFAULT_ICON) {
  const books = getBooks()
  
  // 检查数量限制
  if (books.length >= 5) {
    return { success: false, error: '最多支持5个账本' }
  }
  
  // 检查名称是否重复
  if (books.some(b => b.name === name)) {
    return { success: false, error: '账本名称已存在' }
  }
  
  const newBook = {
    id: 'book_' + Date.now(),
    name: name.trim(),
    icon: icon,
    isDefault: false,
    createTime: new Date().toISOString()
  }
  
  books.push(newBook)
  
  if (saveBooks(books)) {
    return { success: true, book: newBook }
  }
  return { success: false, error: '保存失败' }
}

/**
 * 更新账本
 * @param {string} bookId - 账本ID
 * @param {Object} updates - 更新内容 { name, icon }
 * @returns {Object} { success: boolean, error: string }
 */
function updateBook(bookId, updates) {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  
  if (index === -1) {
    return { success: false, error: '账本不存在' }
  }
  
  // 日常账本不允许修改
  if (books[index].isDefault && updates.name && updates.name !== DEFAULT_NAME) {
    return { success: false, error: '默认账本名称不可修改' }
  }
  
  // 检查名称是否重复（排除自身）
  if (updates.name && books.some(b => b.id !== bookId && b.name === updates.name)) {
    return { success: false, error: '账本名称已存在' }
  }
  
  if (updates.name !== undefined) books[index].name = updates.name.trim()
  if (updates.icon !== undefined) books[index].icon = updates.icon
  
  return saveBooks(books) ? { success: true } : { success: false, error: '保存失败' }
}

/**
 * 删除账本
 * @param {string} bookId - 账本ID
 * @returns {Object} { success: boolean, error: string }
 */
function deleteBook(bookId) {
  const books = getBooks()
  const book = books.find(b => b.id === bookId)
  
  if (!book) {
    return { success: false, error: '账本不存在' }
  }
  
  // 默认账本不可删除
  if (book.isDefault) {
    return { success: false, error: '默认账本不可删除' }
  }
  
  // 获取默认账本ID
  const defaultBook = books.find(b => b.isDefault)
  if (!defaultBook) {
    return { success: false, error: '默认账本不存在' }
  }
  
  // 将该账本的账单合并到默认账本
  const bills = getBills()
  const movedBills = bills
    .filter(b => b.bookId === bookId)
    .map(b => ({ ...b, bookId: defaultBook.id }))
  
  if (movedBills.length > 0) {
    const otherBills = bills.filter(b => b.bookId !== bookId)
    saveBills([...otherBills, ...movedBills])
  }
  
  // 将该账本的分类合并到默认账本
  const categories = getCategories()
  const movedCategories = categories
    .filter(c => c.bookId === bookId)
    .map(c => ({ ...c, bookId: defaultBook.id }))
  
  if (movedCategories.length > 0) {
    const otherCategories = categories.filter(c => c.bookId !== bookId)
    saveCategories([...otherCategories, ...movedCategories])
  }
  
  // 将该账本的账户合并到默认账本
  const accounts = getAccounts()
  const movedAccounts = accounts
    .filter(a => a.bookId === bookId)
    .map(a => ({ ...a, bookId: defaultBook.id }))
  
  if (movedAccounts.length > 0) {
    const otherAccounts = accounts.filter(a => a.bookId !== bookId)
    saveAccounts([...otherAccounts, ...movedAccounts])
  }
  
  // 删除账本
  const newBooks = books.filter(b => b.id !== bookId)
  if (saveBooks(newBooks)) {
    // 如果删除的是当前账本，切换到默认账本
    if (getCurrentBookId() === bookId) {
      setCurrentBookId(defaultBook.id)
    }
    return { success: true, movedCount: movedBills.length }
  }
  return { success: false, error: '删除失败' }
}

// ============ 账单相关（按账本隔离）============

function getBills() {
  try {
    return wx.getStorageSync('bills') || []
  } catch (error) {
    return []
  }
}

function saveBills(bills) {
  try {
    wx.setStorageSync('bills', bills)
    return true
  } catch (error) {
    return false
  }
}

function getCategories() {
  try {
    return wx.getStorageSync('categories') || []
  } catch (error) {
    return []
  }
}

function saveCategories(categories) {
  try {
    wx.setStorageSync('categories', categories)
    return true
  } catch (error) {
    return false
  }
}

function getAccounts() {
  try {
    return wx.getStorageSync('accounts') || []
  } catch (error) {
    return []
  }
}

function saveAccounts(accounts) {
  try {
    wx.setStorageSync('accounts', accounts)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 获取当前账本的账单（只返回当前账本的账单）
 */
function getCurrentBookBills() {
  const currentBookId = getCurrentBookId()
  return getBills().filter(b => b.bookId === currentBookId)
}

/**
 * 保存账单到当前账本
 */
function saveBillToCurrentBook(bill) {
  const currentBookId = getCurrentBookId()
  bill.bookId = currentBookId
  const bills = getBills()
  bills.push(bill)
  return saveBills(bills)
}

/**
 * 更新当前账本的账单
 */
function updateBillInCurrentBook(billId, updates) {
  const currentBookId = getCurrentBookId()
  const bills = getBills()
  const index = bills.findIndex(b => b.id === billId && b.bookId === currentBookId)
  if (index !== -1) {
    bills[index] = { ...bills[index], ...updates }
    return saveBills(bills)
  }
  return false
}

/**
 * 删除当前账本的账单
 */
function deleteBillFromCurrentBook(billId) {
  const currentBookId = getCurrentBookId()
  const bills = getBills()
  const filtered = bills.filter(b => !(b.id === billId && b.bookId === currentBookId))
  return saveBills(filtered)
}

/**
 * 获取当前账本的分类
 */
function getCurrentBookCategories() {
  const currentBookId = getCurrentBookId()
  return getCategories().filter(c => c.bookId === currentBookId)
}

/**
 * 获取当前账本的账户
 */
function getCurrentBookAccounts() {
  const currentBookId = getCurrentBookId()
  return getAccounts().filter(a => a.bookId === currentBookId)
}

/**
 * 获取账本统计信息
 */
function getBookStats(bookId) {
  const bills = getBills().filter(b => b.bookId === bookId)
  const categories = getCategories().filter(c => c.bookId === bookId)
  const accounts = getAccounts().filter(a => a.bookId === bookId)
  
  return {
    billCount: bills.length,
    categoryCount: categories.length,
    accountCount: accounts.length,
    uniqueDays: new Set(bills.map(b => b.date)).size
  }
}

module.exports = {
  PRESET_ICONS,
  DEFAULT_ICON,
  DEFAULT_NAME,
  getBooks,
  initBooks,
  getCurrentBookId,
  setCurrentBookId,
  getCurrentBook,
  addBook,
  updateBook,
  deleteBook,
  getCurrentBookBills,
  saveBillToCurrentBook,
  updateBillInCurrentBook,
  deleteBillFromCurrentBook,
  getCurrentBookCategories,
  getCurrentBookAccounts,
  getBookStats,
  getBills,
  saveBills,
  getCategories,
  saveCategories,
  getAccounts,
  saveAccounts
}
