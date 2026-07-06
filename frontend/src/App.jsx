import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { loadSession, clearSession, request, saveSession } from './api';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import QuizCreatePage from './pages/QuizCreatePage';
import QuizEditPage from './pages/QuizEditPage';
import QuizLobbyPage from './pages/QuizLobbyPage';
import QuizPlayPage from './pages/QuizPlayPage';
import QuizResultsPage from './pages/QuizResultsPage';
import './styles.css';

const socket = (() => {
  if (typeof window !== 'undefined' && window.__QUIZ_SOCKET_FACTORY__) {
    return window.__QUIZ_SOCKET_FACTORY__();
  }
  return io('http://localhost:4000', { autoConnect: false });
})();

function AppContent() {
  const [session, setSession] = useState(loadSession());
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  const handleAuth = async (data, type) => {
    try {
      const endpoint = type === 'register' ? '/auth/register' : '/auth/login';
      const result = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (result.token) {
        saveSession(result.user, result.token);
        setSession({ user: result.user, token: result.token });
        setMessage(type === 'register' ? '✅ Регистрация успешна' : '✅ Вход выполнен');
        navigate('/dashboard');
      } else {
        setMessage(`✗ ${result.error || 'Ошибка'}`);
      }
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    socket.disconnect();
    navigate('/auth');
    setMessage('✅ Вы вышли из системы');
  };

  return (
    <div className="app">
      {session && (
        <header className="app-header">
          <div className="header-content">
            <h1 onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
              Quizeee🧠
            </h1>
            <div className="header-info">
              <span className="username">@{session.user.username}</span>
              <button onClick={handleLogout} className="logout-btn">Выйти</button>
            </div>
          </div>  
        </header>
      )}

      <main className="app-main">
        <Routes>
          <Route path="/auth" element={
            <AuthPage onAuth={handleAuth} setMessage={setMessage} />
          } />
          <Route path="/dashboard" element={
            session ? <Dashboard socket={socket} setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/quiz/create" element={
            session ? <QuizCreatePage setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/quiz/edit/:id" element={
            session ? <QuizEditPage setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/quiz/lobby/:roomCode" element={
            session ? <QuizLobbyPage socket={socket} setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/quiz/play/:roomCode" element={
            session ? <QuizPlayPage socket={socket} setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/quiz/results/:id" element={
            session ? <QuizResultsPage setMessage={setMessage} /> : <Navigate to="/auth" />
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;