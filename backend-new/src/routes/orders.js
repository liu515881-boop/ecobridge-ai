/**
 * 订单路由
 * MVP 阶段先实现基础框架
 */

const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/orders - 订单列表
// ============================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT 
        o.*,
        l.title as listing_title,
        buyer.full_name as buyer_name,
        seller.full_name as seller_name
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE (o.buyer_id = $1 OR o.seller_id = $1)
    `;
    
    const params = [req.user.id];
    
    if (status) {
      sql += ` AND o.status = $${params.length + 1}`;
      params.push(status);
    }
    
    sql += ' ORDER BY o.created_at DESC';
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(500).json({
      success: false,
      error: '查询订单失败'
    });
  }
});

// ============================================
// POST /api/orders - 创建订单
// ============================================
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      listing_id,
      quantity,
      unit,
      unit_price,
      pickup_address,
      scheduled_pickup_at,
      notes
    } = req.body;
    
    // 获取 listing 信息
    const listingResult = await query(
      'SELECT user_id, price FROM listings WHERE id = $1',
      [listing_id]
    );
    
    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '商品信息不存在'
      });
    }
    
    const seller_id = listingResult.rows[0].user_id;
    const total_amount = quantity * unit_price;
    
    const result = await query(
      `INSERT INTO orders 
       (listing_id, buyer_id, seller_id, quantity, unit, unit_price, total_amount,
        pickup_address, scheduled_pickup_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        listing_id,
        req.user.id,
        seller_id,
        quantity,
        unit,
        unit_price,
        total_amount,
        pickup_address,
        scheduled_pickup_at,
        notes
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: '创建订单失败'
    });
  }
});

// ============================================
// GET /api/orders/:id - 订单详情
// ============================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        o.*,
        l.title as listing_title,
        l.description as listing_description,
        buyer.full_name as buyer_name,
        buyer.phone as buyer_phone,
        seller.full_name as seller_name,
        seller.phone as seller_phone
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON o.seller_id = seller.id
       WHERE o.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    const order = result.rows[0];
    
    // 检查权限
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权限查看'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('查询订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '查询订单详情失败'
    });
  }
});

// ============================================
// PATCH /api/orders/:id/status - 更新订单状态
// ============================================
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // 检查订单权限
    const orderCheck = await query(
      'SELECT buyer_id, seller_id FROM orders WHERE id = $1',
      [id]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    const order = orderCheck.rows[0];
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权限操作'
      });
    }
    
    const result = await query(
      `UPDATE orders 
       SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新订单状态失败'
    });
  }
});

module.exports = router;
