import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '../api';

export default function QuizLobbyPage({ socket, setMessage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, quiz } = location.state || {};
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (!session || !quiz) {
      navigate('/dashboard');
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit('organizer-join', { roomCode: session.room_code });
    loadParticipants();

    socket.on('participant-joined', (data) => {
      setParticipants(prev => [...prev, data]);
      setMessage(`✅ ${data.username} присоединился`);
    });

    return () => {
      socket.off('participant-joined');
    };
  }, [session, quiz, socket, setMessage, navigate]);

  const loadParticipants = async () => {
    try {
      const data = await request(`/quizzes/sessions/room/${session.room_code}/participants`);
      setParticipants(data || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  // Переход на страницу игры как организатор
  const startQuiz = () => {
    navigate(`/quiz/play/${session.room_code}`, { 
      state: { 
        roomInfo: { 
          roomCode: session.room_code,
          sessionId: session.id,
          title: quiz.title,
          isOrganizer: true,
          questions: quiz.questions || [],
          questionTime: quiz.question_time || 20
        }
      }
    });
  };

  if (!session || !quiz) return null;

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h2>{quiz.title}</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Выйти
        </button>
      </div>

      <div className="lobby-info">
        <div className="room-code-display">
          <span>Код комнаты:</span>
          <strong>{session.room_code}</strong>
        </div>
        <div className="participants-count">
          👥 Участников: {participants.length}
        </div>
      </div>

      <div className="lobby-content">
        <div className="participants-list">
          <h3>Участники</h3>
          {participants.length === 0 ? (
            <p className="empty-state">Ожидание участников...</p>
          ) : (
            participants.map((p, idx) => (
              <div key={idx} className="participant-item">
                <span>{p.username}</span>
                <span className="status-dot online">●</span>
              </div>
            ))
          )}
        </div>

        <div className="lobby-actions">
          <button 
            onClick={startQuiz} 
            className="btn-primary"
            disabled={participants.length === 0}
          >
            🚀 Начать квиз ({participants.length} участников)
          </button>
          <p className="hint">
            {participants.length === 0 
              ? 'Ожидайте подключения участников...' 
              : 'Нажмите "Начать квиз"'}
          </p>
        </div>
      </div>
    </div>
  );
}