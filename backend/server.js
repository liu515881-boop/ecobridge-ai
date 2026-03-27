const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 配置 multer 处理文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制 10MB
});

// 模拟 AI 识别结果
function simulateAIRecognition(filename) {
  const metalTypes = [
    { type: '铜', nameEn: 'Copper', baseConfidence: 0.92 },
    { type: '铝', nameEn: 'Aluminum', baseConfidence: 0.88 },
    { type: '铁', nameEn: 'Iron', baseConfidence: 0.85 },
    { type: '不锈钢', nameEn: 'Stainless Steel', baseConfidence: 0.90 }
  ];
  
  const impuritiesList = [
    ['锈迹'],
    ['油污'],
    ['锈迹', '油污'],
    ['塑料残留'],
    ['橡胶残留'],
    ['锈迹', '塑料残留'],
    []
  ];
  
  // 随机选择结果（实际项目中会调用 AI API）
  const randomMetal = metalTypes[Math.floor(Math.random() * metalTypes.length)];
  const randomImpurities = impuritiesList[Math.floor(Math.random() * impuritiesList.length)];
  const confidence = (randomMetal.baseConfidence + (Math.random() * 0.1 - 0.05)).toFixed(2);
  
  return {
    metalType: randomMetal.type,
    metalTypeEn: randomMetal.nameEn,
    confidence: parseFloat(confidence),
    impurities: randomImpurities,
    imageUrl: `/uploads/${filename}`,
    timestamp: new Date().toISOString()
  };
}

// API 接口：识别金属
app.post('/api/identify', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      });
    }
    
    // 模拟 AI 识别
    const result = simulateAIRecognition(req.file.filename);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('识别错误:', error);
    res.status(500).json({
      success: false,
      error: '识别失败，请稍后重试'
    });
  }
});

// 提供上传文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Ecobridge AI Backend' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 Ecobridge AI 后端服务已启动`);
  console.log(`📍 访问地址：http://localhost:${PORT}`);
  console.log(`📍 API 接口：http://localhost:${PORT}/api/identify`);
});
