# Quiz MVP Frontend

## Структура проекта

```
frontend/
├── src/
│   ├── components/
│   │   ├── QuizCreate.jsx     # Форма создания квиза
│   │   ├── QuizList.jsx       # Список квизов
│   │   ├── QuizEditor.jsx     # Редактор квиза (добавление вопросов)
│   │   ├── JoinRoom.jsx       # Подключение к комнате
│   │   └── QuizSession.jsx    # Сессия ответов на вопросы
│   ├── pages/
│   │   ├── AuthPage.jsx       # Регистрация и вход
│   │   ├── OrganizerDashboard.jsx  # Панель организатора
│   │   └── ParticipantDashboard.jsx # Панель участника
│   ├── App.jsx                # Главный компонент
│   ├── api.js                 # HTTP клиент и работа с сессией
│   ├── main.jsx               # Entry point
│   └── styles.css             # Стили
└── package.json
```

## Установка

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Запустите dev сервер:**
   ```bash
   npm run dev
   ```
   Приложение откроется на `http://localhost:5173`

3. **Для продакшена:**
   ```bash
   npm run build
   npm run preview
   ```

## Компоненты

### Страницы
- **AuthPage** - Форма регистрации и входа
- **OrganizerDashboard** - Создание и управление квизами
- **ParticipantDashboard** - Присоединение к квизу и ответы

### Компоненты
- **QuizCreate** - Создание нового квиза
- **QuizList** - Отображение списка квизов
- **QuizEditor** - Добавление вопросов к квизу
- **JoinRoom** - Ввод кода комнаты для присоединения
- **QuizSession** - Отображение вопросов и сбор ответов

## API интеграция

Все запросы идут через функцию `request()` из `api.js`:
- Автоматически добавляет JWT токен в заголовок
- Обрабатывает ошибки
- Сохраняет сессию в localStorage

## Стили

Используется систем CSS переменных для теми:
```css
--primary: #2563eb
--success: #16a34a
--danger: #dc2626
--text: #1e293b
```

Адаптивный дизайн с breakpoint на 768px.
