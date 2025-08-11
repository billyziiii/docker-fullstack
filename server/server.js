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

// 🔥 實時同步演示 - 後端自動重啟功能
const SYNC_DEMO_MESSAGE = 'Docker Volume 後端自動重啟正在運行！修改已生效！';
console.log('🔥', SYNC_DEMO_MESSAGE, new Date().toISOString());
console.log('🎯 nodemon 檢測到文件變化，服務器自動重啟中...');

// 數據庫連接
const { Pool } = require('pg');

// PostgreSQL 連接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/appdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 測試數據庫連接
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ 數據庫連接失敗:', err.stack);
  } else {
    console.log('✅ 數據庫連接成功');
    release();
  }
});

// 根路由
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.json({
      message: '🚀 Docker 全端應用後端 API 服務器運行中！',
      timestamp: new Date().toISOString(),
      syncDemo: SYNC_DEMO_MESSAGE
    });
  }
});

// API 根路由
app.get('/api', (req, res) => {
  res.json({
    message: '🎯 API 服務正常運行',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/health', '/api/auth/register', '/api/auth/login', '/api/user/profile', '/api/game/slot', '/api/game/history']
  });
});

// 健康檢查端點
app.get('/api/health', async (req, res) => {
  try {
    // 檢查數據庫連接
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// 用戶註冊
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: '用戶名、密碼和郵箱不能為空'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密碼長度至少需要6個字符'
      });
    }
    
    // 檢查用戶名是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用戶名已存在'
      });
    }
    
    // 檢查郵箱是否已存在
    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '郵箱已被使用'
      });
    }
    
    // 加密密碼
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 創建新用戶
    const newUser = await pool.query(
      'INSERT INTO users (username, password, email, balance) VALUES ($1, $2, $3, $4) RETURNING id, username, email, balance, created_at',
      [username, hashedPassword, email, 1000] // 新用戶初始餘額 1000
    );
    
    const user = newUser.rows[0];
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          createdAt: user.created_at
        },
        token
      }
    });
    
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 用戶登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用戶名和密碼不能為空'
      });
    }
    
    // 查找用戶
    const userResult = await pool.query(
      'SELECT id, username, password, balance, created_at FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }
    
    const user = userResult.rows[0];
    
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
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({
      success: true,
      message: '登入成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          createdAt: user.created_at
        },
        token
      }
    });
    
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// JWT 驗證中間件
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '訪問令牌缺失'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: '無效的訪問令牌'
    });
  }
};

// 獲取用戶資料
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, balance, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          createdAt: user.created_at
        }
      }
    });
    
  } catch (error) {
    console.error('獲取用戶資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 老虎機遊戲
app.post('/api/game/slot', authenticateToken, async (req, res) => {
  try {
    const { bet } = req.body;
    const userId = req.user.userId;
    
    if (!bet || bet <= 0) {
      return res.status(400).json({
        success: false,
        message: '下注金額必須大於0'
      });
    }
    
    // 檢查用戶餘額
    const userResult = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    
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
    
    // 生成隨機結果
    const symbols = ['🍎', '🍊', '🍋', '🍇', '🍓', '💎'];
    const result = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    // 計算獎金
    let winAmount = 0;
    if (result[0] === result[1] && result[1] === result[2]) {
      // 三個相同
      if (result[0] === '💎') {
        winAmount = bet * 10; // 鑽石獎勵最高
      } else {
        winAmount = bet * 5;
      }
    } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
      // 兩個相同
      winAmount = bet * 2;
    }
    
    const netWin = winAmount - bet;
    const newBalance = currentBalance + netWin;
    
    // 更新用戶餘額
    await pool.query(
      'UPDATE users SET balance = $1 WHERE id = $2',
      [newBalance, userId]
    );
    
    // 記錄遊戲歷史
    await pool.query(
      'INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'slot', bet, winAmount, JSON.stringify(result)]
    );
    
    res.json({
      success: true,
      data: {
        result,
        bet,
        winAmount,
        netWin,
        newBalance,
        isWin: winAmount > 0
      }
    });
    
  } catch (error) {
    console.error('老虎機遊戲錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 獲取遊戲歷史
app.get('/api/game/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const historyResult = await pool.query(
      'SELECT * FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    const history = historyResult.rows.map(row => ({
      id: row.id,
      gameType: row.game_type,
      betAmount: row.bet_amount,
      winAmount: row.win_amount,
      result: JSON.parse(row.result),
      createdAt: row.created_at
    }));
    
    res.json({
      success: true,
      data: { history }
    });
    
  } catch (error) {
    console.error('獲取遊戲歷史錯誤:', error);
    res.status(500).json({
      success: false,
      message: '服務器內部錯誤'
    });
  }
});

// 生產環境的前端路由處理
if (process.env.NODE_ENV === 'production') {
  // 所有非 API 路由都返回 React 應用
  app.get('*', (req, res) => {
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

// 全局錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('全局錯誤:', error);
  res.status(500).json({
    success: false,
    message: '服務器內部錯誤'
  });
});

// 優雅關閉處理
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信號，正在關閉服務器...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信號，正在關閉服務器...');
  await pool.end();
  process.exit(0);
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服務器運行在端口 ${PORT}`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
});