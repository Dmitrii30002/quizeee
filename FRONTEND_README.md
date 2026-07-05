# Quizeee Frontend

## Структура проекта

```
frontend/
├── src/
│   ├── components/
│   │   ├── QuizList.jsx       # Список квизов
│   │   └── JoinRoom.jsx       # Подключение к комнате
│   ├── pages/
│   │   ├── AuthPage.jsx       # Регистрация и вход
│   │   ├── Dashboard.jsx      # Панель управления
│   │   ├── QuizCreatePage.jsx # Создание квиза
│   │   ├── QuizEditPage.jsx   # Редактирование квиза
│   │   ├── QuizLobbyPage.jsx  # Лобби (ожидание участников)
│   │   ├── QuizPlayPage.jsx   # Игровая сессия
│   │   └── QuizResultsPage.jsx # Результаты квиза
│   ├── App.jsx                # Главный компонент с роутингом
│   ├── api.js                 # HTTP клиент и работа с сессией
│   ├── main.jsx               # Entry point
│   └── styles.css             # Стили
└── package.json
```

## Установка и запуск

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Сборка
npm run preview      # Просмотр сборки
```

## Страницы и маршруты

| Страница | Путь | Описание |
|----------|------|----------|
| AuthPage | `/auth` | Регистрация и вход |
| Dashboard | `/dashboard` | Панель управления со списком квизов |
| QuizCreatePage | `/quiz/create` | Создание нового квиза (2 шага) |
| QuizEditPage | `/quiz/edit/:id` | Редактирование квиза и добавление вопросов |
| QuizLobbyPage | `/quiz/lobby/:roomCode` | Лобби организатора (ожидание участников) |
| QuizPlayPage | `/quiz/play/:roomCode` | Игровая сессия (организатор/участник) |
| QuizResultsPage | `/quiz/results/:id` | Таблица лидеров |

## Компоненты

### QuizList.jsx
Отображение карточек квизов с кнопками:
- **Редактировать** → `/quiz/edit/:id`
- **🚀 Запустить** → создаёт сессию, переход в лобби
- **📊 Результаты** → `/quiz/results/:id`

### JoinRoom.jsx
- Ввод 6-символьного кода комнаты
- Подключение через Socket.IO
- Переход в игровую сессию

## API Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| GET | `/quizzes` | Получить все квизы пользователя |
| POST | `/quizzes` | Создать квиз |
| GET | `/quizzes/:id` | Получить квиз по ID |
| POST | `/quizzes/:id/questions` | Добавить вопрос |
| DELETE | `/quizzes/:quizId/questions/:questionId` | Удалить вопрос |
| POST | `/quizzes/:id/sessions` | Создать игровую сессию |
| GET | `/quizzes/sessions/room/:roomCode` | Получить сессию по коду |
| POST | `/quizzes/sessions/room/:roomCode/start` | Начать сессию |
| POST | `/quizzes/sessions/room/:roomCode/join` | Присоединиться к сессии |
| GET | `/quizzes/sessions/room/:roomCode/participants` | Получить участников |
| GET | `/quizzes/sessions/room/:roomCode/leaderboard` | Получить лидерборд сессии |
| GET | `/quizzes/:id/leaderboard` | Получить лидерборд квиза |

## WebSocket (Socket.IO)

### Подключение
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', { autoConnect: false });
```

### События клиент → сервер

| Событие | Данные | Описание |
|---------|--------|----------|
| `join-room` | `{ roomCode, token }` | Присоединиться к комнате |
| `organizer-join` | `{ roomCode }` | Подключиться как организатор |
| `submit-answer` | `{ roomCode, questionId, selectedOptionIds }` | Отправить ответ |
| `quiz-started` | `{ roomCode }` | Начать квиз (организатор) |
| `question-start` | `{ roomCode, question, duration, number, total }` | Начать вопрос |
| `question-ended` | `{ roomCode, questionId }` | Завершить вопрос |
| `finish-quiz` | `{ roomCode }` | Завершить квиз |

### События сервер → клиент

| Событие | Данные | Описание |
|---------|--------|----------|
| `room-joined` | `{ sessionId, userId, username, title, questions, questionTime }` | Подтверждение подключения |
| `organizer-joined` | `{ sessionId, roomCode }` | Подтверждение организатора |
| `participant-joined` | `{ id, username }` | Новый участник |
| `participant-answer` | `{ userId, username, questionId, selectedOptionIds, isCorrect }` | Участник ответил |
| `question-start` | `{ question, duration, number, total }` | Показать вопрос |
| `answer-received` | `{ correct, totalScore }` | Результат ответа |
| `question-ended` | `{ questionId }` | Вопрос завершён |
| `quiz-ended` | `{ leaderboard }` | Квиз завершён |
| `quiz-started` | `{ message }` | Квиз начат |
| `error-message` | `string` | Сообщение об ошибке |

## Управление сессией (api.js)

```javascript
// Сохранение
saveSession(user, token)

// Загрузка
loadSession() // → { token, user } или null

// Очистка
clearSession()
```

## Стили (CSS переменные)

```css
:root {
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --secondary: #64748b;
  --success: #16a34a;
  --danger: #dc2626;
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-light: #64748b;
}
```

### Основные классы

| Класс | Описание |
|-------|----------|
| `.btn-primary` | Синяя кнопка |
| `.btn-secondary` | Серая кнопка |
| `.btn-danger` | Красная кнопка |
| `.btn-success` | Зелёная кнопка |
| `.btn-back` | Прозрачная кнопка "Назад" |
| `.card` | Белая карточка с тенью |
| `.form-group` | Группа полей формы |
| `.message.success` | Зелёное всплывающее сообщение |
| `.message.error` | Красное всплывающее сообщение |
| `.leaderboard tr.current-user` | Серая подсветка текущего пользователя |

## Зависимости (package.json)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1"
  }
}
```

## Сценарии использования

### 1. Организатор: Создание квиза
1. Вход → `/auth`
2. Переход на `/dashboard`
3. Кнопка **"+ Создать квиз"** → `/quiz/create`
4. Шаг 1: Заполнить название, категорию, время, правила
5. Шаг 2: Добавить вопросы (текст, тип, варианты, правильный ответ)
6. **"Создать квиз"** → возврат в `/dashboard`

### 2. Организатор: Запуск квиза
1. На карточке квиза нажать **"🚀 Запустить"**
2. Создаётся сессия с кодом комнаты
3. Переход в `/quiz/lobby/:roomCode`
4. Участники подключаются по коду
5. **"🚀 Начать квиз"** → переход в `/quiz/play/:roomCode`

### 3. Игрок: Участие в квизе
1. Вход → `/auth`
2. Переход на `/dashboard`
3. Вкладка **"Присоединиться"**
4. Ввести код комнаты → **"Присоединиться"**
5. Переход в `/quiz/play/:roomCode`
6. Отвечать на вопросы

### 4. Просмотр результатов
- На карточке квиза нажать **"📊 Результаты"**
- Переход в `/quiz/results/:id`
- Таблица лидеров, текущий пользователь подсвечен серым
```
