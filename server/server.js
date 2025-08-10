const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 中間件設置
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100 // 限制每個 IP 15 分鐘內最多 100 個請求
});
app.use('/api/', limiter);

// 解析 JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 靜態文件服務 (用於 Render 部署)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// 🔥 實時同步演示 - 後端自動重啟功能 (已更新！)
const SYNC_DEMO_MESSAGE = 'Docker Volume 後端自動重啟正在運行！修改已生效！';
console.log('🔥', SYNC_DEMO_MESSAGE, new Date().toISOString());
console.log('🎯 nodemon 檢測到文件變化，服務器自動重啟中...');

// 數據庫連接
const { Pool } = require('pg');
const redis = require('redis');

// PostgreSQL 連接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/appdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis 連接
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

// 連接到 Redis
redisClient.connect().catch(console.error);

// 測試數據庫連接
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL');
    release();
  }
});

// 路由
app.get('/', (req, res) => {
  res.json({
    message: '🐳 Docker Fullstack API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 健康檢查端點
app.get('/api/health', async (req, res) => {
  try {
    // 檢查 PostgreSQL 連接
    const pgResult = await pool.query('SELECT NOW()');
    
    // 檢查 Redis 連接
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      message: 'All services are running',
      services: {
        database: 'connected',
        redis: 'connected',
        server: 'running'
      },
      timestamp: pgResult.rows[0].now
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Service check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 用戶註冊 API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用戶名和密碼為必填項'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密碼長度至少6位'
      });
    }

    // 檢查用戶名是否已存在
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '用戶名已存在'
      });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 創建用戶，初始餘額為1000，使用用戶名作為默認email
    const result = await pool.query(
      'INSERT INTO users (username, password, email, balance) VALUES ($1, $2, $3, $4) RETURNING id, username, balance, created_at',
      [username, hashedPassword, `${username}@example.com`, 1000]
    );

    const user = result.rows[0];
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance
        },
        token
      }
    });
  } catch (error) {
    console.error('用戶註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 用戶登入 API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用戶名和密碼為必填項'
      });
    }

    // 查找用戶
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    const user = result.rows[0];
    
    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: '登入成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance
        },
        token
      }
    });
  } catch (error) {
    console.error('用戶登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// JWT 驗證中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '需要登入才能訪問'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token 無效或已過期'
      });
    }
    req.user = user;
    next();
  });
};

// 獲取用戶餘額 API
app.get('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    res.json({
      success: true,
      data: {
        balance: result.rows[0].balance
      }
    });
  } catch (error) {
    console.error('獲取餘額錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 拉霸機遊戲 API
app.post('/api/game/slot', authenticateToken, async (req, res) => {
  try {
    const { bet } = req.body;
    
    if (!bet || bet <= 0) {
      return res.status(400).json({
        success: false,
        message: '下注金額必須大於0'
      });
    }

    // 檢查用戶餘額
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    const currentBalance = userResult.rows[0].balance;
    if (currentBalance < bet) {
      return res.status(400).json({
        success: false,
        message: '餘額不足'
      });
    }

    // 生成拉霸機結果 (3個轉輪，每個有7種F1符號)
    const symbols = ['⛽', '🛞', '🔧', '⚡', '🏁', '🏆', '🏎️'];
    const result = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    // 計算獲勝倍數
    let multiplier = 0;
    if (result[0] === result[1] && result[1] === result[2]) {
      // 三個相同
      switch (result[0]) {
        case '🏎️': multiplier = 10; break;  // F1賽車 (冠軍)
        case '🏆': multiplier = 8; break;   // 冠軍獎盃 (頒獎台)
        case '🏁': multiplier = 6; break;   // 格子旗
        case '⚡': multiplier = 4; break;   // 閃電 (極速)
        case '🔧': multiplier = 3; break;   // 扳手 (維修)
        case '🛞': multiplier = 2; break;   // 輪胎
        case '⛽': multiplier = 1.5; break; // 燃料
      }
    } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
      // 兩個相同
      multiplier = 0.5;
    }

    const winAmount = Math.floor(bet * multiplier);
    const newBalance = currentBalance - bet + winAmount;
    const isWin = winAmount > bet;

    // 更新用戶餘額
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.user.userId]);

    // 記錄遊戲歷史
    await pool.query(
      'INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [req.user.userId, 'slot', bet, winAmount, JSON.stringify(result)]
    );

    res.json({
      success: true,
      data: {
        result,
        bet,
        winAmount,
        isWin,
        multiplier,
        newBalance,
        message: isWin ? `恭喜！您贏得了 ${winAmount} 金幣！` : '很遺憾，這次沒有中獎。'
      }
    });
  } catch (error) {
    console.error('拉霸機遊戲錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 獲取遊戲歷史 API
app.get('/api/game/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取遊戲歷史錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 前端路由處理 (用於 Render 部署)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // 如果是 API 路由，返回 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        message: 'API endpoint not found'
      });
    }
    // 否則返回前端應用
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // 開發環境的 404 處理
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });
}

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
