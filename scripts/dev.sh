#!/bin/bash

# 開發環境管理腳本
# 使用方法: ./scripts/dev.sh [command]

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印帶顏色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 檢查 Docker 和 Docker Compose
check_requirements() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安裝或不在 PATH 中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安裝或不在 PATH 中"
        exit 1
    fi
}

# 啟動開發環境
start_dev() {
    print_header "啟動開發環境"
    
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在，從 .env.example 複製"
        cp .env.example .env
    fi
    
    print_message "構建並啟動所有服務..."
    docker-compose up -d
    
    print_message "等待服務啟動..."
    sleep 10
    
    print_message "檢查服務狀態..."
    docker-compose ps
    
    print_message "開發環境已啟動！"
    echo -e "${GREEN}前端:${NC} http://localhost:3000"
    echo -e "${GREEN}後端:${NC} http://localhost:8080"
    echo -e "${GREEN}健康檢查:${NC} http://localhost:8080/api/health"
}

# 停止開發環境
stop_dev() {
    print_header "停止開發環境"
    print_message "停止所有服務..."
    docker-compose down
    print_message "開發環境已停止"
}

# 重啟開發環境
restart_dev() {
    print_header "重啟開發環境"
    stop_dev
    start_dev
}

# 查看日誌
show_logs() {
    print_header "查看服務日誌"
    if [ -n "$2" ]; then
        print_message "查看 $2 服務日誌..."
        docker-compose logs -f "$2"
    else
        print_message "查看所有服務日誌..."
        docker-compose logs -f
    fi
}

# 重新構建服務
rebuild() {
    print_header "重新構建服務"
    if [ -n "$2" ]; then
        print_message "重新構建 $2 服務..."
        docker-compose build --no-cache "$2"
        docker-compose up -d "$2"
    else
        print_message "重新構建所有服務..."
        docker-compose build --no-cache
        docker-compose up -d
    fi
}

# 清理環境
clean() {
    print_header "清理開發環境"
    print_warning "這將刪除所有容器、網絡和卷！"
    read -p "確定要繼續嗎？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "停止並刪除所有服務..."
        docker-compose down -v --rmi all
        print_message "清理 Docker 系統..."
        docker system prune -f
        print_message "環境清理完成"
    else
        print_message "取消清理操作"
    fi
}

# 進入容器
shell() {
    if [ -n "$2" ]; then
        print_message "進入 $2 容器..."
        docker-compose exec "$2" sh
    else
        print_error "請指定服務名稱: ./scripts/dev.sh shell [service-name]"
        echo "可用服務: client, server, postgres, redis"
    fi
}

# 數據庫操作
db_backup() {
    print_header "備份數據庫"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_message "備份數據庫到 $BACKUP_FILE..."
    docker-compose exec postgres pg_dump -U postgres appdb > "$BACKUP_FILE"
    print_message "數據庫備份完成: $BACKUP_FILE"
}

db_restore() {
    if [ -n "$2" ]; then
        print_header "恢復數據庫"
        print_message "從 $2 恢復數據庫..."
        docker-compose exec -T postgres psql -U postgres appdb < "$2"
        print_message "數據庫恢復完成"
    else
        print_error "請指定備份文件: ./scripts/dev.sh db:restore [backup-file]"
    fi
}

# 運行測試
test() {
    print_header "運行測試"
    if [ -n "$2" ]; then
        case "$2" in
            "client")
                print_message "運行前端測試..."
                docker-compose exec client npm test
                ;;
            "server")
                print_message "運行後端測試..."
                docker-compose exec server npm test
                ;;
            *)
                print_error "未知的測試目標: $2"
                echo "可用選項: client, server"
                ;;
        esac
    else
        print_message "運行所有測試..."
        docker-compose exec client npm test
        docker-compose exec server npm test
    fi
}

# 顯示幫助信息
show_help() {
    echo "Docker 全端開發環境管理腳本"
    echo ""
    echo "使用方法: ./scripts/dev.sh [command] [options]"
    echo ""
    echo "可用命令:"
    echo "  start          啟動開發環境"
    echo "  stop           停止開發環境"
    echo "  restart        重啟開發環境"
    echo "  logs [service] 查看日誌 (可選指定服務)"
    echo "  rebuild [service] 重新構建服務 (可選指定服務)"
    echo "  clean          清理所有容器和數據"
    echo "  shell <service> 進入指定容器"
    echo "  db:backup      備份數據庫"
    echo "  db:restore <file> 恢復數據庫"
    echo "  test [target]  運行測試 (client/server)"
    echo "  help           顯示此幫助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/dev.sh start"
    echo "  ./scripts/dev.sh logs server"
    echo "  ./scripts/dev.sh shell client"
    echo "  ./scripts/dev.sh rebuild server"
    echo "  ./scripts/dev.sh test client"
}

# 主函數
main() {
    check_requirements
    
    case "${1:-help}" in
        "start")
            start_dev
            ;;
        "stop")
            stop_dev
            ;;
        "restart")
            restart_dev
            ;;
        "logs")
            show_logs "$@"
            ;;
        "rebuild")
            rebuild "$@"
            ;;
        "clean")
            clean
            ;;
        "shell")
            shell "$@"
            ;;
        "db:backup")
            db_backup
            ;;
        "db:restore")
            db_restore "$@"
            ;;
        "test")
            test "$@"
            ;;
        "help")
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"