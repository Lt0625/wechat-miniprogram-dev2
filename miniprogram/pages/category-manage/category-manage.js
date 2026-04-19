Page({
  data: {
    expenseCategories: [],
    incomeCategories: [],
    showModal: false,
    currentType: 'expense',
    newCategoryName: '',
    selectedIcon: '📦',
    isEdit: false,
    editOriginalName: '',
    availableIcons: [
      { icon: '🍔' },
      { icon: '🚗' },
      { icon: '🛍️' },
      { icon: '🎮' },
      { icon: '💊' },
      { icon: '📚' },
      { icon: '🏠' },
      { icon: '📦' },
      { icon: '💰' },
      { icon: '🎁' },
      { icon: '📈' }
    ]
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  loadCategories() {
    try {
      let categories = []
      
      try {
        categories = wx.getStorageSync('categories') || []
      } catch (error) {
        console.error('读取分类失败:', error)
        categories = []
      }

      if (!Array.isArray(categories)) {
        categories = []
      }

      if (categories.length === 0) {
        const defaultCategories = [
          { name: '餐饮', type: 'expense', icon: '🍔' },
          { name: '交通', type: 'expense', icon: '🚗' },
          { name: '购物', type: 'expense', icon: '🛍️' },
          { name: '娱乐', type: 'expense', icon: '🎮' },
          { name: '医疗', type: 'expense', icon: '💊' },
          { name: '教育', type: 'expense', icon: '📚' },
          { name: '住房', type: 'expense', icon: '🏠' },
          { name: '其他', type: 'expense', icon: '📦' },
          { name: '工资', type: 'income', icon: '💰' },
          { name: '奖金', type: 'income', icon: '🎁' },
          { name: '投资', type: 'income', icon: '📈' }
        ]
        
        try {
          wx.setStorageSync('categories', defaultCategories)
        } catch (error) {
          console.error('保存默认分类失败:', error)
        }

        this.setData({
          expenseCategories: defaultCategories.filter(c => c.type === 'expense'),
          incomeCategories: defaultCategories.filter(c => c.type === 'income')
        })
      } else {
        const iconMap = {
          '餐饮': '🍔',
          '交通': '🚗',
          '购物': '🛍️',
          '娱乐': '🎮',
          '医疗': '💊',
          '教育': '📚',
          '住房': '🏠',
          '其他': '📦',
          '工资': '💰',
          '奖金': '🎁',
          '投资': '📈'
        }
        
        var validCategories = categories.map(function(cat) {
          var newCat = {}
          for (var key in cat) {
            if (cat.hasOwnProperty(key)) {
              newCat[key] = cat[key]
            }
          }
          newCat.icon = cat.icon || iconMap[cat.name] || '📦'
          return newCat
        }).filter(function(cat) {
          return cat && typeof cat === 'object' && cat.name && cat.type
        })
        
        this.setData({
          expenseCategories: validCategories.filter(c => c.type === 'expense'),
          incomeCategories: validCategories.filter(c => c.type === 'income')
        })
      }

    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({
        expenseCategories: [],
        incomeCategories: []
      })
    }
  },

  showAddModal(e) {
    const type = e.currentTarget.dataset.type
    
    if (!type || !['expense', 'income'].includes(type)) return

    this.setData({
      showModal: true,
      currentType: type,
      newCategoryName: '',
      selectedIcon: '📦',
      isEdit: false,
      editOriginalName: ''
    })
  },

  hideModal() {
    this.setData({
      showModal: false,
      newCategoryName: ''
    })
  },

  preventClose() {

  },

  onNameInput(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ newCategoryName: e.detail.value })
    }
  },

  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    if (icon) {
      this.setData({ selectedIcon: icon })
    }
  },

  editCategory(e) {
    try {
      const { type, name, icon } = e.currentTarget.dataset
      
      if (!type || !name || !['expense', 'income'].includes(type)) return

      this.setData({
        showModal: true,
        currentType: type,
        newCategoryName: name,
        selectedIcon: icon || '📦',
        isEdit: true,
        editOriginalName: name
      })

    } catch (error) {
      console.error('编辑分类失败:', error)
    }
  },

  saveCategory() {
    try {
      const { 
        currentType, 
        newCategoryName, 
        selectedIcon, 
        isEdit, 
        editOriginalName,
        expenseCategories,
        incomeCategories 
      } = this.data

      if (!newCategoryName || newCategoryName.trim() === '') {
        wx.showToast({ title: '请输入分类名称', icon: 'none' })
        return
      }

      const name = newCategoryName.trim()

      if (name.length > 10) {
        wx.showToast({ title: '分类名称过长', icon: 'none' })
        return
      }

      var allCategories = []
      for (var e = 0; e < expenseCategories.length; e++) {
        allCategories.push(expenseCategories[e])
      }
      for (var inc = 0; inc < incomeCategories.length; inc++) {
        allCategories.push(incomeCategories[inc])
      }

      if (isEdit) {
        if (name !== editOriginalName && allCategories.some(cat => cat.name === name)) {
          wx.showToast({ title: '分类名称已存在', icon: 'none' })
          return
        }

        allCategories = allCategories.map(function(cat) {
          if (cat.name === editOriginalName && cat.type === currentType) {
            var newCat = {}
            for (var key in cat) {
              if (cat.hasOwnProperty(key)) {
                newCat[key] = cat[key]
              }
            }
            newCat.name = name
            newCat.icon = selectedIcon || cat.icon || '📦'
            return newCat
          }
          return cat
        })
      } else {
        if (allCategories.some(cat => cat.name === name)) {
          wx.showToast({ title: '分类名称已存在', icon: 'none' })
          return
        }

        allCategories.push({
          name,
          type: currentType,
          icon: selectedIcon || '📦'
        })
      }

      try {
        wx.setStorageSync('categories', allCategories)

        this.loadCategories()
        this.hideModal()

        wx.showToast({ 
          title: isEdit ? '修改成功' : '添加成功', 
          icon: 'success' 
        })

      } catch (error) {
        console.error('保存分类失败:', error)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }

    } catch (error) {
      console.error('保存分类操作失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  deleteCategory(e) {
    try {
      const { type, name } = e.currentTarget.dataset
      
      if (!type || !name || !['expense', 'income'].includes(type)) return

      wx.showModal({
        title: '删除确认',
        content: `确定要删除"${name}"分类吗？`,
        confirmColor: '#e74c3c',
        success: (res) => {
          if (res.confirm) {
            this.performDelete(type, name)
          }
        },
        fail: () => {
          wx.showToast({ title: '操作取消', icon: 'none' })
        }
      })

    } catch (error) {
      console.error('删除分类失败:', error)
    }
  },

  performDelete(type, name) {
    try {
      let categories = []
      
      try {
        categories = wx.getStorageSync('categories') || []
      } catch (error) {
        console.error('读取分类失败:', error)
        wx.showToast({ title: '删除失败', icon: 'none' })
        return
      }

      if (!Array.isArray(categories)) {
        wx.showToast({ title: '删除失败', icon: 'none' })
        return
      }

      const updatedCategories = categories.filter(
        cat => !(cat.name === name && cat.type === type)
      )

      try {
        wx.setStorageSync('categories', updatedCategories)

        this.loadCategories()

        wx.showToast({ title: '删除成功', icon: 'success' })

      } catch (error) {
        console.error('保存分类失败:', error)
        wx.showToast({ title: '删除失败', icon: 'none' })
      }

    } catch (error) {
      console.error('执行删除失败:', error)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})