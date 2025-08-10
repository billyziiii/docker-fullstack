# 🐳 Docker 全端開發模板

[![Docker](https://img.shields.io/badge/Docker-20.10+-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)

這是一個完整的 Docker 化全端應用開發模板，提供現代化的開發環境和生產就緒的部署配置。包含前端 React 應用、後端 Node.js API、PostgreSQL 資料庫、Redis 緩存和 Nginx 反向代理。

## 🏗️ 技術棧

### 前端 (Client)
- **React 18** - 現代化前端框架
- **React Router DOM** - 前端路由管理
- **Axios** - HTTP 客戶端庫
- **CSS3** - 響應式設計
- **Nginx** - 靜態文件服務

### 後端 (Server)
- **Node.js 18** - JavaScript 運行環境
- **Express.js** - Web 應用框架
- **JWT** - JSON Web Token 身份驗證
- **Bcrypt** - 密碼加密
- **Helmet** - 安全中間件
- **Morgan** - HTTP 請求日誌
- **Express Rate Limit** - API 速率限制

### 資料庫與緩存
- **PostgreSQL 15** - 關係型資料庫
- **Redis 7** - 內存緩存資料庫

### 基礎設施
- **Docker & Docker Compose** - 容器化部署
- **Nginx** - 反向代理和負載均衡
- **Alpine Linux** - 輕量級基礎鏡像

## 🚀 快速開始

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 1. 克隆專案
```bash
git clone https://github.com/your-username/docker-fullstack-template.git
cd docker-fullstack-template
```

### 2. 環境配置
```bash
# 複製環境變數文件
cp .env.example .env

# 編輯環境變數（可選）
nano .env
```

### 3. 啟動開發環境
```bash
# 構建並啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 4. 訪問應用
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:8080
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379

## 📁 專案結構

```
docker-fullstack-template/
├── client/                 # React 前端應用
│   ├── public/            # 靜態資源
│   ├── src/               # 源代碼
│   ├── Dockerfile         # 前端容器配置
│   ├── nginx.conf         # Nginx 配置
│   └── package.json       # 前端依賴
├── server/                # Node.js 後端應用
│   ├── database/          # 資料庫初始化腳本
│   ├── Dockerfile         # 後端容器配置
│   ├── server.js          # 主服務文件
│   ├── healthcheck.js     # 健康檢查
│   └── package.json       # 後端依賴
├── scripts/               # 開發腳本
│   ├── dev.sh            # Linux/Mac 開發腳本
│   └── dev.bat           # Windows 開發腳本
├── docker-compose.yml     # 開發環境配置
├── docker-compose.prod.yml # 生產環境配置
├── nginx.conf            # 開發環境 Nginx 配置
├── nginx.prod.conf       # 生產環境 Nginx 配置
├── .env.example          # 環境變數範例
└── README.md             # 專案說明
```

## 🔧 開發指南

### 本地開發

#### 啟動開發環境
```bash
# 啟動所有服務
docker-compose up -d

# 僅啟動特定服務
docker-compose up -d postgres redis
```

#### 查看日誌
```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f server
docker-compose logs -f client
```

#### 進入容器
```bash
# 進入後端容器
docker-compose exec server sh

# 進入前端容器
docker-compose exec client sh

# 進入資料庫容器
docker-compose exec postgres psql -U postgres -d appdb
```

### 資料庫管理

#### 連接 PostgreSQL
```bash
# 使用 Docker 連接
docker-compose exec postgres psql -U postgres -d appdb

# 使用外部工具連接
# Host: localhost
# Port: 5433
# Database: appdb
# Username: postgres
# Password: postgres
```

#### 資料庫遷移
```bash
# 執行初始化腳本
docker-compose exec postgres psql -U postgres -d appdb -f /docker-entrypoint-initdb.d/init.sql
```

### API 端點

#### 健康檢查
```bash
GET /health
```

#### 用戶認證
```bash
POST /api/auth/register    # 用戶註冊
POST /api/auth/login       # 用戶登入
GET  /api/auth/profile     # 獲取用戶資料
```

#### 資料操作
```bash
GET    /api/data           # 獲取資料列表
POST   /api/data           # 創建新資料
PUT    /api/data/:id       # 更新資料
DELETE /api/data/:id       # 刪除資料
```

## 🚀 生產部署

### 使用生產配置
```bash
# 使用生產環境配置
docker-compose -f docker-compose.prod.yml up -d

# 構建生產鏡像
docker-compose -f docker-compose.prod.yml build
```

### 環境變數配置
生產環境請務必修改以下環境變數：

```bash
# 安全配置
JWT_SECRET=your-super-secure-jwt-secret
POSTGRES_PASSWORD=your-secure-database-password

# 應用配置
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### SSL/HTTPS 配置
在生產環境中，建議使用 Let's Encrypt 或其他 SSL 證書：

```bash
# 安裝 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 獲取 SSL 證書
sudo certbot --nginx -d your-domain.com
```

## 🔍 故障排除

### 常見問題

#### 1. 端口衝突
```bash
# 檢查端口使用情況
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080
netstat -tulpn | grep :5433

# 修改 docker-compose.yml 中的端口映射
```

#### 2. 資料庫連接失敗
```bash
# 檢查 PostgreSQL 容器狀態
docker-compose ps postgres

# 查看資料庫日誌
docker-compose logs postgres

# 測試資料庫連接
docker-compose exec server node -e "console.log(process.env.DATABASE_URL)"
```

#### 3. Redis 連接問題
```bash
# 檢查 Redis 容器狀態
docker-compose ps redis

# 測試 Redis 連接
docker-compose exec redis redis-cli ping
```

#### 4. 前端無法訪問後端 API
```bash
# 檢查 CORS 配置
# 確認 .env 文件中的 CORS_ORIGIN 設置正確

# 檢查網路連接
docker network ls
docker network inspect docker-fullstack-template_default
```

### 重置環境
```bash
# 停止並刪除所有容器
docker-compose down

# 刪除所有數據卷（注意：這會刪除所有資料）
docker-compose down -v

# 重新構建並啟動
docker-compose up -d --build
```

## 🧪 測試

### 後端測試
```bash
# 進入後端容器
docker-compose exec server sh

# 運行測試
npm test

# 運行測試並監聽變化
npm run test:watch
```

### 前端測試
```bash
# 進入前端容器
docker-compose exec client sh

# 運行測試
npm test
```

## 📊 監控與日誌

### 容器監控
```bash
# 查看容器資源使用情況
docker stats

# 查看容器詳細信息
docker-compose ps
docker inspect fullstack_server
```

### 日誌管理
```bash
# 實時查看日誌
docker-compose logs -f --tail=100

# 查看特定時間範圍的日誌
docker-compose logs --since="2024-01-01T00:00:00" --until="2024-01-02T00:00:00"
```

## 🤝 貢獻指南

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 版本歷史

- **v1.0.0** - 初始版本
  - 基本的全端應用架構
  - Docker 容器化配置
  - PostgreSQL 和 Redis 整合
  - JWT 身份驗證
  - 基礎 API 端點

## 📄 授權條款

此專案採用 MIT 授權條款 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 👥 作者

- **billyziiii** 

