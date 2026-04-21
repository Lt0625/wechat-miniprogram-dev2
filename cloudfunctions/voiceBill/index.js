// 云函数：voiceBill
// 功能：接收语音文件 fileID，调用语音识别，再解析账单信息
const cloud = require('wx-server-sdk')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ============================================================
// 账单信息解析器（正则 + 关键词匹配，无需额外AI接口）
// ============================================================

// 分类关键词映射
const CATEGORY_KEYWORDS = {
  expense: {
    '餐饮': ['吃', '饭', '餐', '早餐', '午餐', '晚餐', '宵夜', '外卖', '咖啡', '奶茶', '饮料', '食', '点餐', '火锅', '烧烤', '面', '粥', '零食', '水果', '超市'],
    '交通': ['打车', '滴滴', '出租', '地铁', '公交', '公交车', '高铁', '火车', '飞机', '机票', '加油', '停车', '骑车', '共享单车', '交通', '油费', '过路费'],
    '购物': ['买', '购', '淘宝', '京东', '拼多多', '网购', '衣服', '鞋', '包', '化妆', '日用', '家电', '手机', '电脑', '购物'],
    '娱乐': ['电影', '游戏', 'KTV', '唱歌', '健身', '运动', '旅游', '景区', '门票', '娱乐', '书', '看书'],
    '医疗': ['看病', '医院', '药', '体检', '挂号', '医疗', '治疗', '手术', '牙科', '眼科'],
    '教育': ['课', '培训', '学费', '书费', '教育', '补习', '辅导', '学习', '考试'],
    '住房': ['房租', '水费', '电费', '物业', '燃气', '网费', '话费', '住房', '租房', '房贷'],
    '其他': []
  },
  income: {
    '工资': ['工资', '薪资', '薪水', '月薪', '发工资', '领工资'],
    '奖金': ['奖金', '年终奖', '绩效', '提成', '奖励'],
    '投资': ['理财', '基金', '股票', '分红', '利息', '投资', '收益']
  }
}

// 收入关键词
const INCOME_KEYWORDS = ['收入', '收到', '到账', '发工资', '领工资', '奖金', '分红', '利息', '工资', '薪资', '赚']

/**
 * 从文字中提取金额
 * 支持：35元、35块、35.5元、35.56元、50块5毛、50块5毛钱 等
 */
function extractAmount(text) {
  // 特殊处理：35块5、35块5毛、35块5毛6、50块5毛钱 这种情况（整数和小数分开）
  // 这种格式必须优先匹配，否则会被通用模式匹配到整数部分
  // 匹配：数字 + 块/元 + 数字(毛/角) + 可选的数字(分)
  const specialPattern = /(\d+)\s*[元块]\s*(\d)\s*(?:毛|角)?\s*(\d)?\s*(?:分)?/g
  let match
  while ((match = specialPattern.exec(text)) !== null) {
    const intPart = match[1]
    const jiaoPart = match[2]  // 毛/角部分
    const fenPart = match[3]   // 分部分（可选）
    
    // 构造小数部分
    let decPart = jiaoPart
    if (fenPart) {
      decPart += fenPart
    } else {
      decPart += '0'  // 如果没有分，补零
    }
    
    const amountStr = intPart + '.' + decPart
    const amount = parseFloat(amountStr)
    if (!isNaN(amount) && amount > 0 && amount < 1000000) {
      console.log('特殊格式匹配成功:', intPart + '块' + jiaoPart + '毛' + (fenPart || '0') + '分', '=', amount)
      return parseFloat(parseFloat(amountStr).toFixed(2))
    }
  }
  
  // 通用模式：匹配正常小数格式 35.5元、35.56元、35.50元 等
  // 支持1-2位小数
  const patterns = [
    /花[了费掉]?\s*(\d+(?:\.\d{1,2}))\s*[元块钱]?/,
    /[付花消]了?\s*(\d+(?:\.\d{1,2}))/,
    /(\d+(?:\.\d{1,2}))\s*[元块钱]/,
    /[收到得赚]\s*(\d+(?:\.\d{1,2}))/,
    // 整数或只有1位小数的情况
    /(?:花[了费掉]?\s*)?(\d+(?:\.\d)?)\s*[元块钱]?/,
    /(\d+(?:\.\d)?)\s*[元块钱]?/
  ]
  
  for (const pattern of patterns) {
    const patternMatch = text.match(pattern)
    if (patternMatch) {
      const amountStr = patternMatch[1]
      // 提取实际的数字部分（去掉多余的零）
      const amount = parseFloat(amountStr)
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        console.log('通用格式匹配成功:', amountStr, '=', amount)
        // 使用 toFixed + parseFloat 确保精度
        return parseFloat(amount.toFixed(2))
      }
    }
  }
  
  // 最后兜底：提取文本中所有数字，找最大的那个
  const allNumbers = text.match(/\d+\.?\d*/g)
  if (allNumbers && allNumbers.length > 0) {
    const amounts = allNumbers.map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0 && n < 1000000)
    if (amounts.length > 0) {
      // 取最大的数字作为金额
      const maxAmount = Math.max(...amounts)
      console.log('兜底匹配成功:', maxAmount)
      return parseFloat(maxAmount.toFixed(2))
    }
  }
  
  return null
}

