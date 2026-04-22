# Flutter 轻量记账 APP - 简历项目经历

> 📌 本文档为 Flutter 轻量记账 APP 的完整项目经历，适用于前端/移动端开发岗位简历。包含项目概述、技术栈、核心功能实现、踩坑经验等，供参考直接复制使用。

---

## 一、项目概述

### 1.1 项目基本信息

| 项目信息 | 内容 |
|---------|------|
| 📱 项目名称 | 便捷记账（Flutter 轻量记账 APP） |
| 🛠 技术栈 | Flutter + Dart + Hive + Provider |
| 📦 平台 | Android 8.0+ / iOS 12.0+ |
| 🔗 GitHub | https://github.com/Lt0625/flutter-ltjz |
| 📂 本地路径 | `C:/LTjz.app` |
| 📅 开发周期 | 2026年4月 |

### 1.2 项目定位

📌 **一款轻量、简洁、易用的个人记账工具**

- **核心价值**：便捷记账 3 步完成、数据清晰直观、本地安全无广告
- **目标用户**：个人用户日常记账需求
- **开发边界**：MVP 版本，纯本地存储，无后端依赖，聚焦核心功能

### 1.3 核心功能矩阵

| 功能模块 | 页面 | 完成度 | 技术亮点 |
|---------|------|--------|---------|
| 📊 首页（账本页） | home_page.dart | ✅ 100% | 账单列表、收支汇总、预算管理 |
| 📅 日历页 | calendar_page.dart | ✅ 100% | 月历视图、日期筛选、快速记账 |
| 💳 资产账户页 | account_page.dart | ✅ 100% | 多账户管理、净资产计算 |
| 📈 统计分析页 | statistics_page.dart | ✅ 100% | 折线图 + 饼图、周期筛选 |
| ⚙️ 设置页 | settings_page.dart | ✅ 100% | 主题切换、数据管理 |
| ➕ 添加账单页 | add_bill_page.dart | ✅ 100% | 表单验证、编辑模式 |
| 🏦 账户管理页 | add_account_page.dart | ✅ 100% | CRUD、账户类型分类 |
| 🏷️ 分类管理页 | category_management_page.dart | ✅ 100% | 自定义分类、图标选择 |
| 📦 数据管理页 | data_management_page.dart | ✅ 100% | JSON 导入导出、数据清空 |

---

## 二、技术栈详解

### 2.1 核心依赖

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  
  # UI 组件
  cupertino_icons: ^1.0.8          # iOS 风格图标
  
  # 图表
  fl_chart: ^0.68.0                # 📌 收支统计折线图 + 饼图
  
  # 工具库
  intl: ^0.20.2                    # 📌 日期/金额格式化
  path_provider: ^2.1.3            # 📌 获取应用目录（Hive 存储路径）
  
  # 本地存储
  hive: ^2.2.3                     # 📌 核心存储方案（轻量级 NoSQL）
  hive_flutter: ^1.1.0             # 📌 Hive Flutter 适配
  
  # 状态管理
  provider: ^6.1.1                # 📌 主题切换状态管理
  
  # 文件操作
  image_picker: ^0.8.9             # 图片选择
  file_picker: ^8.0.0              # 📌 JSON 数据导入

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
  build_runner: ^2.4.6             # Hive 适配器生成
  hive_generator: ^2.0.1           # Hive TypeAdapter 生成
