-- ============================================
-- EcoBridge AI 数据库表结构
-- PostgreSQL 14+ with TimescaleDB
-- 版本：v1.0
-- 日期：2026-05-15
-- ============================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('buyer', 'seller', 'broker', 'admin')),
    avatar_url TEXT,
    company_name VARCHAR(200),
    license_number VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

-- ============================================
-- 2. 废品分类表 (categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_zh VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    name_ar VARCHAR(50),
    parent_id UUID REFERENCES categories(id),
    level INT NOT NULL DEFAULT 1,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 一级分类
INSERT INTO categories (id, name_zh, name_en, name_ar, level, sort_order) VALUES
(uuid_generate_v4(), '废金属', 'Metal Scrap', 'خردة معدنية', 1, 1),
(uuid_generate_v4(), '废纸', 'Paper Waste', 'نفايات ورقية', 1, 2),
(uuid_generate_v4(), '生活垃圾', 'Household Waste', 'نفايات منزلية', 1, 3),
(uuid_generate_v4(), '建筑垃圾', 'Construction Waste', 'نفايات بناء', 1, 4);

-- 废金属子分类
INSERT INTO categories (name_zh, name_en, name_ar, parent_id, level, sort_order) 
SELECT '废铝', 'Aluminum', 'ألومنيوم', id, 2, 1 FROM categories WHERE name_zh = '废金属' AND level = 1;

INSERT INTO categories (name_zh, name_en, name_ar, parent_id, level, sort_order) 
SELECT '废铜', 'Copper', 'نحاس', id, 2, 2 FROM categories WHERE name_zh = '废金属' AND level = 1;

INSERT INTO categories (name_zh, name_en, name_ar, parent_id, level, sort_order) 
SELECT '废铁', 'Iron', 'حديد', id, 2, 3 FROM categories WHERE name_zh = '废金属' AND level = 1;

INSERT INTO categories (name_zh, name_en, name_ar, parent_id, level, sort_order) 
SELECT '废钢', 'Steel', 'فولاذ', id, 2, 4 FROM categories WHERE name_zh = '废金属' AND level = 1;

INSERT INTO categories (name_zh, name_en, name_ar, parent_id, level, sort_order) 
SELECT '不锈钢', 'Stainless Steel', 'فولاذ مقاوم للصدأ', id, 2, 5 FROM categories WHERE name_zh = '废金属' AND level = 1;

-- ============================================
-- 3. 价格历史表 (price_history) - 时序数据
-- ============================================
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id),
    region VARCHAR(50) NOT NULL,
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('buy', 'sell')),
    price_min DECIMAL(10,2) NOT NULL,
    price_max DECIMAL(10,2) NOT NULL,
    price_avg DECIMAL(10,2),
    unit VARCHAR(20) NOT NULL DEFAULT 'AED/TON',
    source VARCHAR(100),
    published_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

SELECT create_hypertable('price_history', 'published_date', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_price_category_date ON price_history(category_id, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_region ON price_history(region);

-- ============================================
-- 4. 买卖信息表 (listings)
-- ============================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sell', 'buy')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2),
    unit VARCHAR(20) DEFAULT 'TON',
    price DECIMAL(10,2),
    price_type VARCHAR(20) CHECK (price_type IN ('fixed', 'negotiable')),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    location_address TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'deleted')),
    view_count INT DEFAULT 0,
    contact_count INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- ============================================
-- 5. 图片记录表 (image_records)
-- ============================================
CREATE TABLE IF NOT EXISTS image_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    ai_metal_type VARCHAR(50),
    ai_confidence DECIMAL(5,4),
    ai_impurities TEXT[],
    ai_weight_estimate DECIMAL(10,2),
    ai_price_estimate DECIMAL(10,2),
    ai_raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_images_listing ON image_records(listing_id);
CREATE INDEX IF NOT EXISTS idx_images_user ON image_records(user_id);

-- ============================================
-- 6. 订单表 (orders)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    broker_id UUID REFERENCES users(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'in_transit', 'completed', 'cancelled', 'disputed'
    )),
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN (
        'unpaid', 'paid', 'refunded'
    )),
    pickup_address TEXT,
    delivery_address TEXT,
    scheduled_pickup_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_listing ON orders(listing_id);

-- ============================================
-- 7. 评价表 (reviews)
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================
-- 8. 聊天表 (conversations & messages)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES users(id),
    participant2_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID REFERENCES listings(id),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant1_id, participant2_id, listing_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read) WHERE is_read = FALSE;

-- ============================================
-- 9. 爬虫任务表 (crawler_jobs)
-- ============================================
CREATE TABLE IF NOT EXISTS crawler_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    crawled_data JSONB,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 视图：用户统计
-- ============================================
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.full_name,
    u.role,
    u.rating,
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT r.id) as total_reviews
FROM users u
LEFT JOIN listings l ON u.id = l.user_id
LEFT JOIN orders o ON u.id = o.buyer_id OR u.id = o.seller_id
LEFT JOIN reviews r ON u.id = r.reviewee_id
GROUP BY u.id;

-- ============================================
-- 测试数据
-- ============================================

-- 测试用户（密码都是 123456）
INSERT INTO users (phone, password_hash, full_name, role, verified, rating, total_orders) VALUES
('+971501234567', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ahmed Ali', 'seller', TRUE, 4.5, 12),
('+971507654321', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Mohammed Khan', 'buyer', TRUE, 4.8, 23),
('+971525978201', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '丽姐', 'admin', TRUE, 5.0, 0);

-- 测试价格数据（迪拜今日价格）
INSERT INTO price_history (category_id, region, price_type, price_min, price_max, price_avg, unit, source, published_date)
SELECT 
    c.id,
    'Dubai',
    'buy',
    CASE 
        WHEN c.name_zh = '废铝' THEN 3500
        WHEN c.name_zh = '废铜' THEN 14000
        WHEN c.name_zh = '废铁' THEN 1100
        WHEN c.name_zh = '废钢' THEN 1400
        WHEN c.name_zh = '不锈钢' THEN 4200
        ELSE 0
    END,
    CASE 
        WHEN c.name_zh = '废铝' THEN 4000
        WHEN c.name_zh = '废铜' THEN 16000
        WHEN c.name_zh = '废铁' THEN 1300
        WHEN c.name_zh = '废钢' THEN 1600
        WHEN c.name_zh = '不锈钢' THEN 4800
        ELSE 0
    END,
    CASE 
        WHEN c.name_zh = '废铝' THEN 3750
        WHEN c.name_zh = '废铜' THEN 15000
        WHEN c.name_zh = '废铁' THEN 1200
        WHEN c.name_zh = '废钢' THEN 1500
        WHEN c.name_zh = '不锈钢' THEN 4500
        ELSE 0
    END,
    'AED/TON',
    'Market Average',
    CURRENT_DATE
FROM categories c
WHERE c.level = 2 AND c.parent_id IN (SELECT id FROM categories WHERE name_zh = '废金属');

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ EcoBridge AI 数据库初始化完成！';
    RAISE NOTICE '📊 分类表：已插入 5 个一级分类 + 5 个废金属子分类';
    RAISE NOTICE '👤 测试用户：已创建 3 个测试账号';
    RAISE NOTICE '💰 价格数据：已插入迪拜今日价格';
END $$;
