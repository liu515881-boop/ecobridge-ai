/**
 * JWT 认证中间件
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

/**
 * 验证 JWT Token
 */
const authenticate = async (req, res, next) => {
  try {
    // 从 Header 获取 Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 验证 Token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查询用户
    const result = await query(
      'SELECT id, phone, role, verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 附加用户信息到 request
    req.user = {
      id: result.rows[0].id,
      phone: result.rows[0].phone,
      role: result.rows[0].role,
      verified: result.rows[0].verified
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '认证令牌已过期'
      });
    }
    
    next(error);
  }
};

/**
 * 角色权限检查
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      });
    }
    
    next();
  };
};

/**
 * 可选认证（有 token 则验证，没有也继续）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const result = await query(
        'SELECT id, phone, role, verified FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length > 0) {
        req.user = {
          id: result.rows[0].id,
          phone: result.rows[0].phone,
          role: result.rows[0].role,
          verified: result.rows[0].verified
        };
      }
    }
    
    next();
  } catch (error) {
    // Token 无效则忽略，继续请求
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