```

### 2.2 技术选型理由

| 技术 | 选型理由 | 替代方案 |
|------|---------|---------|
| **Flutter** | 跨平台（Android/iOS 一套代码）、性能接近原生、开发效率高 | React Native、uni-app |
| **Hive** | 轻量级 NoSQL、无需配置、性能出色、移动端友好 | SQLite、shared_preferences |
| **Provider** | Flutter 官方推荐、轻量、学习成本低、够用 | Riverpod、Bloc、GetX |
| **fl_chart** | Flutter 生态最完善的图表库、折线图 + 饼图支持好 | syncfusion_flutter_charts |

### 2.3 Flutter vs 微信小程序对比

| 维度 | Flutter | 微信小程序 |
|------|---------|-----------|
| 📦 包体积 | ~25MB（release） | ~2MB |
| ⚡ 性能 | 接近原生 | 依赖 WebView/原生组件 |
| 🎨 UI 自由度 | 完全自定义 | 受限于组件库 |
| 📱 平台覆盖 | Android/iOS/Web/桌面 | 仅微信生态 |
| 🔧 开发工具 | Android Studio / VS Code | 微信开发者工具 |
| 📊 生态 | pub.dev 百万包 | npm / 小程序生态 |

---

## 三、代码架构

### 3.1 项目目录结构

```
lib/
├── main.dart                    # 📌 入口文件、Provider 初始化、主题配置
├── models/                      # 📌 数据模型（JSON 序列化）
│   ├── index.dart              # 统一导出
│   ├── bill.dart               # 账单模型
│   ├── account.dart            # 账户模型
│   ├── category.dart           # 分类模型
│   └── user_profile.dart       # 用户配置模型
├── pages/                      # 📌 页面组件
│   ├── index.dart              # 统一导出
│   ├── main_page.dart          # 底部 Tab 导航
│   ├── home_page.dart          # 首页（账单列表）
│   ├── calendar_page.dart       # 日历页
│   ├── account_page.dart       # 资产账户页
│   ├── statistics_page.dart     # 统计分析页
│   ├── settings_page.dart       # 设置页
│   ├── add_bill_page.dart       # 添加/编辑账单
│   ├── add_account_page.dart    # 添加/编辑账户
│   ├── category_management_page.dart  # 分类管理
│   ├── data_management_page.dart      # 数据管理
│   ├── profile_page.dart        # 个人中心
│   └── splash_screen.dart       # 启动页
├── storage/                    # 📌 本地存储服务
│   ├── index.dart              # 统一导出
│   └── storage_service.dart     # Hive CRUD 操作
└── utils/                      # 工具类
    └── theme_notifier.dart      # 📌 主题状态管理（Provider）
```

### 3.2 数据模型设计

#### 账单模型（Bill）

```dart
class Bill {
  final String id;           // 唯一标识（时间戳生成）
  final String type;         // 收支类型：income / expense
  final double amount;       // 金额，保留两位小数
  final String category;     // 收支分类（关联 Category.name）
  final String account;      // 资产账户（关联 Account.name）
  final String note;         // 备注，可选，默认空字符串
  final DateTime createTime; // 记录创建时间
  final bool isExpense;      // 是否为支出

  // JSON 序列化
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'amount': amount,
    'category': category,
    'account': account,
    'note': note,
    'createTime': createTime.toIso8601String(),
    'isExpense': isExpense,
  };

  // JSON 反序列化
  factory Bill.fromJson(Map<String, dynamic> json) => Bill(
    id: json['id'],
    type: json['type'],
    amount: json['amount'],
    category: json['category'],
    account: json['account'],
    note: json['note'] ?? '',
    createTime: DateTime.parse(json['createTime']),
    isExpense: json['isExpense'],
  );
}
```

#### 账户模型（Account）

```dart
class Account {
  final String id;        // 唯一标识
  final String name;      // 账户名称
  final double balance;   // 账户余额（可负数，如花呗）
  final String type;      // 账户类型：cash/debit/credit/investment

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'balance': balance,
    'type': type,
  };

  factory Account.fromJson(Map<String, dynamic> json) => Account(
    id: json['id'],
    name: json['name'],
    balance: (json['balance'] as num).toDouble(),
    type: json['type'],
  );
}
```

#### 分类模型（Category）

```dart
class Category {
  final String id;      // 唯一标识
  final String name;    // 分类名称
  final String icon;    // Flutter 内置图标名
  final bool isExpense; // 是否为支出分类

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'icon': icon,
    'isExpense': isExpense,
  };

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'],
    name: json['name'],
    icon: json['icon'],
    isExpense: json['isExpense'],
  );
}
```

### 3.3 存储服务设计（StorageService）

```dart
class StorageService {
  // Box 名称常量
  static const String billsBox = 'bills';
  static const String accountsBox = 'accounts';
  static const String categoriesBox = 'categories';
  static const String settingsBox = 'settings';
  static const String userProfileBox = 'userProfile';

  // 初始化 Hive
  static Future<void> initialize() async {
    final Directory appDir = await getApplicationDocumentsDirectory();
    Hive.init(appDir.path);
  }

  // 打开所有 Box
  static Future<void> openBoxes() async {
    await Hive.openBox(billsBox);
    await Hive.openBox(accountsBox);
    await Hive.openBox(categoriesBox);
    await Hive.openBox(settingsBox);
    await Hive.openBox(userProfileBox);
  }

