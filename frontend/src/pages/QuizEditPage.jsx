import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { request } from '../api';

export default function QuizEditPage({ setMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    type: 'single',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const data = await request(`/quizzes/${id}`);
      setQuiz(data);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuestion({ ...currentQuestion, [name]: value });
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...currentQuestion.options];
    updatedOptions[index][field] = value;
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleAddOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, { text: '', isCorrect: false }]
    });
  };

  const handleRemoveOption = (index) => {
    if (currentQuestion.options.length <= 2) {
      setMessage('✗ Минимум 2 варианта ответа');
      return;
    }
    const updatedOptions = currentQuestion.options.filter((_, i) => i !== index);
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const validOptions = currentQuestion.options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      setMessage('✗ Добавьте минимум 2 варианта ответа');
      return;
    }
    if (!currentQuestion.text.trim()) {
      setMessage('✗ Введите текст вопроса');
      return;
    }

    const hasCorrect = currentQuestion.options.some(opt => opt.isCorrect);
    if (!hasCorrect) {
      setMessage('✗ Выберите правильный ответ');
      return;
    }

    try {
      await request(`/quizzes/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          text: currentQuestion.text,
          type: currentQuestion.type,
          options: currentQuestion.options.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
        })
      });

      setMessage('✅ Вопрос добавлен');
      setCurrentQuestion({
        text: '',
        type: 'single',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]
      });
      setShowQuestionForm(false);
      loadQuiz();
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await request(`/quizzes/${id}/questions/${questionId}`, {
        method: 'DELETE'
      });
      setMessage('✅ Вопрос удален');
      loadQuiz();
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  // === ГЛАВНОЕ - правильный запуск квиза ===
  const handleStartQuiz = async () => {
    try {
      // Создаем новую сессию
      const data = await request(`/quizzes/${id}/sessions`, { 
        method: 'POST' 
      });
      
      const session = data.session;
      const quizData = data.quiz;
      
      // Переходим в лобби с кодом комнаты
      navigate(`/quiz/lobby/${session.room_code}`, { 
        state: { 
          session: session,
          quiz: quizData 
        } 
      });
      
      setMessage(`✅ Квиз запущен! Код комнаты: ${session.room_code}`);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!quiz) return <div className="loading">Квиз не найден</div>;

  return (
    <div className="quiz-edit-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Назад
        </button>
        <h2>Редактирование: {quiz.title}</h2>
        <button onClick={handleStartQuiz} className="btn-primary">
          🚀 Запустить квиз
        </button>
      </div>

      <div className="quiz-info-card">
        <div className="info-grid">
          <div>
            <label>Категория</label>
            <p>{quiz.category}</p>
          </div>
          <div>
            <label>Время на вопрос</label>
            <p>{quiz.question_time} сек</p>
          </div>
          <div>
            <label>Вопросов</label>
            <p>{quiz.questions?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="questions-section">
        <div className="section-header">
          <h3>Вопросы ({quiz.questions?.length || 0})</h3>
          <button 
            onClick={() => setShowQuestionForm(!showQuestionForm)} 
            className="btn-secondary"
          >
            {showQuestionForm ? 'Отмена' : '+ Добавить вопрос'}
          </button>
        </div>

        {showQuestionForm && (
          <form onSubmit={handleAddQuestion} className="question-form card">
            <h4>Новый вопрос</h4>
            
            <div className="form-group">
              <label>Текст вопроса *</label>
              <textarea
                name="text"
                placeholder="Введите вопрос"
                value={currentQuestion.text}
                onChange={handleQuestionChange}
                rows="2"
                required
              />
            </div>

            <div className="form-group">
              <label>Тип вопроса</label>
              <select
                name="type"
                value={currentQuestion.type}
                onChange={handleQuestionChange}
              >
                <option value="single">Одиночный выбор</option>
                <option value="multiple">Множественный выбор</option>
              </select>
            </div>

            <div className="options-form">
              <label>Варианты ответов *</label>
              {currentQuestion.options.map((option, idx) => (
                <div key={idx} className="option-row">
                  <input
                    type="text"
                    placeholder={`Вариант ${idx + 1}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                  />
                  <label className="correct-label">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                    />
                    Правильный
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="btn-danger-small"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={handleAddOption} className="btn-secondary">
                + Добавить вариант
              </button>
            </div>

            <button type="submit" className="btn-primary">
              Добавить вопрос
            </button>
          </form>
        )}

        <div className="questions-list">
          {quiz.questions && quiz.questions.length > 0 ? (
            quiz.questions.map((question, idx) => (
              <div key={question.id} className="question-item">
                <div className="question-header-item">
                  <div className="question-info">
                    <strong>{idx + 1}. {question.text}</strong>
                    <span className="question-type">
                      {question.type === 'single' ? 'Одиночный' : 'Множественный'} выбор
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="btn-danger-small"
                  >
                    ✕
                  </button>
                </div>
                <div className="options-preview">
                  {question.options && question.options.map((opt, optIdx) => (
                    <span key={opt.id} className={`option-tag ${opt.isCorrect ? 'correct' : ''}`}>
                      {optIdx + 1}. {opt.text} {opt.isCorrect && '✅'}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">Вопросов пока нет. Добавьте первый вопрос!</p>
          )}
        </div>
      </div>
    </div>
  );
}