import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '../api';

export default function QuizPlayPage({ socket, setMessage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomInfo } = location.state || {};
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isWaiting, setIsWaiting] = useState(true);
  const [quizEnded, setQuizEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isOrganizer, setIsOrganizer] = useState(roomInfo?.isOrganizer || false);
  const [questions, setQuestions] = useState(roomInfo?.questions || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [answeredUsers, setAnsweredUsers] = useState(new Set());
  const [timerInterval, setTimerInterval] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (!roomInfo) {
      navigate('/dashboard');
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    if (isOrganizer) {
      socket.emit('organizer-join', { roomCode: roomInfo.roomCode });
      loadParticipants();
    }

    socket.on('room-joined', (info) => {
      setCurrentUserId(info.userId);
    });

    socket.on('participant-joined', (data) => {
      setParticipants(prev => [...prev, data]);
      if (isOrganizer) {
        setMessage(`✅ ${data.username} присоединился`);
      }
    });

    socket.on('participant-answer', (data) => {
      setAnsweredUsers(prev => {
        const newSet = new Set(prev);
        const key = `${data.userId}_${data.questionId}`;
        if (!newSet.has(key)) {
          newSet.add(key);
          setAnsweredCount(prevCount => {
            const newCount = prevCount + 1;
            if (isOrganizer) {
              setMessage(`📊 Ответили: ${newCount}/${participants.length}`);
            }
            return newCount;
          });
        }
        return newSet;
      });
    });

    socket.on('question-start', (data) => {
      setCurrentQuestion(data.question);
      setQuestionNumber(data.number);
      setTotalQuestions(data.total);
      setTimeLeft(data.duration);
      setSelectedAnswers([]);
      setAnswered(false);
      setIsWaiting(false);
      setCurrentQuestionIndex(data.number - 1);
      setAnsweredCount(0);
      setAnsweredUsers(new Set());
      
      if (timerInterval) clearInterval(timerInterval);
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      
      if (isOrganizer) {
        setMessage(`📢 Вопрос ${data.number}/${data.total} начат!`);
      }
    });

    socket.on('answer-received', ({ correct, totalScore }) => {
      setAnswered(true);
      setScore(totalScore);
      setMessage(correct ? '✅ Правильно!' : '❌ Неправильно');
    });

    socket.on('question-ended', (data) => {
      if (timerInterval) clearInterval(timerInterval);
      setTimerInterval(null);
      
      if (isOrganizer) {
        setMessage(`📊 На вопрос ответили: ${answeredCount}/${participants.length}`);
      }
      setCurrentQuestion(null);
      setIsWaiting(true);
    });

    socket.on('quiz-ended', ({ leaderboard: board }) => {
      if (timerInterval) clearInterval(timerInterval);
      setTimerInterval(null);
      setLeaderboard(board);
      setQuizEnded(true);
      setMessage('🏁 Квиз завершен!');
    });

    socket.on('quiz-started', () => {
      setQuizStarted(true);
      if (isOrganizer) {
        setMessage('🚀 Квиз начат!');
      }
    });

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      socket.off('room-joined');
      socket.off('participant-joined');
      socket.off('participant-answer');
      socket.off('question-start');
      socket.off('answer-received');
      socket.off('question-ended');
      socket.off('quiz-ended');
      socket.off('quiz-started');
    };
  }, [roomInfo, socket, setMessage, navigate, isOrganizer]);

  const loadParticipants = async () => {
    try {
      const data = await request(`/quizzes/sessions/room/${roomInfo.roomCode}/participants`);
      setParticipants(data || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  const handleSelectAnswer = (optionId) => {
    if (answered || isOrganizer) return;
    if (currentQuestion.type === 'single') {
      setSelectedAnswers([optionId]);
    } else {
      setSelectedAnswers(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswers.length === 0 || answered || isOrganizer) return;
    socket.emit('submit-answer', {
      roomCode: roomInfo.roomCode,
      questionId: currentQuestion.id,
      selectedOptionIds: selectedAnswers
    });
  };

  const startQuiz = () => {
    socket.emit('quiz-started', { roomCode: roomInfo.roomCode });
    setQuizStarted(true);
    if (questions.length > 0) {
      showQuestion(0);
    }
  };

  const showQuestion = (index) => {
    if (index >= questions.length) {
      endQuiz();
      return;
    }
    
    const question = questions[index];
    setAnsweredCount(0);
    setAnsweredUsers(new Set());
    socket.emit('question-start', {
      roomCode: roomInfo.roomCode,
      question: question,
      duration: roomInfo.questionTime || 20,
      number: index + 1,
      total: questions.length
    });
    setCurrentQuestionIndex(index);
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      showQuestion(nextIndex);
    } else {
      endQuiz();
    }
  };

  const endQuiz = () => {
    if (timerInterval) clearInterval(timerInterval);
    socket.emit('finish-quiz', { roomCode: roomInfo.roomCode });
  };

  if (quizEnded) {
    return (
      <div className="quiz-results-page">
        <h2>🏆 Квиз завершен!</h2>
        {!isOrganizer && (
          <div className="final-score">
            <p>Ваш счет: <strong>{score}</strong></p>
          </div>
        )}
        <div className="leaderboard">
          <h3>Таблица лидеров</h3>
          {leaderboard.length === 0 ? (
            <p>Нет результатов</p>
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
                {leaderboard.map((entry, idx) => (
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
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Вернуться в меню
        </button>
      </div>
    );
  }

  if (isOrganizer && !quizStarted) {
    return (
      <div className="organizer-lobby">
        <h2>🔄 Лобби организатора</h2>
        <h3>{roomInfo.title}</h3>
        <p>Код комнаты: <strong>{roomInfo.roomCode}</strong></p>
        
        <div className="participants-list">
          <h4>Участники ({participants.length})</h4>
          {participants.map((p, idx) => (
            <div key={idx} className="participant-item">
              <span>{p.username}</span>
              <span className="status-dot online">●</span>
            </div>
          ))}
        </div>

        <button 
          onClick={startQuiz} 
          className="btn-primary"
          disabled={participants.length === 0}
        >
          🚀 Начать квиз ({participants.length} участников)
        </button>
      </div>
    );
  }

  if (isOrganizer && quizStarted) {
    return (
      <div className="organizer-session">
        <h2>📊 Панель организатора</h2>
        <h3>{roomInfo.title}</h3>
        
        <div className="organizer-stats">
          <div className="stat">
            <span>Участники:</span>
            <strong>{participants.length}</strong>
          </div>
          <div className="stat">
            <span>Вопрос:</span>
            <strong>{currentQuestionIndex + 1}/{questions.length}</strong>
          </div>
          {currentQuestion && (
            <div className="stat">
              <span>Ответили:</span>
              <strong>{answeredCount}/{participants.length}</strong>
            </div>
          )}
          {currentQuestion && (
            <div className="stat">
              <span>⏱ Осталось:</span>
              <strong>{timeLeft}с</strong>
            </div>
          )}
        </div>

        {currentQuestion ? (
          <div className="organizer-question">
            <h4>Текущий вопрос:</h4>
            <p>{currentQuestion.text}</p>
            <div className="options-preview">
              {currentQuestion.options?.map((opt, idx) => (
                <div key={opt.id} className={`option-tag ${opt.isCorrect ? 'correct' : ''}`}>
                  {idx + 1}. {opt.text} {opt.isCorrect && '✅'}
                </div>
              ))}
            </div>
            <div className="organizer-actions">
              <button onClick={nextQuestion} className="btn-secondary">
                ⏭ Следующий вопрос
              </button>
              <button onClick={endQuiz} className="btn-danger">
                ⏹ Завершить квиз
              </button>
            </div>
          </div>
        ) : (
          <div className="organizer-waiting">
            <p>⏳ Ожидание вопроса...</p>
            <button onClick={nextQuestion} className="btn-secondary">
              Показать следующий вопрос
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isWaiting && !currentQuestion) {
    return (
      <div className="quiz-waiting">
        <h2>{roomInfo?.title || 'Квиз'}</h2>
        <p>⏳ Ожидание следующего вопроса...</p>
        <div className="spinner" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="quiz-waiting">
        <h2>{roomInfo?.title || 'Квиз'}</h2>
        <p>⏳ Ожидание начала...</p>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="quiz-play-page">
      <div className="question-header">
        <span className="question-number">Вопрос {questionNumber}/{totalQuestions}</span>
        <span className="timer">⏱ {timeLeft}с</span>
      </div>

      <div className="question-content">
        <h2>{currentQuestion.text}</h2>

        <div className="options">
          {currentQuestion.options?.map((option) => (
            <label 
              key={option.id} 
              className={`option-label ${selectedAnswers.includes(option.id) ? 'selected' : ''} ${answered ? 'disabled' : ''}`}
            >
              <input
                type={currentQuestion.type === 'single' ? 'radio' : 'checkbox'}
                name="answer"
                checked={selectedAnswers.includes(option.id)}
                onChange={() => handleSelectAnswer(option.id)}
                disabled={answered}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>

        {!answered ? (
          <button 
            onClick={handleSubmitAnswer} 
            className="btn-primary"
            disabled={selectedAnswers.length === 0}
          >
            Отправить ответ
          </button>
        ) : (
          <div className="answer-sent">
            <p>✅ Ответ отправлен</p>
          </div>
        )}
      </div>
    </div>
  );
}