  // 账单 CRUD
  static Future<void> saveBills(List<Bill> bills) async {
    final box = Hive.box(billsBox);
    await box.put('list', bills.map((b) => b.toJson()).toList());
  }

  static Future<List<Bill>> getBills() async {
    final box = Hive.box(billsBox);
    final billsList = box.get('list', defaultValue: []);
    return (billsList as List).map((bill) {
      return Bill.fromJson(Map<String, dynamic>.from(bill));
    }).toList();
  }

  // 账户 CRUD
  static Future<void> saveAccounts(List<Account> accounts) async { ... }
  static Future<List<Account>> getAccounts() async { ... }

  // 分类 CRUD
  static Future<void> saveCategories(List<Category> categories) async { ... }
  static Future<List<Category>> getCategories() async { ... }

  // 预算管理
  static Future<void> saveBudget(String monthKey, double budget) async {
    final box = Hive.box(settingsBox);
    await box.put('budget_$monthKey', budget);
  }

  // 初始化默认数据
  static Future<void> initializeDefaultData() async {
    // 8 个支出分类 + 5 个收入分类
    // 5 个默认账户（微信钱包、支付宝、现金、银行卡、花呗）
  }
}
```

### 3.4 主题状态管理（Provider）

```dart
class ThemeNotifier extends ChangeNotifier {
  bool _isDarkMode = false;
  bool get isDarkMode => _isDarkMode;

  ThemeNotifier() {
    _loadThemeFromStorage();
  }

  // 切换主题并持久化
  Future<void> toggleTheme() async {
    _isDarkMode = !_isDarkMode;
    final box = await Hive.openBox('settings');
    await box.put('isDarkMode', _isDarkMode);
    notifyListeners();
  }

  // 浅色主题（暖黄色系）
  ThemeData get lightTheme => ThemeData(
    primaryColor: Color(0xFFFFC107),
    scaffoldBackgroundColor: Color(0xFFF8F9FA),
    appBarTheme: AppBarTheme(
      backgroundColor: Color(0xFFFFC107),
      foregroundColor: Colors.black87,
    ),
    useMaterial3: false,
  );

  // 深色主题
  ThemeData get darkTheme => ThemeData(
    primaryColor: Color(0xFFFFC107),
    scaffoldBackgroundColor: Color(0xFF121212),
    appBarTheme: AppBarTheme(
      backgroundColor: Color(0xFF1E1E1E),
      foregroundColor: Colors.white,
    ),
    useMaterial3: false,
  );
}
```

### 3.5 应用入口（main.dart）

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Hive 初始化
  await StorageService.initialize();
  await StorageService.openBoxes();
  await StorageService.initializeDefaultData();
  await initializeDateFormatting('zh_CN', null);

  runApp(
    ChangeNotifierProvider(
      create: (context) => ThemeNotifier(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = Provider.of<ThemeNotifier>(context);

    return MaterialApp(
      title: '便捷记账',
      theme: themeNotifier.lightTheme,
      darkTheme: themeNotifier.darkTheme,
      themeMode: themeNotifier.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      locale: const Locale('zh', 'CN'),
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const SplashScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
```

---

## 四、核心功能实现

### 4.1 首页（HomePage）

#### 功能特点
- 📊 **顶部数据卡片**：本周/本月总收入、总支出、净余额、日均消费
- 📋 **账单列表**：按日期倒序分组，支持下拉刷新
- 💰 **快速记账按钮**：右下角悬浮按钮，支持拖拽吸附边缘
- 📅 **日期切换**：本周/本月数据切换

#### 关键代码片段

```dart
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  List<Bill> _bills = [];
  Map<String, List<Bill>> _groupedBills = {};
  double _weekExpense = 0.0;
  double _monthExpense = 0.0;
  double _monthIncome = 0.0;
  double _dailyAverage = 0.0;
  double _monthBudget = 0.0;
  String _selectedPeriod = 'week';

  Future<void> _loadData() async {
    final bills = await StorageService.getBills();
    final budget = await StorageService.getBudget(monthKey);
    setState(() {
      _bills = bills;
      _monthBudget = budget;
      _calculateStatistics();
      _groupBillsByDate();
    });
  }

  void _groupBillsByDate() {
    _groupedBills = {};
    for (var bill in _bills) {
      final dateKey = DateFormat('yyyy-MM-dd').format(bill.createTime);
      if (!_groupedBills.containsKey(dateKey)) {
        _groupedBills[dateKey] = [];
      }
      _groupedBills[dateKey]!.add(bill);
    }
  }
}
```

