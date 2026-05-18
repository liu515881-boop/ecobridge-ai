# 🌍 EcoBridge AI

**综合回收资源交易平台** - 连接废品买家、卖家和中介的 AI 驱动平台

---

## 📋 项目概述

EcoBridge AI 是一个 Web + App 平台，涵盖废金属（铝、铜、铁、钢等）、废纸、生活垃圾、建筑垃圾交易。核心功能包括：

- 🤖 **AI 图片识别** - 拍照自动识别材质 + 预估重量 + 实时估价
- 💰 **每日价格更新** - 覆盖迪拜主要废品市场价格
- 📱 **买卖信息发布** - 类似闲鱼的废品交易集市
- 💬 **即时聊天** - 买卖双方直接沟通
- ⭐ **评价系统** - 建立信任机制

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     客户端层                              │
│  React Native (iOS/Android)  │  React Web (Vite)        │
└─────────────────────────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────────────────────────────────────┐
│                  Node.js 后端 (Express)                  │
│  认证 │ Listings │ 订单 │ 评价 │ 聊天 │ 价格 API          │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│              Python AI 服务 (FastAPI)                    │
│         阿里云百炼视觉 API 调用 + 估价计算                │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│          PostgreSQL + TimescaleDB (时序价格数据)         │
│                  Redis (缓存 + 会话)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
ecobridge-ai/
├── backend-new/           # Node.js 后端
│   ├── src/
│   │   ├── config/       # 数据库配置
│   │   ├── middleware/   # 认证/错误处理
│   │   ├── routes/       # API 路由
│   │   └── server.js     # 入口文件
│   ├── package.json
│   └── .env.example
├── ai-service/           # Python AI 服务（待创建）
├── crawler/              # 价格爬虫（待创建）
├── mobile/               # React Native App（待创建）
├── web/                  # React Web 前端（待创建）
├── database/
│   └── schema.sql        # 数据库表结构
└── docs/
    └── API.md            # API 文档
```

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14 (with TimescaleDB)
- Python >= 3.9 (AI 服务)
- Redis >= 6.0

### 2. 数据库初始化

```bash
# 创建数据库
createdb ecobridge

# 执行表结构
psql -d ecobridge -f database/schema.sql
```

### 3. 后端启动

```bash
cd backend-new

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 编辑 .env 配置数据库和 API Key
# DB_PASSWORD=your_password
# DASHSCOPE_API_KEY=sk-your-key

# 启动服务
npm run dev
```

访问 http://localhost:3000/api/health 验证

### 4. AI 服务启动（待创建）

```bash
cd ai-service

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

---

## 📡 API 接口

### 认证模块
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| PATCH | /api/auth/me | 更新用户信息 |

### 价格查询
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/prices | 当前价格 |
| GET | /api/prices/history | 价格历史 |
| GET | /api/prices/trends | 价格趋势 |

### AI 识别
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/identify | 单张图片识别 |
| POST | /api/ai/identify-batch | 批量识别 |
| GET | /api/ai/history | 识别历史 |

### 买卖信息
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/listings | 列表/搜索 |
| POST | /api/listings | 发布 |
| GET | /api/listings/:id | 详情 |
| PATCH | /api/listings/:id | 更新 |
| DELETE | /api/listings/:id | 删除 |

### 订单管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/orders | 订单列表 |
| POST | /api/orders | 创建订单 |
| PATCH | /api/orders/:id/status | 更新状态 |

---

## 🔐 环境变量配置

```bash
# 服务器
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecobridge
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# 阿里云百炼
DASHSCOPE_API_KEY=sk-your-api-key
QWEN_VL_MODEL=qwen-vl-max-latest
```

---

## 📊 数据库设计

### 核心表
- **users** - 用户（买家/卖家/中介/管理员）
- **categories** - 废品分类（废金属/废纸/生活垃圾/建筑垃圾）
- **price_history** - 价格历史（时序数据，每日更新）
- **listings** - 买卖信息
- **image_records** - AI 识别记录
- **orders** - 订单
- **reviews** - 评价
- **conversations & messages** - 聊天

---

## 🧪 测试

```bash
# 运行测试
npm test

# 测试 AI 识别
curl -X POST http://localhost:3000/api/ai/identify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-metal.jpg"
```

---

## 📅 开发计划

| 阶段 | 时间 | 任务 |
|------|------|------|
| **Phase 1** | Week 1-2 | 后端核心 API + 数据库 + AI 识别 |
| **Phase 2** | Week 3-4 | React Native App + 价格爬虫 |
| **Phase 3** | Week 5-6 | 管理后台 + 部署上线 |

---

## 👥 团队

- **丽姐** - Founder & CEO
- **虾小米** - AI Assistant & Tech Lead
- **菲律宾员工** - Research & Data Entry

---

## 📄 许可证

MIT License

---

## 📞 联系方式

- **网站:** https://ecobridge.ai (待上线)
- **邮箱:** hello@ecobridge.ai
- **地址:** Dubai, UAE

---

**Built with ❤️ in Dubai**
