# Quiz MVP Backend

## Структура проекта

```
backend/
├── src/
│   ├── db/
│   │   ├── connection.js      # PostgreSQL подключение
│   │   └── migrations.js      # Миграции БД
│   ├── middleware/
│   │   └── auth.js            # JWT аутентификация
│   ├── services/
│   │   ├── userService.js     # Логика пользователей
│   │   └── quizService.js     # Логика квизов
│   ├── routes/
│   │   ├── auth.js            # API маршруты (регистрация, логин)
│   │   └── quizzes.js         # API маршруты (квизы, вопросы)
│   ├── websocket/
│   │   └── handler.js         # Socket.IO обработчики
│   └── server.js              # Главный файл сервера
└── package.json
```

## Установка

1. **Создайте базу данных PostgreSQL:**
   ```bash
   createdb quiz_mvp
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Создайте файл .env:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env с вашими учетными данными БД
   ```

4. **Запустите миграции:**
   ```bash
   npm run migrate
   ```

5. **Запустите сервер:**
   ```bash
   npm run dev  # для разработки с nodemon
   npm start    # для продакшена
   ```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль (требует токена)
- `GET /api/auth/history` - История (требует токена)

### Квизы
- `POST /api/quizzes` - Создать квиз (организатору)
- `GET /api/quizzes` - Получить квизы
- `GET /api/quizzes/:id` - Получить квиз
- `POST /api/quizzes/:id/questions` - Добавить вопрос
- `POST /api/quizzes/:id/start` - Запустить квиз
- `GET /api/quizzes/rooms/:code` - Получить квиз по коду комнаты

## WebSocket События

### Участник
- `join-room` - Присоединиться к активному квизу
- `submit-answer` - Отправить ответ на вопрос

### Сервер отправляет
- `room-joined` - Подтверждение присоединения
- `question-start` - Начало нового вопроса
- `question-ended` - Конец вопроса
- `answer-received` - Подтверждение ответа
- `quiz-ended` - Конец квиза с лидербордом

## Структура БД

Таблицы (автоматически создаются миграциями):
- `users` - Пользователи
- `quizzes` - Квизы
- `questions` - Вопросы
- `question_options` - Варианты ответов
- `quiz_participants` - Участники квиза
- `quiz_answers` - Ответы пользователей
- `quiz_results` - Результаты (очки, ранг)
- `migrations` - История миграций
