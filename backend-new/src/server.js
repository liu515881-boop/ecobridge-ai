/**
 * EcoBridge AI Backend - 主服务器入口
 * 版本：v1.0
 * 日期：2026-05-15
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 导入路由
const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');
const aiRoutes = require('./routes/ai');
const listingRoutes = require('./routes/listings');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');

// 导入中间件
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 安全中间件
// ============================================
app.use(helmet()); // HTTP 安全头

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ecobridge.ai', 'https://app.ecobridge.ai']
    : '*',
  credentials: true,
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 请求
  message: { success: false, error: '请求太频繁，请稍后再试' }
});
app.use('/api/', limiter);

// ============================================
// 请求解析中间件
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use(requestLogger);

// ============================================
// 静态文件服务
// ============================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// API 路由
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'EcoBridge AI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 认证模块
app.use('/api/auth', authRoutes);

// 价格查询
app.use('/api/prices', priceRoutes);

// AI 识别
app.use('/api/ai', aiRoutes);

// 买卖信息
app.use('/api/listings', listingRoutes);

// 订单管理
app.use('/api/orders', orderRoutes);

// 评价系统
app.use('/api/reviews', reviewRoutes);

// 聊天消息
app.use('/api/messages', messageRoutes);

// ============================================
// 404 处理
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// ============================================
// 错误处理
// ============================================
app.use(errorHandler);

// ============================================
// 启动服务器
// ============================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           🌍 EcoBridge AI Backend v1.0                 ║
╠════════════════════════════════════════════════════════╣
║  📍 服务器地址：http://localhost:${PORT}                   ║
║  🌍 API 文档：http://localhost:${PORT}/api/docs           ║
║  💾 数据库：${process.env.DB_NAME || 'ecobridge'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}     ║
║  🤖 AI 服务：阿里云百炼 (${process.env.QWEN_VL_MODEL || 'qwen-vl-max-latest'})       ║
╚════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('👋 收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});

module.exports = app;
