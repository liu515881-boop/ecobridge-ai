/**
 * 评价路由
 * MVP 阶段先实现基础框架
 */

const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// POST /api/reviews - 创建评价
// ============================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { order_id, rating, comment, is_anonymous } = req.body;
    
    // 检查订单是否存在且属于该用户
    const orderCheck = await query(
      'SELECT buyer_id, seller_id FROM orders WHERE id = $1',
      [order_id]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }
    
    const order = orderCheck.rows[0];
    
    // 确定被评价人
    const reviewee_id = order.buyer_id === req.user.id ? order.seller_id : order.buyer_id;
    
    // 检查是否已评价
    const existingReview = await query(
      'SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2',
      [order_id, req.user.id]
    );
    
    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '已评价过该订单'
      });
    }
    
    const result = await query(
      `INSERT INTO reviews 
       (order_id, reviewer_id, reviewee_id, rating, comment, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [order_id, req.user.id, reviewee_id, rating, comment, is_anonymous]
    );
    
    // 更新被评价人的评分
    await query(
      `UPDATE users 
       SET rating = (
         SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1
       ),
       total_orders = (
         SELECT COUNT(*) FROM orders WHERE (buyer_id = $1 OR seller_id = $1)
       )
       WHERE id = $1`,
      [reviewee_id]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建评价失败:', error);
    res.status(500).json({
      success: false,
      error: '创建评价失败'
    });
  }
});

// ============================================
// GET /api/reviews/user/:user_id - 用户评价
// ============================================
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 20 } = req.query;
    
    const result = await query(
      `SELECT 
        r.*,
        CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.full_name END as reviewer_name,
        o.listing_id
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN orders o ON r.order_id = o.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [user_id, parseInt(limit)]
    );
    
    // 获取用户平均评分
    const avgResult = await query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE reviewee_id = $1',
      [user_id]
    );
    
    res.json({
      success: true,
      data: {
        reviews: result.rows,
        summary: {
          avg_rating: parseFloat(avgResult.rows[0].avg_rating || 0),
          total: parseInt(avgResult.rows[0].total)
        }
      }
    });
  } catch (error) {
    console.error('查询评价失败:', error);
    res.status(500).json({
      success: false,
      error: '查询评价失败'
    });
  }
});

module.exports = router;
