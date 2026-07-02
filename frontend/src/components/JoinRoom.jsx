import { useState, useEffect } from 'react';
import { loadSession, request } from '../api';
import { useNavigate } from 'react-router-dom';

export default function JoinRoom({ socket, setMessage }) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const session = loadSession();

  useEffect(() => {
    socket.on('room-joined', async (info) => {
      setMessage('✅ Вы подключены к комнате');
      setLoading(false);
      
      try {
        // Получаем данные сессии с вопросами
        const sessionData = await request(`/quizzes/sessions/room/${roomCode}`);
        
        navigate(`/quiz/play/${roomCode}`, { 
          state: { 
            roomInfo: {
              roomCode: roomCode,
              sessionId: info.sessionId,
              title: sessionData.title,
              isOrganizer: false,
              questions: sessionData.questions || [],
              questionTime: sessionData.question_time || 20
            }
          }
        });
      } catch (err) {
        setMessage(`✗ ${err.message}`);
      }
    });

    socket.on('error-message', (msg) => {
      setMessage(`✗ ${msg}`);
      setLoading(false);
    });

    return () => {
      socket.off('room-joined');
      socket.off('error-message');
    };
  }, [socket, setMessage, navigate, roomCode]);

  const handleJoin = () => {
    if (!roomCode.trim()) {
      setMessage('✗ Введите код комнаты');
      return;
    }

    setLoading(true);
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join-room', { 
      roomCode: roomCode.toUpperCase(), 
      token: session?.token 
    });
  };

  return (
    <div className="join-room">
      <div className="join-card">
        <h2>Присоединиться к квизу</h2>
        <p>Введите код комнаты, который дал организатор</p>
        
        <div className="input-group">
          <input
            type="text"
            placeholder="Код комнаты (например: ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            disabled={loading}
            maxLength={6}
          />
          <button onClick={handleJoin} className="btn-primary" disabled={loading}>
            {loading ? 'Подключение...' : 'Присоединиться'}
          </button>
        </div>
      </div>
    </div>
  );
}