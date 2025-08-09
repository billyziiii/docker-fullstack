@echo off
setlocal enabledelayedexpansion

REM Windows 開發環境管理腳本
REM 使用方法: scripts\dev.bat [command]

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 打印帶顏色的消息
:print_message
echo %GREEN%[INFO]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:print_header
echo %BLUE%================================%NC%
echo %BLUE%  %~1%NC%
echo %BLUE%================================%NC%
goto :eof

REM 檢查 Docker 和 Docker Compose
:check_requirements
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker 未安裝或不在 PATH 中"
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Compose 未安裝或不在 PATH 中"
    exit /b 1
)
goto :eof

REM 啟動開發環境
:start_dev
call :print_header "啟動開發環境"

if not exist ".env" (
    call :print_warning ".env 文件不存在，從 .env.example 複製"
    copy .env.example .env >nul
)

call :print_message "構建並啟動所有服務..."
docker-compose up -d

call :print_message "等待服務啟動..."
timeout /t 10 /nobreak >nul

call :print_message "檢查服務狀態..."
docker-compose ps

call :print_message "開發環境已啟動！"
echo %GREEN%前端:%NC% http://localhost:3000
echo %GREEN%後端:%NC% http://localhost:8080
echo %GREEN%健康檢查:%NC% http://localhost:8080/api/health
goto :eof

REM 停止開發環境
:stop_dev
call :print_header "停止開發環境"
call :print_message "停止所有服務..."
docker-compose down
call :print_message "開發環境已停止"
goto :eof

REM 重啟開發環境
:restart_dev
call :print_header "重啟開發環境"
call :stop_dev
call :start_dev
goto :eof

REM 查看日誌
:show_logs
call :print_header "查看服務日誌"
if "%~2"=="" (
    call :print_message "查看所有服務日誌..."
    docker-compose logs -f
) else (
    call :print_message "查看 %~2 服務日誌..."
    docker-compose logs -f %~2
)
goto :eof

REM 重新構建服務
:rebuild
call :print_header "重新構建服務"
if "%~2"=="" (
    call :print_message "重新構建所有服務..."
    docker-compose build --no-cache
    docker-compose up -d
) else (
    call :print_message "重新構建 %~2 服務..."
    docker-compose build --no-cache %~2
    docker-compose up -d %~2
)
goto :eof

REM 清理環境
:clean
call :print_header "清理開發環境"
call :print_warning "這將刪除所有容器、網絡和卷！"
set /p "confirm=確定要繼續嗎？ (y/N): "
if /i "!confirm!"=="y" (
    call :print_message "停止並刪除所有服務..."
    docker-compose down -v --rmi all
    call :print_message "清理 Docker 系統..."
    docker system prune -f
    call :print_message "環境清理完成"
) else (
    call :print_message "取消清理操作"
)
goto :eof

REM 進入容器
:shell
if "%~2"=="" (
    call :print_error "請指定服務名稱: scripts\dev.bat shell [service-name]"
    echo 可用服務: client, server, postgres, redis
) else (
    call :print_message "進入 %~2 容器..."
    docker-compose exec %~2 sh
)
goto :eof

REM 數據庫備份
:db_backup
call :print_header "備份數據庫"
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "backup_file=backup_%YYYY%%MM%%DD%_%HH%%Min%%Sec%.sql"
call :print_message "備份數據庫到 !backup_file!..."
docker-compose exec postgres pg_dump -U postgres appdb > "!backup_file!"
call :print_message "數據庫備份完成: !backup_file!"
goto :eof

REM 數據庫恢復
:db_restore
if "%~2"=="" (
    call :print_error "請指定備份文件: scripts\dev.bat db:restore [backup-file]"
) else (
    call :print_header "恢復數據庫"
    call :print_message "從 %~2 恢復數據庫..."
    docker-compose exec -T postgres psql -U postgres appdb < "%~2"
    call :print_message "數據庫恢復完成"
)
goto :eof

REM 運行測試
:test
call :print_header "運行測試"
if "%~2"=="" (
    call :print_message "運行所有測試..."
    docker-compose exec client npm test
    docker-compose exec server npm test
) else (
    if "%~2"=="client" (
        call :print_message "運行前端測試..."
        docker-compose exec client npm test
    ) else if "%~2"=="server" (
        call :print_message "運行後端測試..."
        docker-compose exec server npm test
    ) else (
        call :print_error "未知的測試目標: %~2"
        echo 可用選項: client, server
    )
)
goto :eof

REM 顯示幫助信息
:show_help
echo Docker 全端開發環境管理腳本
echo.
echo 使用方法: scripts\dev.bat [command] [options]
echo.
echo 可用命令:
echo   start          啟動開發環境
echo   stop           停止開發環境
echo   restart        重啟開發環境
echo   logs [service] 查看日誌 (可選指定服務)
echo   rebuild [service] 重新構建服務 (可選指定服務)
echo   clean          清理所有容器和數據
echo   shell ^<service^> 進入指定容器
echo   db:backup      備份數據庫
echo   db:restore ^<file^> 恢復數據庫
echo   test [target]  運行測試 (client/server)
echo   help           顯示此幫助信息
echo.
echo 示例:
echo   scripts\dev.bat start
echo   scripts\dev.bat logs server
echo   scripts\dev.bat shell client
echo   scripts\dev.bat rebuild server
echo   scripts\dev.bat test client
goto :eof

REM 主函數
call :check_requirements

set "command=%~1"
if "%command%"=="" set "command=help"

if "%command%"=="start" (
    call :start_dev
) else if "%command%"=="stop" (
    call :stop_dev
) else if "%command%"=="restart" (
    call :restart_dev
) else if "%command%"=="logs" (
    call :show_logs %*
) else if "%command%"=="rebuild" (
    call :rebuild %*
) else if "%command%"=="clean" (
    call :clean
) else if "%command%"=="shell" (
    call :shell %*
) else if "%command%"=="db:backup" (
    call :db_backup
) else if "%command%"=="db:restore" (
    call :db_restore %*
) else if "%command%"=="test" (
    call :test %*
) else if "%command%"=="help" (
    call :show_help
) else (
    call :print_error "未知命令: %command%"
    call :show_help
    exit /b 1
)

endlocal