const bookManager = require('../../utils/book-manager')
const themeManager = require('../../utils/theme-manager')

Page({
  data: {
    books: [],
    currentBookId: 'default',
    showModal: false,
    showDeleteModal: false,
    isEditing: false,
    editingBook: null,
    bookName: '',
    selectedIcon: '📒',
    presetIcons: bookManager.PRESET_ICONS,
    theme: themeManager.currentTheme
  },

  onLoad() {
    // 初始化账本
    bookManager.initBooks()
    this.setData({ theme: themeManager.currentTheme })
  },

  onShow() {
    // 更新主题
    const theme = themeManager.getThemeObject()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.getCurrentTheme() })
    this.loadBooks()
  },

  loadBooks() {
    const books = bookManager.getBooks()
    const currentBookId = bookManager.getCurrentBookId()
    
    // 添加每个账本的统计信息
    const booksWithStats = books.map(book => ({
      ...book,
      stats: bookManager.getBookStats(book.id)
    }))

    this.setData({
      books: booksWithStats,
      currentBookId
    })
  },

  // 点击账本 - 切换当前账本
  onBookTap(e) {
    const book = e.currentTarget.dataset.book
    
    if (book.id === this.data.currentBookId) {
      return // 已是当前账本
    }

    wx.showModal({
      title: '切换账本',
      content: `确定要切换到「${book.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          bookManager.setCurrentBookId(book.id)
          
          // 通知其他页面更新数据
          const pages = getCurrentPages()
          pages.forEach(page => {
            if (page && page.onBookChanged) {
              page.onBookChanged()
            }
          })

          this.setData({ currentBookId: book.id })
          wx.showToast({
            title: `已切换到「${book.name}」`,
            icon: 'success'
          })
        }
      }
    })
  },

  // 点击添加账本
  onAddBook() {
    if (this.data.books.length >= 5) {
      wx.showToast({
        title: '最多支持5个账本',
        icon: 'none'
      })
      return
    }

    this.setData({
      showModal: true,
      isEditing: false,
      editingBook: null,
      bookName: '',
      selectedIcon: '📒'
    }, () => {
      console.log('弹窗打开，bookName:', this.data.bookName)
    })
  },

  // 点击编辑账本
  onEditBook(e) {
    const book = e.currentTarget.dataset.book
    
    this.setData({
      showModal: true,
      isEditing: true,
      editingBook: book,
      bookName: book.name,
      selectedIcon: book.icon
    })
  },

  // 关闭弹窗
  onCloseModal() {
    this.setData({
      showModal: false
    })
  },

  // 输入账本名称
  onNameInput(e) {
    const value = e.detail.value || ''
    this.setData({
      bookName: value
    })
    console.log('输入账本名称:', value, '长度:', value.length)
  },

  // 选择图标
  onIconSelect(e) {
    this.setData({
      selectedIcon: e.currentTarget.dataset.icon
    })
  },

  // 确认添加/编辑
  onConfirmModal() {
    const { bookName, selectedIcon, isEditing, editingBook } = this.data

    if (!bookName.trim()) {
      wx.showToast({
        title: '请输入账本名称',
        icon: 'none'
      })
      return
    }

    if (isEditing) {
      // 编辑账本
      const result = bookManager.updateBook(editingBook.id, {
        name: bookName.trim(),
        icon: selectedIcon
      })

      if (result.success) {
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })
        this.setData({ showModal: false })
        this.loadBooks()
        
        // 如果修改的是当前账本，刷新显示
        if (editingBook.id === this.data.currentBookId) {
          this.refreshCurrentPages()
        }
      } else {
        wx.showToast({
          title: result.error || '修改失败',
          icon: 'none'
        })
      }
    } else {
      // 添加账本
      const result = bookManager.addBook(bookName.trim(), selectedIcon)

      if (result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        this.setData({ showModal: false })
        this.loadBooks()
      } else {
        wx.showToast({
          title: result.error || '添加失败',
          icon: 'none'
        })
      }
    }
  },

  // 长按账本 - 显示删除确认
  onLongPressBook(e) {
    const book = e.currentTarget.dataset.book
    
    // 默认账本不可删除
    if (book.isDefault) {
      wx.showToast({
        title: '默认账本不可删除',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showDeleteModal: true,
      deletingBook: book
    })
  },

  // 显示删除确认
  onShowDelete(e) {
    const book = e.currentTarget.dataset.book
    this.setData({
      showDeleteModal: true,
      deletingBook: book
    })
  },

  // 关闭删除弹窗
  onCloseDeleteModal() {
    this.setData({
      showDeleteModal: false
    })
  },

  // 确认删除
  onConfirmDelete() {
    const { deletingBook } = this.data
    
    const result = bookManager.deleteBook(deletingBook.id)

    if (result.success) {
      wx.showToast({
        title: `已删除，${result.movedCount || 0}笔账单已合并`,
        icon: 'success',
        duration: 2000
      })
      this.setData({ showDeleteModal: false })
      this.loadBooks()
      this.refreshCurrentPages()
    } else {
      wx.showToast({
        title: result.error || '删除失败',
        icon: 'none'
      })
    }
  },

  // 刷新其他页面
  refreshCurrentPages() {
    const pages = getCurrentPages()
    pages.forEach(page => {
      if (page && page.onBookChanged) {
        page.onBookChanged()
      }
    })
  }
})