/**
 * 判断收支类型
 */
function extractType(text) {
  for (const keyword of INCOME_KEYWORDS) {
    if (text.includes(keyword)) return 'income'
  }
  return 'expense'
}

/**
 * 匹配分类
 */
function extractCategory(text, type) {
  const categoryMap = CATEGORY_KEYWORDS[type] || CATEGORY_KEYWORDS.expense
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (category === '其他') continue
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category
      }
    }
  }
  
  // 如果是收入但没匹配到，返回工资
  if (type === 'income') return '工资'
  
  // 支出默认返回其他
  return '其他'
}

/**
 * 提取备注（去掉金额和常见词后的剩余内容）
 * 例如："吃饭花了99" → 提取 "吃饭"
 */
function extractNotes(text) {
  // 先移除末尾的语气词和标点
  let cleanText = text
    .replace(/[，。！？、,\.!?~啦啊呃嗯哦噢的呀嘛呐啦噜啧嘻呵呸嗨嗨~哈嘿嘿]$/g, '')
    .trim()
  
  // 尝试提取：备注 + "花了" + 金额 这种模式
  // 例如："吃饭花了99" → "吃饭"
  const beforeAmountPattern = /^(.+?)\s*花[了费掉]/;
  let notes = cleanText.replace(beforeAmountPattern, '$1').trim()
  
  // 如果上面的模式没匹配到，尝试其他模式
  if (!notes || notes === cleanText) {
    // 移除常见的记账引导语
    notes = cleanText
      .replace(/今天|昨天|刚才|刚刚|帮我|记一笔|记账|一笔|条|这笔|这[笔条个]|总共|一共|合计|共/g, '')
      .trim()
  }
  
  // 移除金额相关的内容
  notes = notes
    .replace(/花[了费掉]?\s*\d+\.?\d*\s*[元块钱毛角分]*/g, '')
    .replace(/\d+\.?\d*\s*[元块钱毛角分]*/g, '')
    .replace(/[，。！？、,\.!?~]/g, '')
    .trim()
  
  // 移除"了"字开头的部分（通常不是备注）
  if (notes.startsWith('了')) {
    notes = notes.substring(1).trim()
  }
  
  // 返回有意义长度的备注（2-20个字符）
  return notes.length >= 1 && notes.length <= 20 ? notes : ''
}

/**
 * 主解析函数：将识别文字转为账单信息
 */
