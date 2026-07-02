import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { request, loadSession } from '../api';

export default function QuizResultsPage({ setMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [results, setResults] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const session = loadSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
    }
    loadResults();
  }, [id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const [quizData, resultsData] = await Promise.all([
        request(`/quizzes/${id}`),
        request(`/quizzes/${id}/leaderboard`)
      ]);
      setQuiz(quizData);
      setResults(resultsData || []);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!quiz) return <div className="loading">Квиз не найден</div>;

  return (
    <div className="quiz-results-page">
      <div className="results-header">
        <h2>🏆 Результаты квиза</h2>
        <h3>{quiz.title}</h3>
        <p className="quiz-meta">{quiz.category} • {quiz.questions?.length || 0} вопросов</p>
      </div>

      <div className="results-content">
        <div className="leaderboard">
          <h3>Таблица лидеров</h3>
          {results.length === 0 ? (
            <p className="empty-state">Нет результатов</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Место</th>
                  <th>Имя</th>
                  <th>Очки</th>
                </tr>
              </thead>
              <tbody>
                {results.map((entry, idx) => (
                  <tr 
                    key={entry.user_id} 
                    className={entry.user_id === currentUserId ? 'current-user' : ''}
                  >
                    <td>{idx + 1}</td>
                    <td>{entry.username}</td>
                    <td>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="results-actions">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Вернуться в меню
          </button>
        </div>
      </div>
    </div>
  );
}