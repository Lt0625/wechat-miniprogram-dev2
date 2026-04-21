const themeManager = require('../../utils/theme-manager')
const config = require('../../utils/config')

Page({
  data: {
    period: 'month',
    currentTab: 'expense',
    summary: {
      expense: '0.00',
      income: '0.00',
      balance: '0.00'
    },
    categoryData: [],
    topBills: [],
    pieChartData: [],
    theme: themeManager.currentTheme
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

  onLoad() {
    console.log('统计页 onLoad 触发')
    this.loadData()
  },

  onShow() {
    console.log('统计页 onShow 触发')
    // 更新主题
    const theme = themeManager.getCurrentTheme()
    if (theme) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.primary
      })
    }
    this.setData({ theme: themeManager.currentTheme })
    this.loadData()
  },

  selectPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period && ['week', 'month', 'quarter', 'year'].includes(period)) {
      this.setData({ period })
      this.loadData()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab && ['expense', 'income', 'balance', 'category'].includes(tab)) {
      this.setData({ currentTab: tab })
      this.loadData()
    }
  },

  loadData() {
    try {
      const app = getApp()
      if (!app || !app.getBillsFromCache) {
        console.warn('App实例不可用')
        this.setData({
          summary: { expense: '0.00', income: '0.00', balance: '0.00' },
          categoryData: [],
          topBills: [],
          theme: themeManager.currentTheme
        })
        return
      }

      let bills = app.getBillsFromCache(true)

      if (!Array.isArray(bills)) {
        bills = []
      }

      bills = bills.map(function(bill) {
        var newBill = {}
        for (var key in bill) {
          if (bill.hasOwnProperty(key)) {
            newBill[key] = bill[key]
          }
        }
        newBill.amount = (typeof bill.amount === 'number' && !isNaN(bill.amount)) ? bill.amount : (bill.amount != null ? parseFloat(bill.amount) || 0 : 0)
        return newBill
      })

      var filteredBills = this.filterByPeriod(bills)

      var expense = 0
      var income = 0

      filteredBills.forEach(function(bill) {
        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          if (bill.type === 'expense') {
            expense += bill.amount
          } else {
            income += bill.amount
          }
        }
      })

      var balance = income - expense

      this.setData({
        summary: {
          expense: parseFloat(expense.toFixed(2)),
          income: parseFloat(income.toFixed(2)),
          balance: parseFloat(balance.toFixed(2))
        },
        theme: themeManager.currentTheme
      })

      this.calculateCategoryData(filteredBills)
      this.getTopBills(filteredBills)

      if (this.data.currentTab === 'category') {
        this.drawPieChart(filteredBills)
      } else {
        this.drawTrendChart(filteredBills)
      }

    } catch (error) {
      console.error('加载数据失败:', error)
      this.setData({
        summary: { expense: '0.00', income: '0.00', balance: '0.00' },
        categoryData: [],
        topBills: [],
        pieChartData: [],
        theme: themeManager.currentTheme
      })
    }
  },

  filterByPeriod(bills) {
    if (!Array.isArray(bills) || bills.length === 0) return []

    try {
      var now = new Date()
      var startDate
      var todayStr = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2)

      switch (this.data.period) {
        case 'week':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          var quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          return bills
      }

      if (!startDate || isNaN(startDate.getTime())) {
        return bills
      }

      var startStr = startDate.getFullYear() + '-' + ('0' + (startDate.getMonth() + 1)).slice(-2) + '-' + ('0' + startDate.getDate()).slice(-2)

      return bills.filter(function(bill) {
        if (!bill.date || typeof bill.date !== 'string') return false
        var billDateStr = bill.date.trim()
        return billDateStr >= startStr && billDateStr <= todayStr
      })

    } catch (error) {
      console.error('筛选账单失败:', error)
      return bills
    }
  },

  calculateCategoryData(bills) {
    try {
      var currentTab = this.data.currentTab

      if (!Array.isArray(bills) || bills.length === 0) {
        this.setData({ categoryData: [] })
        return
      }

      if (currentTab === 'balance') {
        var allCategories = {}

        bills.forEach(function(bill) {
          if (!bill.category) return

          if (!allCategories[bill.category]) {
            allCategories[bill.category] = {
              name: bill.category,
              icon: this.getCategoryIcon(bill.category),
              expense: 0,
              income: 0
            }
          }

          if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
            if (bill.type === 'expense') {
              allCategories[bill.category].expense += bill.amount
            } else {
              allCategories[bill.category].income += bill.amount
            }
          }
        }.bind(this))

        var categoryDataArr = []
        var cats = Object.values(allCategories)
        for (var i = 0; i < cats.length; i++) {
          var cat = cats[i]
          var newCat = {}
          for (var key in cat) {
            if (cat.hasOwnProperty(key)) {
              newCat[key] = cat[key]
            }
          }
          newCat.amount = cat.income - cat.expense
          newCat.type = (cat.income - cat.expense) >= 0 ? 'income' : 'expense'
          if (newCat.amount !== 0) {
            categoryDataArr.push(newCat)
          }
        }

        var maxAmount = 1
        for (var j = 0; j < categoryDataArr.length; j++) {
          var absAmt = Math.abs(categoryDataArr[j].amount)
          if (absAmt > maxAmount) maxAmount = absAmt
        }

        categoryDataArr.forEach(function(cat) {
          cat.percent = parseFloat(((Math.abs(cat.amount) / maxAmount) * 100).toFixed(1))
        })

        this.setData({
          categoryData: categoryDataArr.sort(function(a, b) { return Math.abs(b.amount) - Math.abs(a.amount) })
        })

      } else if (currentTab === 'category') {
        var typeFilter = 'expense'
        var categoryMap = {}

        bills.filter(function(bill) { return bill.type === typeFilter }).forEach(function(bill) {
          if (!bill.category) return

          if (!categoryMap[bill.category]) {
            categoryMap[bill.category] = {
              name: bill.category,
              icon: this.getCategoryIcon(bill.category),
              amount: 0,
              type: typeFilter
            }
          }

          if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
            categoryMap[bill.category].amount += bill.amount
          }
        }.bind(this))

        var categoryData = Object.values(categoryMap)
        var totalAmount = categoryData.reduce(function(sum, item) { return sum + item.amount }, 0) || 1

        categoryData.forEach(function(item) {
          item.percent = parseFloat(((item.amount / totalAmount) * 100).toFixed(1))
        })

        var sortedData = categoryData.sort(function(a, b) { return b.amount - a.amount })
        this.setData({
          categoryData: sortedData,
          pieChartData: sortedData
        })

      } else {
        var typeFilter2 = currentTab === 'expense' ? 'expense' : 'income'
        var categoryMap2 = {}

        bills.filter(function(bill) { return bill.type === typeFilter2 }).forEach(function(bill) {
          if (!bill.category) return

          if (!categoryMap2[bill.category]) {
            categoryMap2[bill.category] = {
              name: bill.category,
              icon: this.getCategoryIcon(bill.category),
              amount: 0,
              type: typeFilter2
            }
          }

          if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
            categoryMap2[bill.category].amount += bill.amount
          }
        }.bind(this))

        var categoryData2 = Object.values(categoryMap2)
        var totalAmount2 = categoryData2.reduce(function(sum, item) { return sum + item.amount }, 0) || 1

        categoryData2.forEach(function(item) {
          item.percent = parseFloat(((item.amount / totalAmount2) * 100).toFixed(1))
        })

        this.setData({
          categoryData: categoryData2.sort(function(a, b) { return b.amount - a.amount })
        })
      }

    } catch (error) {
      console.error('计算分类数据失败:', error)
      this.setData({ categoryData: [] })
    }
  },

  getCategoryIcon(name) {
    if (!name || typeof name !== 'string') return '📊'
    return config.iconMap[name] || '📊'  // 使用 config.js 的 iconMap（统一来源）
  },

  getTopBills(bills) {
    try {
      var currentTab = this.data.currentTab

      if (!Array.isArray(bills) || bills.length === 0) {
        this.setData({ topBills: [] })
        return
      }

      var filtered = []
      for (var k = 0; k < bills.length; k++) {
        filtered.push(bills[k])
      }

      if (currentTab !== 'balance' && currentTab !== 'category') {
        filtered = bills.filter(function(bill) { return bill.type === currentTab })
      }

      var topBills = filtered
        .filter(function(bill) { return bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount) })
        .sort(function(a, b) {
          if (currentTab === 'balance') {
            return Math.abs(b.amount) - Math.abs(a.amount)
          }
          return b.amount - a.amount
        })
        .slice(0, 5)

      this.setData({ topBills: topBills })

    } catch (error) {
      console.error('获取Top账单失败:', error)
      this.setData({ topBills: [] })
    }
  },

  drawTrendChart(bills) {
    try {
      var self = this
      setTimeout(function() {
        var query = wx.createSelectorQuery().in(self)
        query.select('#trendChart').fields({ node: true, size: true }).exec(function(res) {
          if (!res || !res[0]) {
            console.warn('未找到canvas元素')
            return
          }

          var canvas = res[0].node
          var ctx = canvas.getContext('2d')

          if (!canvas || !ctx) {
            console.warn('Canvas上下文获取失败')
            return
          }

          var windowInfo = wx.getWindowInfo()
          var dpr = windowInfo.pixelRatio || 2
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          var width = res[0].width
          var height = res[0].height

          if (width <= 0 || height <= 0) {
            console.warn('Canvas尺寸无效')
            return
          }

          var trendData = self.calculateTrendData(bills)
          self.renderChart(ctx, width, height, trendData)
        })
      }, 100)

    } catch (error) {
      console.error('绘制图表失败:', error)
    }
  },

  drawPieChart(bills) {
    try {
      var self = this
      setTimeout(function() {
        var query = wx.createSelectorQuery().in(self)
        query.select('#pieChart').fields({ node: true, size: true }).exec(function(res) {
          if (!res || !res[0]) {
            console.warn('未找到饼图canvas元素')
            return
          }

          var canvas = res[0].node
          var ctx = canvas.getContext('2d')

          if (!canvas || !ctx) {
            console.warn('饼图Canvas上下文获取失败')
            return
          }

          var windowInfo2 = wx.getWindowInfo()
          var dpr = windowInfo2.pixelRatio || 2
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          var width = res[0].width
          var height = res[0].height

          if (width <= 0 || height <= 0) {
            console.warn('饼图Canvas尺寸无效')
            return
          }

          var pieData = self.calculatePieData(bills)
          self.renderPieChart(ctx, width, height, pieData)
        })
      }, 100)

    } catch (error) {
      console.error('绘制饼图失败:', error)
    }
  },

  calculatePieData(bills) {
    var data = []
    var currentTab = this.data.currentTab

    try {
      var typeFilter = currentTab === 'category' ? 'expense' : currentTab
      var filteredBills = bills.filter(function(bill) { return bill.type === typeFilter })

      var categoryMap = {}
      filteredBills.forEach(function(bill) {
        if (!bill.category) return

        if (!categoryMap[bill.category]) {
          categoryMap[bill.category] = {
            name: bill.category,
            icon: this.getCategoryIcon(bill.category),
            amount: 0
          }
        }

        if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
          categoryMap[bill.category].amount += bill.amount
        }
      }.bind(this))

      var totalAmount = Object.values(categoryMap).reduce(function(sum, cat) { return sum + cat.amount }, 0) || 1

      var colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E2', '#F8B500', '#FF7675'
      ]

      var index = 0
      Object.values(categoryMap).forEach(function(cat) {
        if (cat.amount > 0) {
          data.push({
            name: cat.name,
            icon: cat.icon,
            amount: cat.amount,
            percent: parseFloat(((cat.amount / totalAmount) * 100).toFixed(1)),
            color: colors[index % colors.length]
          })
          index++
        }
      })

    } catch (error) {
      console.error('计算饼图数据失败:', error)
    }

    return data.sort(function(a, b) { return b.amount - a.amount })
  },

  renderPieChart(ctx, width, height, data) {
    try {
      ctx.clearRect(0, 0, width, height)

      if (!data || data.length === 0) {
        ctx.fillStyle = '#999'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无数据', width / 2, height / 2)
        return
      }

      var centerX = width / 2
      var centerY = height / 2 - 30
      var radius = Math.min(width, height) / 2 - 40

      if (radius <= 0) {
        console.warn('饼图半径无效')
        return
      }

      var startAngle = -Math.PI / 2

      data.forEach(function(item) {
        var totalForSlice = data.reduce(function(sum, d) { return sum + d.amount }, 0) || 1
        var sliceAngle = (item.amount / totalForSlice) * Math.PI * 2

        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.stroke()

        var midAngle = startAngle + sliceAngle / 2
        var labelRadius = radius + 30
        var labelX = centerX + Math.cos(midAngle) * labelRadius
        var labelY = centerY + Math.sin(midAngle) * labelRadius

        ctx.fillStyle = '#666'
        ctx.font = '10px sans-serif'  // Canvas 不支持 rpx，改用 px
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.name + ' ' + item.percent + '%', labelX, labelY)

        startAngle += sliceAngle
      })

      ctx.fillStyle = '#333'
      ctx.font = 'bold 12px sans-serif'  // Canvas 不支持 rpx，改用 px
      ctx.textAlign = 'center'
      ctx.fillText('分类占比', centerX, height - 20)

    } catch (error) {
      console.error('渲染饼图失败:', error)
    }
  },

  calculateTrendData(bills) {
    var data = []
    var period = this.data.period
    var currentTab = this.data.currentTab

    try {
      var today = new Date()

      var days = 7
      switch (period) {
        case 'week': days = 7; break
        case 'month': days = 30; break
        case 'quarter': days = 90; break
        case 'year': days = 365; break
      }

      days = Math.min(Math.max(days, 1), 365)

      for (var i = days - 1; i >= 0; i--) {
        var date = new Date(today)
        date.setDate(today.getDate() - i)

        var dateStr = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2)

        var dayBills = Array.isArray(bills) ? bills.filter(function(bill) { return bill.date === dateStr }) : []
        var value = 0

        dayBills.forEach(function(bill) {
          if (bill.amount && typeof bill.amount === 'number' && !isNaN(bill.amount)) {
            if (currentTab === 'expense') {
              value += bill.type === 'expense' ? bill.amount : 0
            } else if (currentTab === 'income') {
              value += bill.type === 'income' ? bill.amount : 0
            } else {
              value += bill.type === 'income' ? bill.amount : -bill.amount
            }
          }
        })

        data.push({
          date: (date.getMonth() + 1) + '/' + date.getDate(),
          value: value
        })
      }

    } catch (error) {
      console.error('计算趋势数据失败:', error)
    }

    return data
  },

  renderChart(ctx, width, height, data) {
    try {
      ctx.clearRect(0, 0, width, height)

      if (!data || data.length === 0) {
        this.drawEmptyState(ctx, width, height)
        return
      }

      var padding = { top: 30, right: 20, bottom: 40, left: 50 }
      var chartWidth = width - padding.left - padding.right
      var chartHeight = height - padding.top - padding.bottom

      if (chartWidth <= 0 || chartHeight <= 0) {
        this.drawEmptyState(ctx, width, height)
        return
      }

      var values = data.map(function(d) { return d.value != null ? d.value : 0 })

      var nonZeroValues = values.filter(function(v) { return v !== 0 })
      var maxValue, minValue

      if (nonZeroValues.length > 0) {
        var actualMaxValue = nonZeroValues[0]
        for (var n = 1; n < nonZeroValues.length; n++) {
          if (nonZeroValues[n] > actualMaxValue) actualMaxValue = nonZeroValues[n]
        }

        if (this.data.currentTab === 'balance') {
          var minVal = nonZeroValues[0]
          for (var m = 1; m < nonZeroValues.length; m++) {
            if (nonZeroValues[m] < minVal) minVal = nonZeroValues[m]
          }
          minValue = Math.min(minVal, 0)
        } else {
          minValue = 0
        }

        var targetMax = actualMaxValue * 1.15

        if (targetMax <= 10) {
          maxValue = Math.ceil(targetMax)
        } else if (targetMax <= 50) {
          maxValue = Math.ceil(targetMax / 5) * 5
        } else if (targetMax <= 100) {
          maxValue = Math.ceil(targetMax / 10) * 10
        } else if (targetMax <= 500) {
          maxValue = Math.ceil(targetMax / 50) * 50
        } else {
          maxValue = Math.ceil(targetMax / 100) * 100
        }

        if (maxValue <= 0) maxValue = 100

      } else {
        maxValue = 100
        minValue = 0
      }

      var currentColors = this.colors[this.data.currentTab] || this.colors.expense

      this.drawGridAndAxes(ctx, padding, chartWidth, chartHeight, maxValue, minValue, data)
      this.drawSmoothLineWithFill(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue, currentColors)
      this.drawXLabels(ctx, padding, chartWidth, chartHeight, data)

    } catch (error) {
      console.error('渲染图表失败:', error)
    }
  },

  drawEmptyState(ctx, width, height) {
    ctx.fillStyle = '#999'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('暂无数据', width / 2, height / 2)
  },

  drawGridAndAxes(ctx, padding, chartWidth, chartHeight, maxValue, minValue, data) {
    ctx.strokeStyle = '#E8E8E8'
    ctx.lineWidth = 0.5

    var gridLines = 5
    var range = maxValue - minValue || 1

    for (var i = 0; i <= gridLines; i++) {
      var y = padding.top + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()

      var value = maxValue - (range / gridLines) * i

      if (Math.abs(value) < 0.01) value = 0
      else if (value % 1 !== 0) value = Math.round(value * 10) / 10

      ctx.fillStyle = '#999'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      ctx.fillText(value.toString(), padding.left - 8, y)
    }
  },

  drawSmoothLineWithFill(ctx, padding, chartWidth, chartHeight, data, maxValue, minValue, colors) {
    if (data.length < 2) return

    var range = maxValue - minValue || 1

    var points = data.map(function(item, index) {
      return {
        x: padding.left + (chartWidth / (data.length - 1)) * index,
        y: padding.top + chartHeight - ((item.value - minValue) / range) * chartHeight,
        value: item.value
      }
    })

    var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, colors.gradientStart)
    gradient.addColorStop(0.5, colors.gradientStart.replace('0.4', '0.15'))
    gradient.addColorStop(1, colors.gradientEnd)

    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartHeight)

    ctx.lineTo(points[0].x, points[0].y)

    for (var i = 0; i < points.length - 1; i++) {
      var xc = (points[i].x + points[i + 1].x) / 2
      var yc = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
    ctx.closePath()

    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = colors.main
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (var j = 0; j < points.length - 1; j++) {
      var xc2 = (points[j].x + points[j + 1].x) / 2
      var yc2 = (points[j].y + points[j + 1].y) / 2
      ctx.quadraticCurveTo(points[j].x, points[j].y, xc2, yc2)
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  },

  drawXLabels(ctx, padding, chartWidth, chartHeight, data) {
    if (!data || data.length === 0) return

    ctx.fillStyle = '#666'
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    var minLabelSpacing = 45
    var maxLabels = Math.max(1, Math.floor(chartWidth / minLabelSpacing))

    var step = Math.max(1, Math.ceil(data.length / maxLabels))

    var positions = []

    for (var p = 0; p < data.length; p += step) {
      var x = padding.left + (chartWidth / (data.length - 1 || 1)) * p
      positions.push({ index: p, x: x })
    }

    var lastIndex = data.length - 1
    var lastX = padding.left + chartWidth

    if (positions.length > 0 && positions[positions.length - 1].index !== lastIndex) {
      var secondLastX = positions[positions.length - 1].x

      if (lastX - secondLastX >= minLabelSpacing * 0.8) {
        positions.push({ index: lastIndex, x: lastX })
      } else {
        if (positions.length > 1) {
          positions.pop()
          positions.push({ index: lastIndex, x: lastX })
        }
      }
    }

    positions.forEach(function(pos) {
      if (pos.index >= 0 && pos.index < data.length) {
        ctx.fillText(data[pos.index].date || '', pos.x, padding.top + chartHeight + 8)
      }
    })
  },

  getNiceNumber(range, round) {
    var exponent = Math.floor(Math.log10(range))
    var fraction = range / Math.pow(10, exponent)

    var niceFraction
    if (round) {
      if (fraction <= 1.0) niceFraction = 1
      else if (fraction <= 2.0) niceFraction = 2
      else if (fraction <= 5.0) niceFraction = 5
      else niceFraction = 10
    } else {
      if (fraction < 1.5) niceFraction = 1
      else if (fraction < 3.0) niceFraction = 2
      else if (fraction < 7.0) niceFraction = 5
      else niceFraction = 10
    }

    return niceFraction * Math.pow(10, exponent)
  },
})