function parseBillFromText(text) {
  console.log('解析文字:', text)
  
  const type = extractType(text)
  const amount = extractAmount(text)
  const category = extractCategory(text, type)
  const notes = extractNotes(text)
  
  return {
    success: amount !== null,
    type,
    amount,
    category,
    notes,
    rawText: text
  }
}

// ============================================================
// 语音识别：调用微信云开发内置能力
// ============================================================

/**
 * 下载云存储文件到本地临时目录
 */
async function downloadFileFromCloud(fileID) {
  console.log('开始下载文件, fileID:', fileID)
  console.log('fileID 类型:', typeof fileID)
  console.log('fileID 长度:', fileID ? fileID.length : 'undefined')
  
  const result = await cloud.downloadFile({ fileID })
  console.log('下载结果 keys:', result ? Object.keys(result) : 'null')
  
  if (!result) {
    console.error('downloadFile 返回 null')
    throw new Error('音频文件下载失败：返回为空')
  }
  
  console.log('fileContent 类型:', typeof result.fileContent)
  console.log('fileContent 是否存在:', !!result.fileContent)
  
  if (!result.fileContent) {
    console.error('文件内容为空')
    throw new Error('音频文件下载失败：内容为空')
  }
  
  console.log('文件大小:', result.fileContent.length, 'bytes')
  return result.fileContent  // Buffer
}

/**
 * 调用腾讯云 ASR（语音识别）HTTP API
 * 需要配置 SecretId 和 SecretKey
 */
async function recognizeSpeech(fileID) {
  try {
    // 下载音频文件
    const fileBuffer = await downloadFileFromCloud(fileID)
    
    console.log('fileBuffer 类型:', typeof fileBuffer)
    console.log('fileBuffer 长度:', fileBuffer ? fileBuffer.length : 'null')
    
    // 将 Buffer 转为 base64
    const audioBase64 = fileBuffer.toString('base64')
    
    console.log('audioBase64 长度:', audioBase64 ? audioBase64.length : 'null')
    console.log('audioBase64 前100字符:', audioBase64 ? audioBase64.substring(0, 100) : 'null')
    
    if (!audioBase64 || audioBase64.length === 0) {
      throw new Error('audio data empty - base64 编码为空')
    }
    
    // 调用腾讯云 ASR API
    const result = await callTencentASR(audioBase64)
    
    console.log('ASR 返回结果:', result)
    
    if (result && result.Result) {
      // 只要有识别结果就返回，即使是短音频
      const recognizedText = result.Result.trim()
      console.log('识别到的文字:', recognizedText)
      return { success: true, text: recognizedText }
    }
    
    throw new Error('ASR 识别返回为空: ' + JSON.stringify(result))
    
  } catch (error) {
    console.error('语音识别失败:', error)
    
    return {
      success: false,
      error: 'speech_recognition_failed',
      message: '语音识别失败: ' + (error.message || '未知错误')
    }
  }
}

/**
 * 调用腾讯云 ASR API
 * 使用 tencentcloud-sdk-nodejs 简化调用
 */
