module.exports = {
  iconMap: {
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
  },

  colors: {
    expense: {
      main: '#FF6B6B',
      light: '#FF8E8E',
      gradientStart: 'rgba(255, 107, 107, 0.4)',
      gradientEnd: 'rgba(255, 107, 107, 0.02)'
    },
    income: {
      main: '#4ECDC4',
      light: '#7EDDD6',
      gradientStart: 'rgba(78, 205, 196, 0.4)',
      gradientEnd: 'rgba(78, 205, 196, 0.02)'
    },
    balance: {
      main: '#6366f1',
      light: '#818cf8',
      gradientStart: 'rgba(99, 102, 241, 0.4)',
      gradientEnd: 'rgba(99, 102, 241, 0.02)'
    }
  },

  theme: {
    primary: '#FFB347',
    secondary: '#FF9800',
    background: '#FFF8E7',
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999'
  },

  defaultCategories: [
    { name: '餐饮', type: 'expense' },
    { name: '交通', type: 'expense' },
    { name: '购物', type: 'expense' },
    { name: '娱乐', type: 'expense' },
    { name: '医疗', type: 'expense' },
    { name: '教育', type: 'expense' },
    { name: '住房', type: 'expense' },
    { name: '其他', type: 'expense' },
    { name: '工资', type: 'income' },
    { name: '奖金', type: 'income' },
    { name: '投资', type: 'income' }
  ],

  weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],

  getCategoryIcon(categoryName) {
    return this.iconMap[categoryName] || '📊'
  }
}