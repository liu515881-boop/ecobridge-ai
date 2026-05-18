/**
 * 用户认证路由
 * POST /api/auth/register - 注册
 * POST /api/auth/login - 登录
 * GET /api/auth/me - 获取当前用户
 * PATCH /api/auth/me - 更新用户信息
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ============================================
// 验证规则
// ============================================
const registerValidation = [
  body('phone')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('请输入有效的手机号'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少 6 位'),
  body('role')
    .isIn(['buyer', 'seller', 'broker'])
    .withMessage('角色必须是 buyer/seller/broker'),
  body('full_name').optional().trim(),
  body('company_name').optional().trim(),
];

const loginValidation = [
  body('phone').notEmpty().withMessage('请输入手机号'),
  body('password').notEmpty().withMessage('请输入密码'),
];

// ============================================
// POST /api/auth/register - 用户注册
// ============================================
router.post('/register', registerValidation, async (req, res) => {
  try {
    // 验证错误检查
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors.array()
      });
    }
    
    const { phone, password, full_name, role, company_name, license_number } = req.body;
    
    // 检查手机号是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '该手机号已注册'
      });
    }
    
    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 创建用户
    const result = await query(
      `INSERT INTO users (phone, password_hash, full_name, role, company_name, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, phone, full_name, role, created_at`,
      [phone, passwordHash, full_name, role, company_name, license_number]
    );
    
    const user = result.rows[0];
    
    // 生成 Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at
        },
        token
      }
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试'
    });
  }
});

// ============================================
// POST /api/auth/login - 用户登录
// ============================================
router.post('/login', loginValidation, async (req, res) => {
  try {
    // 验证错误检查
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '验证失败',
        details: errors.array()
      });
    }
    
    const { phone, password } = req.body;
    
    // 查询用户
    const result = await query(
      'SELECT id, phone, password_hash, full_name, role, verified, rating FROM users WHERE phone = $1',
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '手机号或密码错误'
      });
    }
    
    const user = result.rows[0];
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: '手机号或密码错误'
      });
    }
    
    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // 生成 Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          full_name: user.full_name,
          role: user.role,
          verified: user.verified,
          rating: user.rating
        },
        token
      }
    });
    
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    });
  }
});

// ============================================
// GET /api/auth/me - 获取当前用户信息
// ============================================
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, phone, email, full_name, role, avatar_url, company_name, 
              license_number, verified, rating, total_orders, created_at, last_login_at
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// ============================================
// PATCH /api/auth/me - 更新用户信息
// ============================================
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { full_name, email, company_name, license_number } = req.body;
    
    // 构建更新字段
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (company_name !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      values.push(company_name);
    }
    
    if (license_number !== undefined) {
      updates.push(`license_number = $${paramIndex++}`);
      values.push(license_number);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段'
      });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);
    
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, phone, email, full_name, role, company_name, license_number, verified`,
      values
    );
    
    res.json({
      success: true,
      message: '更新成功',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户信息失败'
    });
  }
});

module.exports = router;