async function callTencentASR(audioBase64) {
  // 腾讯云 API 配置
  const secretId = process.env.TENCENT_SECRET_ID || ''
  const secretKey = process.env.TENCENT_SECRET_KEY || ''
  
  if (!secretId || !secretKey) {
    throw new Error('未配置腾讯云 SecretId/SecretKey')
  }
  
  // 使用腾讯云 Node.js SDK
  const AsrClient = require('tencentcloud-sdk-nodejs').asr.v20190614.Client
  
  const clientConfig = {
    credential: {
      secretId: secretId,
      secretKey: secretKey,
    },
    region: 'ap-guangzhou',
    profile: {
      httpProfile: {
        endpoint: 'asr.tencentcloudapi.com',
      },
    },
  }
  
  const client = new AsrClient(clientConfig)
  
  // 原始音频数据长度
  const originalBuffer = Buffer.from(audioBase64, 'base64')
  const dataLen = originalBuffer.length
  
  console.log('原始音频长度:', dataLen, 'bytes')
  console.log('发送的 audioBase64 长度:', audioBase64.length)
  
  // 自动检测音频格式
  let voiceFormat = 'wav'  // 默认
  const fileHeader = originalBuffer.slice(0, 64).toString('hex')
  console.log('文件头(hex):', fileHeader)
  
  // 检测 WebM 容器格式 (微信小程序录音实际生成这种格式，内部是 Opus 编码)
  // 腾讯云 ASR 使用 ogg-opus 格式
  if (fileHeader.startsWith('1a45dfa3')) {
    voiceFormat = 'ogg-opus'
    console.log('检测到 WebM 容器格式 (使用 ogg-opus)')
  }
  // 检测 Opus 编码 (WebM/Opus 文件头特征)
  else if (fileHeader.startsWith('474f5047') || fileHeader.includes('4f707573')) {
    voiceFormat = 'ogg-opus'
    console.log('检测到 Opus 编码格式 (使用 ogg-opus)')
  }
  // 检测 MP3 (ID3 标签或 MP3 帧)
  else if (fileHeader.startsWith('494433') || fileHeader.startsWith('fffa') || fileHeader.startsWith('fffb')) {
    voiceFormat = 'mp3'
    console.log('检测到 MP3 格式')
  }
  // 检测 WAV (RIFF 头)
  else if (fileHeader.startsWith('52494646')) {
    voiceFormat = 'wav'
    console.log('检测到 WAV 格式')
  }
  // 检测 PCM (纯原始数据，无明显格式头)
  else {
    voiceFormat = 'pcm'
    console.log('使用 PCM 格式')
  }
  
  const params = {
    ProjectId: 0,
    SubServiceType: 2,  // 一句话识别
    EngSerViceType: '16k_zh',  // 16k 中文普通话
    SourceType: 1,  // 1: 语音数据
    VoiceFormat: voiceFormat,  // 自动检测的格式
    Data: audioBase64,
    DataLen: dataLen
  }
  
  console.log('========== ASR 调用参数 ==========')
  console.log('VoiceFormat:', params.VoiceFormat)
  console.log('DataLen:', params.DataLen)
  console.log('EngSerViceType:', params.EngSerViceType)
  console.log('SubServiceType:', params.SubServiceType)
  console.log('===================================')
  
  const result = await client.SentenceRecognition(params)
  
  console.log('ASR 返回结果:', JSON.stringify(result, null, 2))
  
  return result
}

// ============================================================
// 云函数主入口
// ============================================================
exports.main = async (event, context) => {
  const { fileID, action } = event
  
  console.log('云函数接收参数:', JSON.stringify(event, null, 2))
  console.log('云函数运行环境:', context)
  
  // action=parse_text：直接解析文字（用于测试）
  if (action === 'parse_text') {
    const { text } = event
    if (!text) {
      return { success: false, error: '缺少 text 参数' }
    }
    return parseBillFromText(text)
  }
  
  // 默认：语音识别 + 解析
  if (!fileID) {
    console.error('fileID 为空或未定义')
    return { success: false, error: '缺少 fileID 参数' }
  }
  
  try {
    // Step 1: 语音识别
    console.log('开始语音识别, fileID:', fileID)
    const asrResult = await recognizeSpeech(fileID)
    
    if (!asrResult.success) {
      return {
        success: false,
        error: asrResult.error || 'recognition_failed',
        message: asrResult.message || '语音识别失败'
      }
    }
    
    console.log('识别结果:', asrResult.text)
    
    // Step 2: 解析账单信息
    const billInfo = parseBillFromText(asrResult.text)
    
    return {
      success: true,
      recognizedText: asrResult.text,
      bill: billInfo
    }
    
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      success: false,
      error: 'internal_error',
      message: error.message || '服务器内部错误'
    }
  }
}
