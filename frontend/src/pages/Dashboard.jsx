import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import QuizList from '../components/QuizList';
import JoinRoom from '../components/JoinRoom';

export default function Dashboard({ socket, setMessage }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-quizzes');
  const navigate = useNavigate();

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await request('/quizzes');
      setQuizzes(data || []);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    navigate('/quiz/create');
  };

  const handleEditQuiz = (quiz) => {
    navigate(`/quiz/edit/${quiz.id}`);
  };

  const handleStartQuiz = async (quiz) => {
    try {
      const data = await request(`/quizzes/${quiz.id}/sessions`, { 
        method: 'POST' 
      });
      
      const session = data.session;
      const quizData = data.quiz;
      
      navigate(`/quiz/lobby/${session.room_code}`, { 
        state: { 
          session: session,
          quiz: quizData 
        } 
      });
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  const handleResults = (quiz) => {
    navigate(`/quiz/results/${quiz.id}`);
  };

  const handleJoinRoom = (roomInfo) => {
    navigate(`/quiz/play/${roomInfo.roomCode}`, { state: { roomInfo } });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Панель управления</h2>
        <button onClick={handleCreateQuiz} className="btn-primary">
          + Создать квиз
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'my-quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-quizzes')}
        >
          Мои квизы
        </button>
        <button
          className={`tab ${activeTab === 'join' ? 'active' : ''}`}
          onClick={() => setActiveTab('join')}
        >
          Присоединиться
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'my-quizzes' && (
          <>
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : (
              <QuizList
                quizzes={quizzes}
                onEdit={handleEditQuiz}
                onStart={handleStartQuiz}
                onResults={handleResults}
                onRefresh={loadQuizzes}
              />
            )}
          </>
        )}

        {activeTab === 'join' && (
          <JoinRoom socket={socket} onJoined={handleJoinRoom} setMessage={setMessage} />
        )}
      </div>
    </div>
  );
}