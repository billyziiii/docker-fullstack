# 開發環境 Dockerfile
FROM node:18-alpine as development

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# 暴露端口
EXPOSE 3000

# 開發模式啟動
CMD ["npm", "start"]

# 生產環境構建階段
FROM node:18-alpine as build

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build

# 生產環境運行階段
FROM nginx:alpine as production

# 複製構建結果到 nginx
COPY --from=build /app/build /usr/share/nginx/html

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]