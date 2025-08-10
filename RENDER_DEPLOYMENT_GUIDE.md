# 🚀 Render 部署指南

本指南將幫助您將 F1 賽車主題娛樂城應用部署到 Render 平台。

## 📋 部署前準備

### 1. 確保代碼已推送到 GitHub
```bash
# 檢查 Git 狀態
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "Add Render deployment configuration"

# 推送到 GitHub
git push origin main
```

### 2. 檢查必要文件
確保以下文件存在於您的倉庫中：
- ✅ `render.yaml` - Render 部署配置
- ✅ `Dockerfile.render` - 生產環境 Dockerfile
- ✅ `database/Dockerfile.postgres` - PostgreSQL Dockerfile
- ✅ `server/server.js` - 已修改支援靜態文件服務

## 🌐 Render 平台部署步驟

### 步驟 1: 登入 Render
1. 前往 [Render.com](https://render.com)
2. 使用 GitHub 帳號登入
3. 授權 Render 訪問您的 GitHub 倉庫

### 步驟 2: 創建新的 Blueprint
1. 點擊 "New" → "Blueprint"
2. 選擇您的 GitHub 倉庫
3. 選擇分支 (通常是 `main`)
4. Render 會自動檢測 `render.yaml` 配置文件

### 步驟 3: 配置環境變數
Render 會根據 `render.yaml` 自動配置大部分環境變數，但您需要確認：

#### 自動生成的變數：
- `JWT_SECRET` - 自動生成安全密鑰
- `POSTGRES_PASSWORD` - 自動生成資料庫密碼

#### 需要手動設置的變數：
- `CORS_ORIGIN` - 設置為您的應用域名 (例如: `https://your-app-name.onrender.com`)

### 步驟 4: 部署服務
1. 點擊 "Create New Blueprint"
2. Render 會開始部署以下服務：
   - **Web Service**: F1 賽車娛樂城應用 (前端 + 後端)
   - **PostgreSQL Database**: 資料庫服務
   - **Redis**: 緩存服務

### 步驟 5: 等待部署完成
- 資料庫服務通常需要 2-3 分鐘
- Web 服務需要 5-10 分鐘 (包含構建時間)
- Redis 服務通常需要 1-2 分鐘

## 🔧 部署後配置

### 1. 檢查服務狀態
在 Render 控制台中確認所有服務都顯示為 "Live" 狀態：
- ✅ f1-racing-casino (Web Service)
- ✅ f1-racing-postgres (PostgreSQL)
- ✅ f1-racing-redis (Redis)

### 2. 測試應用功能
訪問您的應用 URL (例如: `https://f1-racing-casino.onrender.com`)：
- ✅ 前端頁面正常載入
- ✅ 用戶註冊功能
- ✅ 用戶登入功能
- ✅ 老虎機遊戲功能
- ✅ 遊戲歷史記錄

### 3. 監控日誌
在 Render 控制台中查看各服務的日誌：
```
🚀 Server is running on port 10000
📊 Environment: production
✅ Connected to Redis
✅ Connected to PostgreSQL
```

## 🛠️ 故障排除

### 問題 1: 構建失敗
**可能原因**: 依賴安裝失敗或 Dockerfile 配置錯誤

**解決方案**:
1. 檢查 `Dockerfile.render` 中的 Node.js 版本
2. 確認 `package.json` 中的依賴版本
3. 查看構建日誌中的具體錯誤信息

### 問題 2: 資料庫連接失敗
**可能原因**: 資料庫服務未完全啟動或連接字符串錯誤

**解決方案**:
1. 確認 PostgreSQL 服務狀態為 "Live"
2. 檢查 `DATABASE_URL` 環境變數是否正確設置
3. 查看資料庫初始化日誌

### 問題 3: 前端無法載入
**可能原因**: 靜態文件路徑錯誤或構建失敗

**解決方案**:
1. 確認前端構建成功 (`npm run build`)
2. 檢查 `server.js` 中的靜態文件服務配置
3. 確認 `NODE_ENV=production` 環境變數已設置

### 問題 4: CORS 錯誤
**可能原因**: CORS 配置與實際域名不匹配

**解決方案**:
1. 更新 `CORS_ORIGIN` 環境變數為正確的域名
2. 重新部署 Web 服務

## 📊 性能優化建議

### 1. 資料庫優化
- 使用 Render 的 PostgreSQL 連接池
- 定期清理舊的遊戲歷史記錄
- 為常用查詢添加索引

### 2. 緩存優化
- 使用 Redis 緩存用戶會話
- 緩存遊戲配置和規則
- 實施適當的緩存過期策略

### 3. 應用優化
- 啟用 gzip 壓縮
- 優化前端資源 (CSS/JS 壓縮)
- 使用 CDN 加速靜態資源

## 🔒 安全性檢查清單

- ✅ JWT 密鑰已自動生成且足夠複雜
- ✅ 資料庫密碼已自動生成且安全
- ✅ CORS 配置僅允許您的域名
- ✅ 速率限制已啟用
- ✅ Helmet 安全中間件已配置
- ✅ 密碼使用 bcrypt 加密

## 📈 監控和維護

### 1. 日誌監控
定期檢查以下日誌：
- 應用錯誤日誌
- 資料庫連接日誌
- 用戶活動日誌

### 2. 性能監控
- 響應時間
- 資料庫查詢性能
- 記憶體使用情況

### 3. 定期維護
- 更新依賴套件
- 備份重要資料
- 監控資源使用情況

## 🎯 下一步

部署成功後，您可以考慮：

1. **自定義域名**: 在 Render 中配置自定義域名
2. **SSL 證書**: Render 自動提供 Let's Encrypt SSL 證書
3. **監控工具**: 整合 Render 的內建監控或第三方工具
4. **CI/CD**: 設置自動部署流程
5. **擴展功能**: 添加更多遊戲或功能

---

## 📞 支援

如果遇到問題，可以：
- 查看 [Render 官方文檔](https://render.com/docs)
- 檢查 Render 社群論壇
- 查看本專案的 GitHub Issues

**祝您部署順利！🏎️🎰**