#### 悬浮按钮拖拽吸附效果

```dart
void _snapToEdge(Offset currentPosition, Size screenSize) {
  double targetX;
  double targetY = currentPosition.dy;

  // 吸附到左边或右边
  if (currentPosition.dx < screenSize.width / 2) {
    targetX = 16;
  } else {
    targetX = screenSize.width - 48 - 16;
  }

  // Y 轴范围限制
  targetY = targetY.clamp(100, screenSize.height - 200);

  _animation = Tween<Offset>(
    begin: currentPosition,
    end: Offset(targetX, targetY),
  ).animate(CurvedAnimation(
    parent: _animationController,
    curve: Curves.easeOutCubic,
  ));

  _animationController.reset();
  _animationController.forward();
}
```

---

### 4.2 日历页（CalendarPage）

#### 功能特点
- 📅 **月历视图**：展示当前月份，左右滑动切换月份
- 🟢🔴 **收支标记**：有收支的日期显示绿点/红点
- 📋 **日期详情**：点击日期展开该日账单列表
- ➕ **快速记账**：悬浮按钮支持日期预设

#### 月历布局实现

```dart
// 构建月历网格
GridView.builder(
  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 7,  // 7 列（周日~周六）
    childAspectRatio: 1,
  ),
  itemCount: _daysInMonth + _firstDayWeekday,
  itemBuilder: (context, index) {
    if (index < _firstDayWeekday) {
      return const SizedBox();
    }
    final day = index - _firstDayWeekday + 1;
    final dateStr = '$_currentYear-${_currentMonth.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
    final hasExpense = _billsByDate[dateStr]?.any((b) => b.isExpense) ?? false;
    final hasIncome = _billsByDate[dateStr]?.any((b) => !b.isExpense) ?? false;

    return GestureDetector(
      onTap: () => _selectDate(dateStr),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('$day', style: TextStyle(isToday ? FontWeight.bold : null)),
          if (hasExpense) Container(
            width: 6, height: 6,
            margin: EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
            ),
          ),
          if (hasIncome) Container(
            width: 6, height: 6,
            margin: EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  },
)
```

---

### 4.3 统计分析页（StatisticsPage）

#### 功能特点
- 📊 **周期筛选**：日/周/月/自定义周期
- 📈 **收支折线图**：fl_chart 绘制每日收支走势
- 🥧 **支出饼图**：各分类占比展示
- 📋 **数据汇总**：总收入、总支出、净余额

#### fl_chart 折线图实现

```dart
// 收支折线图
LineChart(
  LineChartData(
    gridData: FlGridData(show: true),
    titlesData: FlTitlesData(
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 40,
          getTitlesWidget: (value, meta) {
            return Text('¥${value.toInt()}',
              style: TextStyle(fontSize: 10));
          },
        ),
      ),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (value, meta) {
            final index = value.toInt();
            if (index >= 0 && index < _dateLabels.length) {
              return Text(_dateLabels[index],
                style: TextStyle(fontSize: 10));
            }
            return Text('');
          },
        ),
      ),
    ),
    borderData: FlBorderData(show: false),
    lineBarsData: [
      // 收入线（绿色）
      LineChartBarData(
        spots: _incomeSpots,
        isCurved: true,
        color: Colors.green,
        barWidth: 2,
        dotData: FlDotData(show: false),
      ),
      // 支出线（红色）
      LineChartBarData(
        spots: _expenseSpots,
        isCurved: true,
        color: Colors.red,
        barWidth: 2,
        dotData: FlDotData(show: false),
      ),
    ],
  ),
)
```

#### fl_chart 饼图实现

```dart
// 支出分类饼图
PieChart(
  PieChartData(
    sections: _categoryExpenses.entries.map((entry) {
      final total = _categoryExpenses.values.reduce((a, b) => a + b);
      final percentage = (entry.value / total * 100).toStringAsFixed(1);
      return PieChartSectionData(
        value: entry.value,
        title: '$percentage%',
        color: _getCategoryColor(entry.key),
        radius: 80,
        titleStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList(),
    sectionsSpace: 2,
    centerSpaceRadius: 40,
  ),
)
```

---

### 4.4 添加账单页（AddBillPage）

