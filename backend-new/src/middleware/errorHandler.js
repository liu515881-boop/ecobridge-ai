/**
 * 错误处理中间件
 */

const { query } = require('../config/database');

/**
 * 全局错误处理器
 */
const errorHandler = async (err, req, res, next) => {
  // 记录错误
  console.error('❌ 错误:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // 数据库错误
  if (err.code) {
    console.error('数据库错误代码:', err.code);
  }

  // Multer 错误
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件过大，最大支持 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: '文件上传失败：' + err.message
    });
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: '验证失败',
      details: err.details
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: '认证令牌已过期'
    });
  }

  // Axios 错误（API 调用失败）
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      error: '请求超时'
    });
  }

  // 默认错误
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? message : '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    console.log(`${emoji} ${req.method} ${req.url} ${status} ${duration}ms`);
  });
  
  next();
};

/**
 * 异步错误包装器
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  requestLogger,
  asyncHandler,
};
