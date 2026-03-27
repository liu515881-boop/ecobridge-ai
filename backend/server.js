require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = 3000;

// 通义千问 VL API 配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_VL_MODEL = 'qwen-vl-max-latest';

if (!DASHSCOPE_API_KEY) {
  console.error('❌ 错误：未找到 DASHSCOPE_API_KEY，请检查 .env 文件');
  process.exit(1);
}

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

// 将图片转换为 Base64
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
}

// 调用通义千问 VL API 识别金属
async function callQwenVL(imagePath) {
  const imageBase64 = imageToBase64(imagePath);
  const imageMimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;
  
  // 构建 prompt，包含金属特征描述
  const prompt = `你是专业的废金属识别专家。请仔细识别图片中的金属材料。

金属特征参考：
- 铜：红褐色或紫红色，有金属光泽
- 铝：银白色，轻质，不易生锈
- 铁：灰黑色或深灰色，容易生锈（黄褐色锈迹）
- 不锈钢：亮银色，表面光滑，不易生锈

如果图片里有多种金属，只回答最主要的那个。

只输出一个 JSON 对象，不要有其他文字：
{
  "metalType": "铜/铝/铁/不锈钢/其他",
  "confidence": 0-100 的数字，
  "impurities": ["杂质 1", "杂质 2"] 或 [],
  "reason": "判断依据简要说明"
}`;

  try {
    const requestBody = {
      model: QWEN_VL_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    };

    console.log('📤 发送请求到通义千问 VL API...');
    console.log('请求模型:', QWEN_VL_MODEL);
    console.log('请求体:', JSON.stringify(requestBody, null, 2).substring(0, 500) + '...');
    
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('📥 通义千问返回原始内容:');
    console.log(content);
    console.log('完整响应:', JSON.stringify(response.data, null, 2));
    
    // 解析 JSON 响应
    let result;
    try {
      // 尝试提取 JSON（可能包含在代码块中）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      // 返回默认结果
      return {
        metalType: '其他',
        metalTypeEn: 'Unknown',
        confidence: 0.5,
        impurities: [],
        reason: 'AI 响应格式异常',
        rawResponse: content
      };
    }

    // 标准化结果
    return {
      metalType: result.metalType || '其他',
      metalTypeEn: getMetalEnglishName(result.metalType),
      confidence: (result.confidence || 50) / 100,
      impurities: result.impurities || [],
      reason: result.reason || '',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('通义千问 API 调用失败:', error.response?.data || error.message);
    throw new Error(`AI 识别失败：${error.response?.data?.message || error.message}`);
  }
}

// 获取金属英文名称
function getMetalEnglishName(metalType) {
  const mapping = {
    '铜': 'Copper',
    '铝': 'Aluminum',
    '铁': 'Iron',
    '不锈钢': 'Stainless Steel',
    '其他': 'Other'
  };
  return mapping[metalType] || 'Unknown';
}

// API 接口：识别金属
app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      });
    }
    
    console.log('收到图片:', req.file.filename);
    
    // 调用通义千问 VL API
    const result = await callQwenVL(req.file.path);
    
    // 添加图片 URL
    result.imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('识别错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '识别失败，请稍后重试'
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
  console.log(`⚠️  注意：请设置 DASHSCOPE_API_KEY 环境变量或修改代码中的 API Key`);
});