#### 功能特点
- 💵 **金额输入**：数字键盘，自动保留两位小数
- 🏷️ **分类选择**：支持筛选支出/收入分类
- 🏦 **账户选择**：从预设账户中选择
- 📝 **备注输入**：可选，最多 50 字符
- 📅 **日期选择**：默认当天，不支持未来日期
- ✏️ **编辑模式**：复用同一页面，支持编辑已有账单

#### 表单验证逻辑

```dart
Future<void> _saveBill() async {
  // 金额验证
  if (_amount <= 0) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('请输入有效的金额')),
    );
    return;
  }

  // 分类验证
  if (_category.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('请选择分类')),
    );
    return;
  }

  // 账户验证
  if (_account.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('请选择账户')),
    );
    return;
  }

  // 构建账单对象
  final bill = Bill(
    id: widget.bill?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
    type: _isExpense ? 'expense' : 'income',
    amount: _amount,
    category: _category,
    account: _account,
    note: _note,
    createTime: _selectedDate,
    isExpense: _isExpense,
  );

  // 保存到 Hive
  final bills = await StorageService.getBills();
  if (widget.bill != null) {
    // 编辑模式：替换原有账单
    final index = bills.indexWhere((b) => b.id == widget.bill!.id);
    if (index != -1) {
      bills[index] = bill;
    }
  } else {
    // 新增模式：添加到列表
    bills.insert(0, bill);
  }
  await StorageService.saveBills(bills);

  if (mounted) {
    Navigator.pop(context, true);  // 返回上一页并刷新
  }
}
```

---

### 4.5 资产账户页（AccountPage）

#### 功能特点
- 💰 **净资产计算**：总资产 - 总负债
- 📋 **账户列表**：展示所有账户及余额
- 🏷️ **账户分类筛选**：全部/现金/银行卡/信用类/投资类
- ➕ **添加账户**：跳转添加页面
- ✏️ **编辑账户**：点击账户进入编辑

#### 净资产计算逻辑

```dart
Future<void> _loadData() async {
  final accounts = await StorageService.getAccounts();
  double totalAsset = 0.0;
  double totalLiability = 0.0;

  for (var account in accounts) {
    if (account.balance >= 0) {
      totalAsset += account.balance;
    } else {
      totalLiability += account.balance.abs();  // 花呗等负余额计入负债
    }
  }

  setState(() {
    _accounts = accounts;
    _totalAsset = totalAsset;
    _totalLiability = totalLiability;
    _netAsset = totalAsset - totalLiability;  // 净资产
  });
}
```

---

### 4.6 主题切换功能

#### 功能特点
- 🌙 **浅色/深色模式**：一键切换，全局生效
- 💾 **持久化存储**：重启 APP 保持主题设置
- 🎨 **暖黄色主色调**：统一品牌色 #FFC107

#### 实现方式（Provider + Hive）

```dart
// main.dart
runApp(
  ChangeNotifierProvider(
    create: (context) => ThemeNotifier(),
    child: const MyApp(),
  ),
);

// settings_page.dart
class _SettingsPageState extends State<SettingsPage> {
  @override
  Widget build(BuildContext context) {
    final themeNotifier = Provider.of<ThemeNotifier>(context);

    return Switch(
      value: themeNotifier.isDarkMode,
      onChanged: (value) {
        themeNotifier.toggleTheme();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(value ? '已切换至深色主题' : '已切换至浅色主题'),
          ),
        );
      },
      activeColor: Color(0xFFFFC107),
    );
  }
}
```

---

## 五、数据导入导出

### 5.1 JSON 导出

```dart
Future<void> _exportData() async {
  final bills = await StorageService.getBills();
  final accounts = await StorageService.getAccounts();
  final categories = await StorageService.getCategories();

  final exportData = {
    'version': '1.0',
    'exportTime': DateTime.now().toIso8601String(),
    'bills': bills.map((b) => b.toJson()).toList(),
    'accounts': accounts.map((a) => a.toJson()).toList(),
    'categories': categories.map((c) => c.toJson()).toList(),
  };

  final jsonString = jsonEncode(exportData);

  // 使用 file_picker 选择保存路径
  final result = await FilePicker.platform.saveFile(
    dialogTitle: '保存备份文件',
    fileName: 'juji_backup_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.json',
    type: FileType.custom,
    allowedExtensions: ['json'],
  );

  if (result != null) {
    final file = File(result);
    await file.writeAsString(jsonString);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('备份成功')),
      );
    }
  }
}
```

