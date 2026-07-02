export default function QuizList({ quizzes, onEdit, onStart, onResults, onRefresh }) {
  return (
    <div className="quiz-list">
      {quizzes.length === 0 ? (
        <div className="empty-state">
          <p>У вас пока нет квизов</p>
          <p className="hint">Нажмите "Создать квиз" чтобы начать</p>
        </div>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-header">
                <h3>{quiz.title}</h3>
                <span className={`status-badge status-draft`}>
                  {quiz.question_count || 0} вопросов
                </span>
              </div>
              <p className="quiz-category">{quiz.category}</p>
              <p className="quiz-meta">Время на вопрос: {quiz.question_time} сек</p>
              <div className="quiz-actions">
                <button onClick={() => onEdit(quiz)} className="btn-secondary">
                  Редактировать
                </button>
                <button 
                  onClick={() => onStart(quiz)} 
                  className="btn-primary"
                  disabled={!quiz.question_count || quiz.question_count === 0}
                >
                  🚀 Запустить
                </button>
                <button 
                  onClick={() => onResults(quiz)} 
                  className="btn-secondary"
                >
                  📊 Результаты
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}