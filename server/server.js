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

// 數據庫連接 (移除 Redis)
const { Pool } = require('pg');

// PostgreSQL 連接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/appdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// PostgreSQL 緩存類 (替代 Redis)
class PostgreSQLCache {
  constructor(pool) {
    this.pool = pool;
    this.startCleanupInterval();
    console.log('✅ PostgreSQL Cache initialized');
  }

  startCleanupInterval() {
    // 每 5 分鐘清理過期數據
    setInterval(async () => {
      try {
        const result = await this.pool.query('SELECT cleanup_expired_cache() as deleted_count');
        const deletedCount = result.rows[0].deleted_count;
        if (deletedCount > 0) {
          console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
        }
      } catch (err) {
        console.error('❌ Cache cleanup error:', err);
      }
    }, 5 * 60 * 1000);
  }

  async set(key, value, ttl = null) {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
      await this.pool.query(
        'INSERT INTO cache (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP',
        [key, JSON.stringify(value), expiresAt]
      );
      console.log(`📝 Cache SET: ${key} (TTL: ${ttl || 'never'})`);
    } catch (err) {
      console.error('❌ Cache SET error:', err);
      throw err;
    }
  }

  async get(key) {
    try {
      const result = await this.pool.query(
        'SELECT value FROM cache WHERE key = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
        [key]
      );
      const value = result.rows.length > 0 ? JSON.parse(result.rows[0].value) : null;
      console.log(`📖 Cache GET: ${key} = ${value ? 'HIT' : 'MISS'}`);
      return value;
    } catch (err) {
      console.error('❌ Cache GET error:', err);
      return null;
    }
  }

  async delete(key) {
    try {
      const result = await this.pool.query('DELETE FROM cache WHERE key = $1', [key]);
      console.log(`🗑️ Cache DELETE: ${key} (${result.rowCount} rows affected)`);
      return result.rowCount > 0;
    } catch (err) {
      console.error('❌ Cache DELETE error:', err);
      return false;
    }
  }

  async has(key) {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM cache WHERE key = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
        [key]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.error('❌ Cache HAS error:', err);
      return false;
    }
  }

  async clear() {
    try {
      const result = await this.pool.query('DELETE FROM cache');
      console.log(`🧹 Cache CLEAR: ${result.rowCount} entries removed`);
      return result.rowCount;
    } catch (err) {
      console.error('❌ Cache CLEAR error:', err);
      return 0;
    }
  }

  // 模擬 Redis ping
  async ping() {
    try {
      await this.pool.query('SELECT 1');
      return 'PONG';
    } catch (err) {
      throw new Error('Cache ping failed: ' + err.message);
    }
  }

  // 獲取緩存統計信息
  async getStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_entries,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_entries,
          COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_entries
        FROM cache
      `);
      return result.rows[0];
    } catch (err) {
      console.error('❌ Cache stats error:', err);
      return null;
    }
  }
}

// 創建緩存實例
const pgCache = new PostgreSQLCache(pool);

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
    cache: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// 將根路由改為 API 路由，避免覆蓋前端頁面
app.get('/api', (req, res) => {
  res.json({
    message: '🐳 Docker Fullstack API Server',
    version: '1.0.0',
    status: 'running',
    cache: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// 健康檢查端點 (移除 Redis 檢查)
app.get('/api/health', async (req, res) => {
  try {
    // 檢查 PostgreSQL 連接
    const pgResult = await pool.query('SELECT NOW()');
    
    // 檢查緩存連接
    await pgCache.ping();
    
    // 獲取緩存統計
    const cacheStats = await pgCache.getStats();
    
    res.json({
      status: 'healthy',
      message: 'All services are running',
      services: {
        database: 'connected',
        cache: 'connected (PostgreSQL)',
        server: 'running'
      },
      cache_stats: cacheStats,
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

// 緩存管理 API
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await pgCache.getStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get cache stats',
      error: error.message
    });
  }
});

app.delete('/api/cache/clear', async (req, res) => {
  try {
    const deletedCount = await pgCache.clear();
    res.json({
      success: true,
      message: `Cleared ${deletedCount} cache entries`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
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
      return res.status(400).json({
        success: false,
        message: '用戶名已存在'
      });
    }

    // 加密密碼
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 創建用戶
    const result = await pool.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, balance',
      [username, hashedPassword, `${username}@example.com`]
    );

    const user = result.rows[0];
    
    // 緩存用戶信息
    await pgCache.set(`user:${user.id}`, {
      id: user.id,
      username: user.username,
      balance: user.balance
    }, 3600); // 1小時過期

    res.json({
      success: true,
      message: '註冊成功',
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: '註冊失敗',
      error: error.message
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

    // 先檢查緩存
    const cachedUser = await pgCache.get(`login:${username}`);
    let user;
    
    if (cachedUser) {
      user = cachedUser;
      console.log('🚀 User login from cache');
    } else {
      // 從數據庫查詢用戶
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用戶名或密碼錯誤'
        });
      }
      user = result.rows[0];
      
      // 緩存用戶登入信息
      await pgCache.set(`login:${username}`, user, 1800); // 30分鐘過期
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤'
      });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 緩存用戶會話
    await pgCache.set(`session:${user.id}`, {
      userId: user.id,
      username: user.username,
      loginTime: new Date().toISOString()
    }, 7 * 24 * 3600); // 7天過期

    res.json({
      success: true,
      message: '登入成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登入失敗',
      error: error.message
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
      message: '需要提供訪問令牌'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 檢查會話緩存
    const session = await pgCache.get(`session:${decoded.userId}`);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: '會話已過期，請重新登入'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: '無效的訪問令牌'
    });
  }
};

// 獲取用戶資料 API
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    // 先檢查緩存
    const cachedUser = await pgCache.get(`user:${req.user.userId}`);
    let user;
    
    if (cachedUser) {
      user = cachedUser;
      console.log('🚀 User profile from cache');
    } else {
      const result = await pool.query(
        'SELECT id, username, balance, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用戶不存在'
        });
      }
      
      user = result.rows[0];
      
      // 緩存用戶資料
      await pgCache.set(`user:${user.id}`, user, 3600); // 1小時過期
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶資料失敗',
      error: error.message
    });
  }
});

// 老虎機遊戲 API
app.post('/api/game/slot', authenticateToken, async (req, res) => {
  try {
    const { betAmount } = req.body;
    const userId = req.user.userId;
    
    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: '下注金額必須大於0'
      });
    }

    // 獲取用戶餘額
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    if (user.balance < betAmount) {
      return res.status(400).json({
        success: false,
        message: '餘額不足'
      });
    }

    // 生成隨機結果
    const symbols = ['🍒', '🍊', '🍋', '🍇', '🔔', '⭐', '💎'];
    const result = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    // 計算獎金
    let winAmount = 0;
    if (result[0] === result[1] && result[1] === result[2]) {
      // 三個相同
      if (result[0] === '💎') winAmount = betAmount * 10;
      else if (result[0] === '⭐') winAmount = betAmount * 5;
      else if (result[0] === '🔔') winAmount = betAmount * 3;
      else winAmount = betAmount * 2;
    } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
      // 兩個相同
      winAmount = Math.floor(betAmount * 0.5);
    }

    // 更新用戶餘額
    const newBalance = user.balance - betAmount + winAmount;
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);

    // 記錄遊戲歷史
    await pool.query(
      'INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'slot', betAmount, winAmount, JSON.stringify(result)]
    );

    // 更新緩存中的用戶餘額
    await pgCache.delete(`user:${userId}`);
    
    // 緩存遊戲結果
    await pgCache.set(`game:${userId}:latest`, {
      result,
      betAmount,
      winAmount,
      newBalance,
      timestamp: new Date().toISOString()
    }, 300); // 5分鐘過期

    res.json({
      success: true,
      result,
      betAmount,
      winAmount,
      newBalance,
      message: winAmount > 0 ? `恭喜！您贏得了 ${winAmount} 金幣！` : '很遺憾，這次沒有中獎。'
    });
  } catch (error) {
    console.error('Slot game error:', error);
    res.status(500).json({
      success: false,
      message: '遊戲失敗',
      error: error.message
    });
  }
});

// 獲取遊戲歷史 API
app.get('/api/game/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // 先檢查緩存
    const cacheKey = `history:${userId}:${limit}:${offset}`;
    const cachedHistory = await pgCache.get(cacheKey);
    
    if (cachedHistory) {
      console.log('🚀 Game history from cache');
      return res.json({
        success: true,
        history: cachedHistory.history,
        total: cachedHistory.total
      });
    }
    
    // 從數據庫獲取
    const historyResult = await pool.query(
      'SELECT * FROM game_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM game_history WHERE user_id = $1',
      [userId]
    );
    
    const history = historyResult.rows;
    const total = parseInt(countResult.rows[0].count);
    
    // 緩存結果
    await pgCache.set(cacheKey, { history, total }, 300); // 5分鐘過期
    
    res.json({
      success: true,
      history,
      total
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      message: '獲取遊戲歷史失敗',
      error: error.message
    });
  }
});

// 生產環境靜態文件處理
if (process.env.NODE_ENV === 'production') {
  // 處理前端路由
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

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 優雅關閉 (移除 Redis)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  console.log('✅ PostgreSQL connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  console.log('✅ PostgreSQL connection closed');
  process.exit(0);
});

// 啟動服務器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Cache: PostgreSQL`);
});
