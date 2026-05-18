/**
 * 聊天消息路由
 * MVP 阶段先实现基础框架（完整功能需要 Socket.io）
 */

const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/messages/conversations - 会话列表
// ============================================
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        CASE 
          WHEN c.participant1_id = $1 THEN c.participant2_id
          ELSE c.participant1_id
        END as other_user_id,
        u.full_name as other_user_name,
        u.avatar_url as other_user_avatar,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM conversations c
       JOIN users u ON u.id = (
         CASE 
           WHEN c.participant1_id = $1 THEN c.participant2_id
           ELSE c.participant1_id
         END
       )
       WHERE c.participant1_id = $1 OR c.participant2_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('查询会话列表失败:', error);
    res.status(500).json({
      success: false,
      error: '查询会话列表失败'
    });
  }
});

// ============================================
// GET /api/messages/:conversation_id - 会话消息
// ============================================
router.get('/:conversation_id', authenticate, async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { limit = 50 } = req.query;
    
    // 检查权限
    const convCheck = await query(
      'SELECT participant1_id, participant2_id FROM conversations WHERE id = $1',
      [conversation_id]
    );
    
    if (convCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }
    
    const conv = convCheck.rows[0];
    if (conv.participant1_id !== req.user.id && conv.participant2_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权限查看'
      });
    }
    
    const result = await query(
      `SELECT 
        m.*,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [conversation_id, parseInt(limit)]
    );
    
    // 标记为已读
    await query(
      `UPDATE messages 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [conversation_id, req.user.id]
    );
    
    res.json({
      success: true,
      data: result.rows.reverse() // 正序返回
    });
  } catch (error) {
    console.error('查询消息失败:', error);
    res.status(500).json({
      success: false,
      error: '查询消息失败'
    });
  }
});

// ============================================
// POST /api/messages - 发送消息
// ============================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { conversation_id, content, message_type = 'text' } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
    }
    
    const result = await query(
      `INSERT INTO messages 
       (conversation_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversation_id, req.user.id, content, message_type]
    );
    
    // 更新会话最后消息时间
    await query(
      `UPDATE conversations 
       SET last_message_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [conversation_id]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      success: false,
      error: '发送消息失败'
    });
  }
});

// ============================================
// POST /api/messages/conversation - 创建/获取会话
// ============================================
router.post('/conversation', authenticate, async (req, res) => {
  try {
    const { participant2_id, listing_id } = req.body;
    
    if (!participant2_id) {
      return res.status(400).json({
        success: false,
        error: '请指定对话方'
      });
    }
    
    // 检查是否已存在会话
    const existing = await query(
      `SELECT id FROM conversations 
       WHERE (participant1_id = $1 AND participant2_id = $2)
          OR (participant1_id = $2 AND participant2_id = $1)
       ${listing_id ? 'AND listing_id = $3' : ''}`,
      listing_id ? [req.user.id, participant2_id, listing_id] : [req.user.id, participant2_id]
    );
    
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        data: { id: existing.rows[0].id, created: false }
      });
    }
    
    // 创建新会话
    const result = await query(
      `INSERT INTO conversations 
       (participant1_id, participant2_id, listing_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.user.id, participant2_id, listing_id || null]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, created: true }
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      error: '创建会话失败'
    });
  }
});

module.exports = router;