### 5.2 JSON 导入

```dart
Future<void> _importData() async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: ['json'],
  );

  if (result != null && result.files.single.path != null) {
    try {
      final file = File(result.files.single.path!);
      final jsonString = await file.readAsString();
      final data = jsonDecode(jsonString);

      // 解析并保存账单
      final bills = (data['bills'] as List)
          .map((b) => Bill.fromJson(b))
          .toList();
      await StorageService.saveBills(bills);

      // 解析并保存账户
      final accounts = (data['accounts'] as List)
          .map((a) => Account.fromJson(a))
          .toList();
      await StorageService.saveAccounts(accounts);

      // 解析并保存分类
      final categories = (data['categories'] as List)
          .map((c) => Category.fromJson(c))
          .toList();
      await StorageService.saveCategories(categories);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('导入成功')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('导入失败，请选择正确的 JSON 文件')),
        );
      }
    }
  }
}
```

---

## 六、默认数据配置

### 6.1 支出分类（8个）

| ID | 名称 | 图标 | 说明 |
|----|------|------|------|
| 1 | 餐饮 | fastfood | 餐饮消费 |
| 2 | 交通 | directions_car | 出行交通 |
| 3 | 购物 | shopping_cart | 购物消费 |
| 4 | 娱乐 | sports_esports | 游戏娱乐 |
| 5 | 医疗 | local_hospital | 医疗健康 |
| 6 | 教育 | school | 教育学习 |
| 7 | 住房 | home | 房租物业 |
| 8 | 其他 | more_horiz | 其它支出 |

### 6.2 收入分类（5个）

| ID | 名称 | 图标 | 说明 |
|----|------|------|------|
| 9 | 工资 | account_balance_wallet | 工资收入 |
| 10 | 奖金 | card_giftcard | 奖金红包 |
| 11 | 投资 | trending_up | 投资收益 |
| 12 | 兼职 | work | 兼职外快 |
| 13 | 其他 | more_horiz | 其它收入 |

### 6.3 默认账户（5个）

| ID | 名称 | 类型 | 初始余额 |
|----|------|------|---------|
| 1 | 微信钱包 | cash（现金） | ¥0.00 |
| 2 | 支付宝 | cash（现金） | ¥0.00 |
| 3 | 现金 | cash（现金） | ¥0.00 |
| 4 | 银行卡 | debit（借记卡） | ¥0.00 |
| 5 | 花呗 | credit（信用类） | ¥0.00 |

---

## 七、UI/UX 设计规范

### 7.1 色彩规范

| 颜色 | 色值 | 用途 |
|------|------|------|
| 📌 主色调 | #FFC107 | 导航栏、按钮、主题色 |
| 🔴 支出色 | #F44336 | 支出金额、支出标记 |
| 🟢 收入色 | #4CAF50 | 收入金额、收入标记 |
| ⚪ 白色 | #FFFFFF | 卡片背景、深色模式文字 |
| ⚫ 黑色 | #333333 | 浅色模式正文 |
| 🔵 深色背景 | #121212 | 深色模式背景 |
| 🎨 深色卡片 | #1E1E1E | 深色模式卡片 |

### 7.2 布局规范

- **圆角半径**：8px
- **内边距**：16px
- **外边距**：8px
- **卡片式布局**：阴影 + 圆角
- **间距均匀**：避免内容拥挤

### 7.3 字体规范

| 元素 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| 页面标题 | 18px | 加粗 | #333333 |
| 正文 | 16px | 正常 | #333333 |
| 辅助文字 | 14px | 正常 | #999999 |
| 金额 | 16px | 加粗 | 支出红/收入绿 |

---

## 八、Flutter 踩坑经验

### 8.1 Hive 存储

| 坑 | 解决方案 |
|----|---------|
| ⚠️ Hive 需要初始化 | 在 main() 中 `await Hive.init(appDir.path)` |
| ⚠️ Box 需要打开才能用 | `await Hive.openBox('xxx')` |
| ⚠️ Map 类型转换 | `Map<String, dynamic>.from(json)` |
| ⚠️ 数字类型精度 | `(json['balance'] as num).toDouble()` |

### 8.2 Provider 状态管理

