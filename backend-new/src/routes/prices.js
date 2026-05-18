/**
 * 价格查询路由
 * GET /api/prices - 当前价格
 * GET /api/prices/history - 价格历史
 * GET /api/prices/trends - 价格趋势
 */

const express = require('express');
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET /api/prices - 查询当前价格
// ============================================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category_id, region, date } = req.query;
    
    // 默认日期为今天
    const queryDate = date || new Date().toISOString().split('T')[0];
    const queryRegion = region || 'Dubai';
    
    let sql = `
      SELECT 
        c.id as category_id,
        c.name_zh,
        c.name_en,
        c.name_ar,
        ph.price_type,
        ph.price_min,
        ph.price_max,
        ph.price_avg,
        ph.unit,
        ph.source,
        ph.published_date
      FROM price_history ph
      JOIN categories c ON ph.category_id = c.id
      WHERE ph.published_date = $1
        AND ph.region = $2
    `;
    
    const params = [queryDate, queryRegion];
    
    // 可选：按分类筛选
    if (category_id) {
      sql += ' AND ph.category_id = $3';
      params.push(category_id);
    }
    
    sql += ' ORDER BY c.sort_order, c.name_zh';
    
    const result = await query(sql, params);
    
    // 按分类分组
    const pricesByCategory = {};
    
    result.rows.forEach(row => {
      if (!pricesByCategory[row.category_id]) {
        pricesByCategory[row.category_id] = {
          category: {
            id: row.category_id,
            name_zh: row.name_zh,
            name_en: row.name_en,
            name_ar: row.name_ar
          },
          buy_price: null,
          sell_price: null,
          source: row.source,
          published_date: row.published_date
        };
      }
      
      if (row.price_type === 'buy') {
        pricesByCategory[row.category_id].buy_price = {
          min: parseFloat(row.price_min),
          max: parseFloat(row.price_max),
          avg: parseFloat(row.price_avg),
          unit: row.unit
        };
      } else if (row.price_type === 'sell') {
        pricesByCategory[row.category_id].sell_price = {
          min: parseFloat(row.price_min),
          max: parseFloat(row.price_max),
          avg: parseFloat(row.price_avg),
          unit: row.unit
        };
      }
    });
    
    // 计算趋势（与昨天对比）
    const yesterday = new Date(new Date(queryDate).getTime() - 86400000).toISOString().split('T')[0];
    
    const yesterdaySql = `
      SELECT 
        c.id as category_id,
        ph.price_type,
        ph.price_avg
      FROM price_history ph
      JOIN categories c ON ph.category_id = c.id
      WHERE ph.published_date = $1
        AND ph.region = $2
    `;
    
    const yesterdayResult = await query(yesterdaySql, [yesterday, queryRegion]);
    
    const yesterdayPrices = {};
    yesterdayResult.rows.forEach(row => {
      if (!yesterdayPrices[row.category_id]) {
        yesterdayPrices[row.category_id] = {};
      }
      yesterdayPrices[row.category_id][row.price_type] = parseFloat(row.price_avg);
    });
    
    // 添加趋势信息
    Object.values(pricesByCategory).forEach(item => {
      const yesterdayBuy = yesterdayPrices[item.category.id]?.buy;
      const yesterdaySell = yesterdayPrices[item.category.id]?.sell;
      
      if (item.buy_price && yesterdayBuy) {
        const change = ((item.buy_price.avg - yesterdayBuy) / yesterdayBuy) * 100;
        item.buy_price.trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
        item.buy_price.change_percent = parseFloat(change.toFixed(2));
      }
      
      if (item.sell_price && yesterdaySell) {
        const change = ((item.sell_price.avg - yesterdaySell) / yesterdaySell) * 100;
        item.sell_price.trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
        item.sell_price.change_percent = parseFloat(change.toFixed(2));
      }
    });
    
    res.json({
      success: true,
      data: {
        region: queryRegion,
        date: queryDate,
        prices: Object.values(pricesByCategory),
        last_updated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('查询价格失败:', error);
    res.status(500).json({
      success: false,
      error: '查询价格失败'
    });
  }
});

