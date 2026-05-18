# EcoBridge AI 启动脚本
# 双击运行即可启动本地测试

Write-Host "🚀 启动 EcoBridge AI..." -ForegroundColor Green
Write-Host ""

# 进入 backend 目录
Set-Location "C:\Users\86178\.openclaw\workspace\ecobridge-ai\backend"

# 启动 backend
Write-Host "📡 启动 Backend 服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\86178\.openclaw\workspace\ecobridge-ai\backend'; npm start"

# 等待 3 秒
Start-Sleep -Seconds 3

# 打开 frontend
Write-Host "🌐 打开 Frontend 页面..." -ForegroundColor Cyan
Start-Process "C:\Users\86178\.openclaw\workspace\ecobridge-ai\frontend\index.html"

Write-Host ""
Write-Host "✅ EcoBridge AI 已启动！" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Frontend: 浏览器已打开" -ForegroundColor Yellow
Write-Host ""
Write-Host "按任意键退出此窗口..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