| 坑 | 解决方案 |
|----|---------|
| ⚠️ 主题状态跨页面不生效 | ChangeNotifierProvider 包裹 MaterialApp |
| ⚠️ 状态更新后 UI 不刷新 | 调用 `notifyListeners()` |
| ⚠️ 首次加载主题闪烁 | 同步读取 Hive 中的主题设置 |

### 8.3 fl_chart 图表

| 坑 | 解决方案 |
|----|---------|
| ⚠️ 饼图 label 溢出 | 设置 `centerSpaceRadius` |
| ⚠️ 折线图数据点太多卡顿 | 限制数据点数量，按日/周聚合 |
| ⚠️ Y 轴 label 被截断 | 设置 `reservedSize: 40` |

### 8.4 日期/国际化

| 坑 | 解决方案 |
|----|---------|
| ⚠️ 中文日期格式化 | `intl: ^0.20.2` + `initializeDateFormatting('zh_CN')` |
| ⚠️ 月份第一天是周几 | `DateTime(firstDayOfMonth).weekday` |

### 8.5 文件操作

| 坑 | 解决方案 |
|----|---------|
| ⚠️ file_picker 路径为空 | 检查 `result.files.single.path` |
| ⚠️ JSON 解析失败 | try-catch 包裹 + 友好提示 |

---

## 九、简历关键词速查表

| 📌 关键词 | 重要程度 | 出现位置 |
|---------|---------|---------|
| Flutter | ⭐⭐⭐ | 标题、技术栈 |
| Hive | ⭐⭐⭐ | 存储方案 |
| Provider | ⭐⭐ | 状态管理 |
| fl_chart | ⭐⭐ | 图表实现 |
| 本地存储 | ⭐⭐ | 数据持久化 |
| 跨平台开发 | ⭐⭐ | Android + iOS |
| Material Design | ⭐ | UI 规范 |
| JSON 导入导出 | ⭐ | 数据管理 |
| 主题切换 | ⭐ | 深色模式 |
| 响应式设计 | ⭐ | 多机型适配 |

---

## 十、面试问答要点

### Q1: 为什么选择 Flutter 而不是 React Native？

**回答要点**：
- Flutter 性能更接近原生（Skia 渲染），RN 依赖 WebView
- Flutter 一套代码覆盖 Android/iOS/Web/桌面
- Flutter 生态成熟度提升，fl_chart 等库完善
- 个人项目，试错成本可控

### Q2: 为什么选择 Hive 而不是 SQLite？

**回答要点**：
- Hive 是纯 Dart 实现，无需原生桥接，性能更好
- SQLite 需要配置，适合复杂关系型数据
- 本项目只需 Key-Value 存储，Hive 更轻量
- Hive 支持 Flutter，有官方适配包

### Q3: 为什么选择 Provider 而不是 Bloc？

**回答要点**：
- Provider 是 Flutter 官方推荐，学习成本低
- 本项目状态管理简单（主要是主题切换），Provider 够用
- Bloc 适合复杂状态机场景，属于过度设计
- Provider 配合 ChangeNotifier 足够满足需求

### Q4: 如何实现深色模式？

**回答要点**：
- 使用 Provider 管理主题状态
- ThemeData 定义浅色/深色两套主题
- MaterialApp 的 theme/darkTheme 参数切换
- Hive 持久化存储主题偏好

---

## 十一、简历加分项 ⭐

| 加分项 | 说明 | 获取方式 |
|--------|------|----------|
| 📌 **GitHub 项目链接** | 完整代码仓库展示 | 发布到 GitHub |
| 📌 **演示 Demo** | APP 安装包/截图 | Android APK / iOS TestFlight |
| 📌 **技术博客** | 开发踩坑记录 | 掘金/知乎/CSDN |

---

## 十二、后续优化方向

1. **云同步功能**：Firebase / 野狗实时数据库同步
2. **预算管理**：每月预算设置 + 超支提醒
3. **数据导出**：支持 Excel/CSV 格式
4. **多语言支持**：中英文切换
5. **Widget**：iOS/Android 桌面小组件
6. **自动化测试**：flutter_test 单元测试 + 集成测试

---

> 📌 **简历使用建议**：
> 1. 根据应聘岗位调整技术栈描述优先级
> 2. 突出 Flutter 跨平台开发能力
> 3. 强调本地存储（Hive）实战经验
> 4. 量化成果：完成 5 个核心页面、100% 功能覆盖