// ============================================
// GET /api/prices/history - 价格历史
// ============================================
router.get('/history', async (req, res) => {
  try {
    const { category_id, region, days = 30 } = req.query;
    
    const queryRegion = region || 'Dubai';
    const queryDays = parseInt(days);
    
    const sql = `
      SELECT 
        c.id as category_id,
        c.name_zh,
        c.name_en,
        ph.price_type,
        ph.price_avg,
        ph.published_date
      FROM price_history ph
      JOIN categories c ON ph.category_id = c.id
      WHERE ph.region = $1
        AND ph.published_date >= CURRENT_DATE - INTERVAL '${queryDays} days'
        ${category_id ? 'AND ph.category_id = $2' : ''}
      ORDER BY ph.published_date DESC, c.sort_order
    `;
    
    const params = category_id ? [queryRegion, category_id] : [queryRegion];
    const result = await query(sql, params);
    
    // 按分类和价格类型分组
    const history = {};
    
    result.rows.forEach(row => {
      const key = `${row.category_id}_${row.price_type}`;
      
      if (!history[key]) {
        history[key] = {
          category: {
            id: row.category_id,
            name_zh: row.name_zh,
            name_en: row.name_en
          },
          price_type: row.price_type,
          data: []
        };
      }
      
      history[key].data.push({
        date: row.published_date,
        price: parseFloat(row.price_avg)
      });
    });
    
    res.json({
      success: true,
      data: {
        region: queryRegion,
        days: queryDays,
        history: Object.values(history)
      }
    });
    
  } catch (error) {
    console.error('查询价格历史失败:', error);
    res.status(500).json({
      success: false,
      error: '查询价格历史失败'
    });
  }
});

// ============================================
// GET /api/prices/trends - 价格趋势分析
// ============================================
router.get('/trends', async (req, res) => {
  try {
    const { region } = req.query;
    const queryRegion = region || 'Dubai';
    
    // 获取 7 天平均价格对比
    const sql = `
      SELECT 
        c.id as category_id,
        c.name_zh,
        c.name_en,
        ph.price_type,
        AVG(ph.price_avg) FILTER (WHERE ph.published_date >= CURRENT_DATE - 7) as avg_7d,
        AVG(ph.price_avg) FILTER (WHERE ph.published_date >= CURRENT_DATE - 14 
                                   AND ph.published_date < CURRENT_DATE - 7) as avg_prev_7d
      FROM price_history ph
      JOIN categories c ON ph.category_id = c.id
      WHERE ph.region = $1
        AND ph.published_date >= CURRENT_DATE - 14
      GROUP BY c.id, c.name_zh, c.name_en, ph.price_type
    `;
    
    const result = await query(sql, [queryRegion]);
    
    const trends = result.rows.map(row => ({
      category: {
        id: row.category_id,
        name_zh: row.name_zh,
        name_en: row.name_en
      },
      price_type: row.price_type,
      avg_7d: parseFloat(row.avg_7d),
      avg_prev_7d: parseFloat(row.avg_prev_7d),
      change_percent: row.avg_prev_7d ? 
        parseFloat((((row.avg_7d - row.avg_prev_7d) / row.avg_prev_7d) * 100).toFixed(2)) : 0,
      trend: row.avg_7d > row.avg_prev_7d ? 'up' : row.avg_7d < row.avg_prev_7d ? 'down' : 'stable'
    }));
    
    res.json({
      success: true,
      data: {
        region: queryRegion,
        period: '7 days',
        trends
      }
    });
    
  } catch (error) {
    console.error('查询价格趋势失败:', error);
    res.status(500).json({
      success: false,
      error: '查询价格趋势失败'
    });
  }
});

module.exports = router;
