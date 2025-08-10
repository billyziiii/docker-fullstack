import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 設置 axios 默認配置
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// 設置請求攔截器來添加 token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 🔥 實時同步演示 - 這個修改會立即在瀏覽器中顯示！
  const [syncDemo] = useState('Docker Volume 實時同步正在運行！');

  useEffect(() => {
    // 檢查是否有保存的 token
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setCurrentPage('game');
    }
  }, []);

  const handleLogin = async (username, password) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post('/api/auth/login', { username, password });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setCurrentPage('game');
      }
    } catch (err) {
      setError(err.response?.data?.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username, password) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post('/api/auth/register', { username, password });
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setCurrentPage('game');
      }
    } catch (err) {
      setError(err.response?.data?.message || '註冊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('login');
  };

  const updateUserBalance = (newBalance) => {
    const updatedUser = { ...user, balance: newBalance };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <div className="App">
      {/* 🔥 實時同步演示橫幅 */}
      <div style={{
        backgroundColor: '#ff6b35',
        color: 'white',
        padding: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        🔥 {syncDemo} - 修改代碼即時生效！
      </div>
      
      {currentPage === 'login' && (
        <LoginPage 
          onLogin={handleLogin}
          onSwitchToRegister={() => setCurrentPage('register')}
          loading={loading}
          error={error}
        />
      )}
      
      {currentPage === 'register' && (
        <RegisterPage 
          onRegister={handleRegister}
          onSwitchToLogin={() => setCurrentPage('login')}
          loading={loading}
          error={error}
        />
      )}
      
      {currentPage === 'game' && user && (
        <GamePage 
          user={user}
          onLogout={handleLogout}
          onUpdateBalance={updateUserBalance}
        />
      )}
    </div>
  );
}

// 登入頁面組件
function LoginPage({ onLogin, onSwitchToRegister, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🎰 娛樂城登入</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="用戶名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <p className="auth-switch">
          還沒有帳號？ 
          <button type="button" onClick={onSwitchToRegister}>註冊</button>
        </p>
      </div>
    </div>
  );
}

// 註冊頁面組件
function RegisterPage({ onRegister, onSwitchToLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (password !== confirmPassword) {
      setLocalError('密碼確認不匹配');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('密碼長度至少6位');
      return;
    }
    
    if (username && password) {
      onRegister(username, password);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🎰 娛樂城註冊</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="用戶名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="密碼 (至少6位)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="確認密碼"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {(error || localError) && <p className="error">{error || localError}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>
        <p className="auth-switch">
          已有帳號？ 
          <button type="button" onClick={onSwitchToLogin}>登入</button>
        </p>
      </div>
    </div>
  );
}

// 遊戲頁面組件
function GamePage({ user, onLogout, onUpdateBalance }) {
  const [bet, setBet] = useState(100);
  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(false);






  const playSlot = async () => {
    if (bet > user.balance) {
      alert('餘額不足！');
      return;
    }

    try {
      setLoading(true);
      setGameResult(null);
      
      const response = await axios.post('/api/game/slot', { bet });
      
      if (response.data.success) {
        setGameResult(response.data.data);
        onUpdateBalance(response.data.data.newBalance);

      }
    } catch (err) {
      alert(err.response?.data?.message || '遊戲失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>🏎️ F1 RACING SLOT</h1>
        <div className="user-info">
          <span>歡迎, {user.username}!</span>
          <span className="balance">餘額: {user.balance} 金幣</span>
          <button onClick={onLogout} className="logout-btn">登出</button>
        </div>
      </header>

      <div className="game-content">
        <div className="slot-machine">
          <div className="slot-display">
            {gameResult ? (
              <div className="slot-result">
                {gameResult.result.map((symbol, index) => (
                  <div key={index} className="slot-symbol">{symbol}</div>
                ))}
              </div>
            ) : (
              <div className="slot-result">
                <div className="slot-symbol">🏎️</div>
                <div className="slot-symbol">🏎️</div>
                <div className="slot-symbol">🏎️</div>
              </div>
            )}
          </div>

          <div className="bet-controls">
            <label>下注金額:</label>
            <input
              type="number"
              min="10"
              max={user.balance}
              step="10"
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
            />
            <button 
              onClick={playSlot} 
              disabled={loading || bet > user.balance}
              className="play-btn"
            >
              {loading ? '遊戲中...' : '開始遊戲'}
            </button>
          </div>

          {gameResult && (
            <div className={`game-result ${gameResult.isWin ? 'win' : 'lose'}`}>
              <h3>{gameResult.message}</h3>
              <p>下注: {gameResult.bet} 金幣</p>
              <p>獲得: {gameResult.winAmount} 金幣</p>
              {gameResult.multiplier > 0 && (
                <p>倍數: {gameResult.multiplier}x</p>
              )}
            </div>
          )}
        </div>

        <div className="game-info">
          <h3>🏁 F1積分規則</h3>
          <ul>
            <li>🏎️ 三個相同: 10倍 (冠軍)</li>
            <li>🏆 三個相同: 8倍 (頒獎台)</li>
            <li>🏁 三個相同: 6倍 (格子旗)</li>
            <li>⚡ 三個相同: 4倍 (極速)</li>
            <li>🔧 三個相同: 3倍 (維修)</li>
            <li>🛞 三個相同: 2倍 (輪胎)</li>
            <li>⛽ 三個相同: 1.5倍 (燃料)</li>
            <li>兩個相同: 0.5倍 (積分)</li>
          </ul>
          

        </div>
      </div>
    </div>
  );
}

export default App;