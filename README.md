# Docker Fullstack Template

一個完整的全端開發模板，使用 Docker Compose 整合 React 前端、Node.js 後端和 PostgreSQL 數據庫。

## 🏗️ 技術棧

- **前端**: React.js
- **後端**: Node.js + Express
- **數據庫**: PostgreSQL
- **容器化**: Docker + Docker Compose

## 🚀 快速開始

### 前置需求
- Docker
- Docker Compose

### 啟動服務

```bash
# 克隆專案
git clone https://github.com/billyziiii/docker-fullstack.git
cd docker-fullstack

# 啟動所有服務
docker-compose up --build -d
```

### 訪問應用

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:8080
- **健康檢查**: http://localhost:8080/api/health

### 停止服務

```bash
docker-compose down
```

## 📁 專案結構

