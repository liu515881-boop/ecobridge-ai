/**
 * AI 图片识别路由
 * POST /api/ai/identify - 单张图片识别
 * POST /api/ai/identify-batch - 批量识别
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// 配置 Multer
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/ai');
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
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG/PNG/WEBP 格式'), false);
    }
  }
});

// ============================================
// 阿里云百炼 API 配置
// ============================================
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_VL_MODEL = process.env.QWEN_VL_MODEL || 'qwen-vl-max-latest';

if (!DASHSCOPE_API_KEY) {
  console.warn('⚠️  警告：未配置 DASHSCOPE_API_KEY，AI 识别功能将不可用');
}

// 金属类型映射
const METAL_MAPPING = {
  '铜': { en: 'Copper', ar: 'نحاس', basePrice: 15000 },
  '铝': { en: 'Aluminum', ar: 'ألومنيوم', basePrice: 3750 },
  '铁': { en: 'Iron', ar: 'حديد', basePrice: 1200 },
  '钢': { en: 'Steel', ar: 'فولاذ', basePrice: 1500 },
  '不锈钢': { en: 'Stainless Steel', ar: 'فولاذ مقاوم للصدأ', basePrice: 4500 },
  '其他': { en: 'Other', ar: 'آخر', basePrice: 0 },
};

// ============================================
// AI 识别核心函数
// ============================================
async function callQwenVL(imagePath) {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('AI 服务未配置');
  }
  
  // 图片转 Base64
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const imageMimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;
  
  // 构建 Prompt
  const prompt = `你是专业的废金属识别专家。请仔细识别图片中的金属材料。

金属特征参考：
- 铜：红褐色或紫红色，有金属光泽
- 铝：银白色，轻质，不易生锈
- 铁：灰黑色或深灰色，容易生锈（黄褐色锈迹）
- 钢：银灰色，强度高
- 不锈钢：亮银色，表面光滑，不易生锈

如果图片里有多种金属，只回答最主要的那个。

只输出一个 JSON 对象，不要有其他文字：
{
  "metalType": "铜/铝/铁/钢/不锈钢/其他",
  "confidence": 0-100 的数字，
  "impurities": ["杂质 1", "杂质 2"] 或 [],
  "reason": "判断依据简要说明",
  "weightEstimate": 预估重量 kg（可选，根据图片目测估算）
}`;

  const requestBody = {
    model: QWEN_VL_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: prompt }
        ]
      }
    ],
    max_tokens: 500,
    temperature: 0.1
  };

  console.log('📤 发送 AI 识别请求...');
  
  const response = await axios.post(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const content = response.data.choices[0].message.content;
  console.log('📥 AI 返回:', content);
  
  // 解析 JSON
  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = JSON.parse(content);
    }
  } catch (parseError) {
    console.error('JSON 解析失败:', parseError);
    return {
      metalType: '其他',
      confidence: 0,
      impurities: [],
      reason: 'AI 响应格式异常',
      weightEstimate: 0
    };
  }
  
  return result;
}

// ============================================
// POST /api/ai/identify - 单张图片识别
// ============================================
router.post('/identify', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传图片文件'
      });
    }
    
    console.log('收到图片:', req.file.filename);
    
    // 调用 AI 识别
    const aiResult = await callQwenVL(req.file.path);
    
    // 获取金属信息
    const metalType = aiResult.metalType || '其他';
    const metalInfo = METAL_MAPPING[metalType] || METAL_MAPPING['其他'];
    const basePrice = metalInfo.basePrice; // AED/TON
    
    // 计算预估金额
    const weightEstimate = aiResult.weightEstimate || 50.0; // 默认 50kg
    const priceEstimate = (basePrice / 1000) * weightEstimate; // 转换为 kg 价格
    
    // 保存识别记录
    const insertResult = await query(
      `INSERT INTO image_records 
       (user_id, image_url, ai_metal_type, ai_confidence, ai_impurities, 
        ai_weight_estimate, ai_price_estimate, ai_raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        req.user.id,
        `/uploads/ai/${req.file.filename}`,
        metalType,
        (aiResult.confidence || 50) / 100,
        aiResult.impurities || [],
        weightEstimate,
        priceEstimate,
        JSON.stringify(aiResult)
      ]
    );
    
    res.json({
      success: true,
      data: {
        id: insertResult.rows[0].id,
        metal_type: metalType,
        metal_type_en: metalInfo.en,
        metal_type_ar: metalInfo.ar,
        confidence: (aiResult.confidence || 50) / 100,
        impurities: aiResult.impurities || [],
        reason: aiResult.reason || '',
        weight_estimate: weightEstimate,
        weight_unit: 'kg',
        price_estimate: parseFloat(priceEstimate.toFixed(2)),
        price_unit: 'AED',
        price_basis: `Based on today's average price: ${basePrice} AED/TON`,
        image_url: `/uploads/ai/${req.file.filename}`,
        created_at: insertResult.rows[0].created_at
      }
    });
    
  } catch (error) {
    console.error('AI 识别失败:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'AI 识别失败'
    });
  }
});

// ============================================
// POST /api/ai/identify-batch - 批量识别
// ============================================
router.post('/identify-batch', authenticate, async (req, res) => {
  try {
    const { image_urls } = req.body;
    
    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供图片 URL 列表'
      });
    }
    
    if (image_urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: '单次最多识别 10 张图片'
      });
    }
    
    const results = [];
    
    for (const imageUrl of image_urls) {
      try {
        // 下载图片到临时文件
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tempPath = path.join(__dirname, '../../uploads/temp', `${Date.now()}.jpg`);
        
        if (!fs.existsSync(path.dirname(tempPath))) {
          fs.mkdirSync(path.dirname(tempPath), { recursive: true });
        }
        
        fs.writeFileSync(tempPath, imageResponse.data);
        
        // 调用 AI 识别
        const aiResult = await callQwenVL(tempPath);
        
        // 清理临时文件
        fs.unlinkSync(tempPath);
        
        const metalType = aiResult.metalType || '其他';
        const metalInfo = METAL_MAPPING[metalType] || METAL_MAPPING['其他'];
        
        results.push({
          image_url: imageUrl,
          metal_type: metalType,
          metal_type_en: metalInfo.en,
          confidence: (aiResult.confidence || 50) / 100,
          impurities: aiResult.impurities || []
        });
        
      } catch (error) {
        console.error(`图片识别失败 ${imageUrl}:`, error.message);
        results.push({
          image_url: imageUrl,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        total: results.length,
        results
      }
    });
    
  } catch (error) {
    console.error('批量识别失败:', error);
    res.status(500).json({
      success: false,
      error: '批量识别失败'
    });
  }
});

// ============================================
// GET /api/ai/history - 识别历史
// ============================================
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await query(
      `SELECT id, image_url, ai_metal_type, ai_confidence, ai_weight_estimate, 
              ai_price_estimate, created_at
       FROM image_records
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('查询识别历史失败:', error);
    res.status(500).json({
      success: false,
      error: '查询识别历史失败'
    });
  }
});

module.exports = router;
