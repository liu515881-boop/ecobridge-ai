# EcoBridge AI 部署指南

## 一、GitHub 仓库创建

### 步骤 1：创建 GitHub 仓库
1. 登录 GitHub：https://github.com
2. 点击右上角 **+** → **New repository**
3. 填写：
   - Repository name: `ecobridge-ai`
   - Description: `迪拜废金属 AI 交易平台 - AI-powered scrap metal trading platform in Dubai`
   - Visibility: **Public**
   - ✅ Initialize with README（如果已有本地 README 可不选）
4. 点击 **Create repository**

### 步骤 2：推送代码到 GitHub
```powershell
# 进入项目目录
cd C:\Users\86178\.openclaw\workspace\ecobridge-ai

# 推送代码（替换为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/ecobridge-ai.git
git push -u origin main
```

---

## 二、Vercel 部署

### 前端部署
1. 访问：https://vercel.com
2. **Add New...** → **Project**
3. 导入 `ecobridge-ai` 仓库
4. 配置：
   - Framework Preset: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Deploy**

### 后端部署（Railway/Render）
1. 登录 Railway：https://railway.app
2. New Project → Deploy from GitHub
3. 选择 `ecobridge-ai` 仓库
4. 设置：
   - Root Directory: `backend-new`
   - Start Command: `npm start`
5. 添加环境变量：
   ```
   PORT=3000
   DB_HOST=your-db-host
   DB_PASSWORD=your-password
   DASHSCOPE_API_KEY=sk-xxx
   ```

---

## 三、数据库部署

### 方案 A：Neon（PostgreSQL 免费层）
1. 访问：https://neon.tech
2. 创建项目 → 获取连接字符串
3. 配置到后端环境变量

### 方案 B：Supabase
1. 访问：https://supabase.com
2. 创建项目 → 获取 PostgreSQL 连接信息
3. 执行 `database/schema.sql` 初始化表结构

---

## 四、AI 服务配置

### 阿里云百炼 API
1. 访问：https://dashscope.console.aliyun.com
2. 创建 API Key
3. 配置到后端环境变量：`DASHSCOPE_API_KEY`

---

## 五、测试清单

- [ ] 前端页面正常加载
- [ ] AI 图片识别可用
- [ ] 价格查询正常
- [ ] 买卖信息发布正常
- [ ] 移动端适配正常

---

**部署完成后，将链接发给丽姐检查！** 🚀
