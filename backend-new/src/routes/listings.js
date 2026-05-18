/**
 * 买卖信息路由
 * GET /api/listings - 列表/搜索
 * POST /api/listings - 发布
 * GET /api/listings/:id - 详情
 * PATCH /api/listings/:id - 更新
 * DELETE /api/listings/:id - 删除
 */

const express = require('express');
const { query } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ============================================
// GET /api/listings - 列表/搜索
// ============================================
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const {
    category_id,
    listing_type,
    region,
    status = 'active',
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'DESC'
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  // 构建 WHERE 条件
  const conditions = ['l.status = $1'];
  const params = [status];
  let paramIndex = 2;
  
  if (category_id) {
    conditions.push(`l.category_id = $${paramIndex++}`);
    params.push(category_id);
  }
  
  if (listing_type) {
    conditions.push(`l.listing_type = $${paramIndex++}`);
    params.push(listing_type);
  }
  
  // 排序
  const validSorts = ['created_at', 'price', 'quantity', 'view_count'];
  const sortBy = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  // 主查询
  const mainSql = `
    SELECT 
      l.*,
      c.name_zh as category_name_zh,
      c.name_en as category_name_en,
      u.full_name as user_name,
      u.rating as user_rating,
      u.phone as user_phone
    FROM listings l
    JOIN categories c ON l.category_id = c.id
    JOIN users u ON l.user_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY l.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  
  params.push(limit, offset);
  
  const result = await query(mainSql, params);
  
  // 计数查询
  const countSql = `
    SELECT COUNT(*) as total
    FROM listings l
    WHERE ${conditions.join(' AND ')}
  `;
  
  const countResult = await query(countSql, params.slice(0, 1));
  const total = parseInt(countResult.rows[0].total);
  
  res.json({
    success: true,
    data: {
      listings: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

// ============================================
// POST /api/listings - 发布新信息
// ============================================
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    category_id,
    listing_type,
    title,
    description,
    quantity,
    unit,
    price,
    price_type,
    location,
    expires_at
  } = req.body;
  
  const result = await query(
    `INSERT INTO listings 
     (user_id, category_id, listing_type, title, description, quantity, unit, 
      price, price_type, location_lat, location_lng, location_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      req.user.id,
      category_id,
      listing_type,
      title,
      description,
      quantity,
      unit || 'TON',
      price,
      price_type || 'negotiable',
      location?.lat,
      location?.lng,
      location?.address,
      expires_at
    ]
  );
  
  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
}));

// ============================================
// GET /api/listings/:id - 详情
// ============================================
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 增加浏览次数
  await query(
    'UPDATE listings SET view_count = view_count + 1 WHERE id = $1',
    [id]
  );
  
  const result = await query(
    `SELECT 
      l.*,
      c.name_zh as category_name_zh,
      c.name_en as category_name_en,
      u.full_name as user_name,
      u.rating as user_rating,
      u.phone as user_phone,
      u.verified as user_verified
     FROM listings l
     JOIN categories c ON l.category_id = c.id
     JOIN users u ON l.user_id = u.id
     WHERE l.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: '信息不存在'
    });
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// ============================================
// PATCH /api/listings/:id - 更新
// ============================================
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  const ownerCheck = await query(
    'SELECT user_id FROM listings WHERE id = $1',
    [id]
  );
  
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: '信息不存在'
    });
  }
  
  if (ownerCheck.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '无权限修改'
    });
  }
  
  const {
    title,
    description,
    quantity,
    price,
    price_type,
    status,
    location
  } = req.body;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (quantity !== undefined) {
    updates.push(`quantity = $${paramIndex++}`);
    values.push(quantity);
  }
  if (price !== undefined) {
    updates.push(`price = $${paramIndex++}`);
    values.push(price);
  }
  if (price_type !== undefined) {
    updates.push(`price_type = $${paramIndex++}`);
    values.push(price_type);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);
  }
  if (location !== undefined) {
    updates.push(`location_lat = $${paramIndex++}`);
    values.push(location.lat);
    updates.push(`location_lng = $${paramIndex++}`);
    values.push(location.lng);
    updates.push(`location_address = $${paramIndex++}`);
    values.push(location.address);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  
  const result = await query(
    `UPDATE listings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// ============================================
// DELETE /api/listings/:id - 删除
// ============================================
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 检查权限
  const ownerCheck = await query(
    'SELECT user_id FROM listings WHERE id = $1',
    [id]
  );
  
  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: '信息不存在'
    });
  }
  
  if (ownerCheck.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '无权限删除'
    });
  }
  
  // 软删除
  await query(
    'UPDATE listings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    ['deleted', id]
  );
  
  res.json({
    success: true,
    message: '删除成功'
  });
}));

module.exports = router;
