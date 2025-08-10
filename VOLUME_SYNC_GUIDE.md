# Docker Volume 實時同步開發指南

## 概述

本指南說明如何使用 Docker Volume 來實現程式碼的實時同步，讓你在開發過程中無需重新構建 Docker 映像就能看到代碼變更的效果。

## 🚀 快速開始

### 1. 啟動實時同步開發環境

```bash
# 使用專門的開發腳本
scripts\dev-sync.bat start
```

### 2. 開始開發

- **前端開發**: 修改 `client/src` 下的任何文件，瀏覽器會自動熱重載
- **後端開發**: 修改 `server` 下的任何文件，服務會自動重啟

### 3. 查看實時日誌

```bash
# 查看所有服務日誌
scripts\dev-sync.bat logs

# 查看特定服務日誌
scripts\dev-sync.bat logs server
scripts\dev-sync.bat logs client
```

## 📁 Volume 配置詳解

### 前端 (React) Volume 配置

```yaml
volumes:
  # 實時同步源代碼
  - ./client/src:/app/src
  - ./client/public:/app/public
  - ./client/package.json:/app/package.json
  # 排除 node_modules 避免衝突
  - /app/node_modules
  # 排除 build 目錄
  - /app/build
```

**說明**:
- `./client/src:/app/src`: 將本地 src 目錄映射到容器內，實現實時同步
- `/app/node_modules`: 匿名卷，避免本地和容器內 node_modules 衝突
- 啟用 `CHOKIDAR_USEPOLLING=true` 確保文件變更檢測正常工作

### 後端 (Node.js) Volume 配置

```yaml
volumes:
  # 實時同步整個後端目錄
  - ./server:/app
  # 排除 node_modules 避免衝突
  - /app/node_modules
command: npx nodemon server.js
```

**說明**:
- `./server:/app`: 將整個後端目錄映射到容器內
- 使用 `nodemon` 監控文件變更並自動重啟服務
- 匿名卷排除 node_modules 避免平台差異問題

## 🔧 開發環境 vs 生產環境

### 開發環境特點

- ✅ 實時代碼同步
- ✅ 熱重載/自動重啟
- ✅ 詳細日誌輸出
- ✅ 開發工具支持
- ❌ 性能較低
- ❌ 映像體積較大

### 生產環境特點

- ✅ 優化性能
- ✅ 最小化映像
- ✅ 安全配置
- ❌ 無實時同步
- ❌ 需要重新構建

## 📋 常用命令

### 基本操作

```bash
# 啟動開發環境
scripts\dev-sync.bat start

# 停止開發環境
scripts\dev-sync.bat stop

# 重啟開發環境
scripts\dev-sync.bat restart

# 查看服務狀態
scripts\dev-sync.bat status
```

### 日誌查看

```bash
# 查看所有服務日誌
scripts\dev-sync.bat logs

# 查看前端日誌
scripts\dev-sync.bat logs client

# 查看後端日誌
scripts\dev-sync.bat logs server

# 查看資料庫日誌
scripts\dev-sync.bat logs postgres
```

### 手動 Docker Compose 操作

```bash
# 使用開發配置啟動
docker-compose -f docker-compose.dev.yml up -d

# 查看服務狀態
docker-compose -f docker-compose.dev.yml ps

# 停止服務
docker-compose -f docker-compose.dev.yml down
```

## 🛠️ 故障排除

### 問題 1: 文件變更沒有觸發重載

**解決方案**:
1. 確認使用的是 `docker-compose.dev.yml` 配置
2. 檢查 Volume 映射是否正確
3. 確認文件監控環境變數已設置:
   ```yaml
   environment:
     - CHOKIDAR_USEPOLLING=true
     - WATCHPACK_POLLING=true
   ```

### 問題 2: 容器啟動失敗

**解決方案**:
1. 檢查端口是否被占用
2. 確認 Docker 和 Docker Compose 版本
3. 查看詳細錯誤日誌:
   ```bash
   docker-compose -f docker-compose.dev.yml logs
   ```

### 問題 3: 性能問題

**解決方案**:
1. 確保排除了 `node_modules` 目錄
2. 使用 `.dockerignore` 排除不必要的文件
3. 考慮使用 Docker Desktop 的文件共享優化

## 📝 最佳實踐

### 1. 目錄結構

```
project/
├── client/                 # 前端代碼
│   ├── src/               # 實時同步
│   ├── public/            # 實時同步
│   └── node_modules/      # 排除同步
├── server/                # 後端代碼
│   ├── *.js               # 實時同步
│   └── node_modules/      # 排除同步
├── docker-compose.yml     # 生產配置
├── docker-compose.dev.yml # 開發配置
└── scripts/
    └── dev-sync.bat       # 開發腳本
```

### 2. 環境變數管理

```bash
# .env.development
NODE_ENV=development
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### 3. 忽略文件配置

```dockerfile
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.cache
```

## 🔄 工作流程

1. **啟動開發環境**
   ```bash
   scripts\dev-sync.bat start
   ```

2. **開發代碼**
   - 修改前端文件 → 瀏覽器自動刷新
   - 修改後端文件 → 服務自動重啟

3. **測試功能**
   - 前端: http://localhost:3000
   - 後端: http://localhost:8080

4. **查看日誌**
   ```bash
   scripts\dev-sync.bat logs
   ```

5. **停止環境**
   ```bash
   scripts\dev-sync.bat stop
   ```

## 🎯 總結

Docker Volume 實時同步功能讓開發更加高效:

- **無需重建**: 代碼變更立即生效
- **快速反饋**: 熱重載和自動重啟
- **環境一致**: 開發和生產環境隔離
- **團隊協作**: 統一的開發環境配置

現在你可以享受流暢的 Docker 開發體驗了！🚀