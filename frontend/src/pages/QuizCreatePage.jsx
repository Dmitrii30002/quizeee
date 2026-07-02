import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';

export default function QuizCreatePage({ setMessage }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState({
    title: '',
    category: '',
    description: '',
    questionTime: 20,
    rules: '',
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    type: 'single',
    imageUrl: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  const handleQuizChange = (e) => {
    const { name, value } = e.target;
    setQuizData({ ...quizData, [name]: value });
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

  const handleAddQuestion = () => {
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

    setQuizData({
      ...quizData,
      questions: [...quizData.questions, { ...currentQuestion }]
    });
    setCurrentQuestion({
      text: '',
      type: 'single',
      imageUrl: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
    setMessage('✅ Вопрос добавлен');
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quizData.questions.length === 0) {
      setMessage('✗ Добавьте хотя бы один вопрос');
      return;
    }

    try {
      // Создаем квиз
      const quiz = await request('/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: quizData.title,
          category: quizData.category,
          questionTime: quizData.questionTime,
          rules: quizData.rules
        })
      });

      // Добавляем вопросы
      for (const q of quizData.questions) {
        await request(`/quizzes/${quiz.id}/questions`, {
          method: 'POST',
          body: JSON.stringify({
            text: q.text,
            type: q.type,
            imageUrl: q.imageUrl || null,
            options: q.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          })
        });
      }

      setMessage('✅ Квиз создан!');
      navigate('/dashboard');
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  return (
    <div className="quiz-create-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ← Назад
        </button>
        <h2>Создание нового квиза</h2>
      </div>

      {step === 1 && (
        <div className="card">
          <h3>Основная информация</h3>
          <form onSubmit={() => setStep(2)}>
            <div className="form-group">
              <label>Название квиза *</label>
              <input
                type="text"
                name="title"
                placeholder="Например: Викторина по истории"
                value={quizData.title}
                onChange={handleQuizChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Категория *</label>
              <input
                type="text"
                name="category"
                placeholder="Например: История, Наука, Игры"
                value={quizData.category}
                onChange={handleQuizChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                placeholder="Краткое описание квиза"
                value={quizData.description}
                onChange={handleQuizChange}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Время на вопрос (секунд) *</label>
              <input
                type="number"
                name="questionTime"
                value={quizData.questionTime}
                onChange={handleQuizChange}
                min="5"
                max="120"
                required
              />
            </div>

            <div className="form-group">
              <label>Правила</label>
              <textarea
                name="rules"
                placeholder="Опишите правила игры"
                value={quizData.rules}
                onChange={handleQuizChange}
                rows="3"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={!quizData.title || !quizData.category}
            >
              Далее → Добавить вопросы
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="quiz-create-header">
            <h3>Добавление вопросов</h3>
            <button onClick={() => setStep(1)} className="btn-secondary">
              ← Назад к информации
            </button>
          </div>

          <div className="questions-preview">
            <h4>Добавлено вопросов: {quizData.questions.length}</h4>
            {quizData.questions.map((q, idx) => (
              <div key={idx} className="question-preview-item">
                <span>{idx + 1}. {q.text}</span>
                <button onClick={() => handleRemoveQuestion(idx)} className="btn-danger-small">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="question-form">
            <h4>Новый вопрос</h4>
            
            <div className="form-group">
              <label>Текст вопроса *</label>
              <textarea
                name="text"
                placeholder="Введите вопрос"
                value={currentQuestion.text}
                onChange={handleQuestionChange}
                rows="2"
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

            <div className="form-group">
              <label>URL изображения (опционально)</label>
              <input
                type="text"
                name="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={currentQuestion.imageUrl}
                onChange={handleQuestionChange}
              />
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

            <button type="button" onClick={handleAddQuestion} className="btn-primary">
              Добавить вопрос
            </button>
          </div>

          {quizData.questions.length > 0 && (
            <button onClick={handleSubmit} className="btn-success">
              ✅ Создать квиз ({quizData.questions.length} вопросов)
            </button>
          )}
        </div>
      )}
    </div>
  );
}