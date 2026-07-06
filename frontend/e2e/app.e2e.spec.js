import { test, expect } from '@playwright/test';

function setupSocketMock(page) {
  page.addInitScript(() => {
    class MockSocket {
      constructor() {
        this.connected = false;
        this.listeners = new Map();
      }

      connect() {
        this.connected = true;
      }

      disconnect() {
        this.connected = false;
      }

      on(event, callback) {
        const handlers = this.listeners.get(event) || [];
        handlers.push(callback);
        this.listeners.set(event, handlers);
      }

      off(event, callback) {
        const handlers = this.listeners.get(event) || [];
        this.listeners.set(event, handlers.filter((handler) => handler !== callback));
      }

      emit(event, payload) {
        if (event === 'join-room') {
          this.connected = true;
          const handlers = this.listeners.get('room-joined') || [];
          handlers.forEach((handler) => handler({ sessionId: `session-${payload?.roomCode || 'test'}` }));
        }
      }
    }

    window.__QUIZ_SOCKET_FACTORY__ = () => new MockSocket();
  });
}

function setupApiMocks(page) {
  const users = [];
  const quizzes = [];
  let nextUserId = 1;
  let nextQuizId = 1;

  page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace('/api', '');
    const method = request.method();

    if (method === 'POST' && pathname === '/auth/register') {
      const body = request.postDataJSON();
      const existing = users.find((user) => user.username === body.username);
      if (existing) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Пользователь уже существует' }),
        });
      }

      const user = { id: nextUserId++, username: body.username, password: body.password };
      users.push(user);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, token: `token-${user.id}` }),
      });
    }

    if (method === 'POST' && pathname === '/auth/login') {
      const body = request.postDataJSON();
      const user = users.find((entry) => entry.username === body.username && entry.password === body.password);
      if (!user) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Неверные данные' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, token: `token-${user.id}` }),
      });
    }

    if (method === 'GET' && pathname === '/quizzes') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quizzes),
      });
    }

    if (method === 'POST' && pathname === '/quizzes') {
      const body = request.postDataJSON();
      const quiz = {
        id: nextQuizId++,
        title: body.title,
        category: body.category,
        question_time: body.questionTime || 20,
        question_count: 0,
        questions: [],
      };
      quizzes.push(quiz);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(quiz),
      });
    }

    if (method === 'POST' && pathname.match(/^\/quizzes\/(\d+)\/questions$/)) {
      const quizId = Number(pathname.split('/')[2]);
      const payload = request.postDataJSON();
      const quiz = quizzes.find((entry) => entry.id === quizId);
      if (!quiz) {
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Quiz not found' }) });
      }
      const question = {
        id: quiz.questions.length + 1,
        text: payload.text,
        type: payload.type || 'single',
        options: (payload.options || []).map((option, index) => ({ id: index + 1, text: option.text, isCorrect: option.isCorrect })),
      };
      quiz.questions.push(question);
      quiz.question_count = quiz.questions.length;
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(question),
      });
    }

    if (method === 'GET' && pathname.match(/^\/quizzes\/(\d+)$/)) {
      const quizId = Number(pathname.split('/')[2]);
      const quiz = quizzes.find((entry) => entry.id === quizId);
      return route.fulfill({
        status: quiz ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(quiz || { error: 'Quiz not found' }),
      });
    }

    if (method === 'POST' && pathname.match(/^\/quizzes\/(\d+)\/sessions$/)) {
      const quizId = Number(pathname.split('/')[2]);
      const quiz = quizzes.find((entry) => entry.id === quizId);
      return route.fulfill({
        status: quiz ? 201 : 404,
        contentType: 'application/json',
        body: JSON.stringify({
          session: { id: 1, room_code: 'ABC123' },
          quiz: quiz || null,
        }),
      });
    }

    if (method === 'GET' && pathname.match(/^\/quizzes\/sessions\/room\/([^/]+)\/participants$/)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (method === 'GET' && pathname.match(/^\/quizzes\/sessions\/room\/([^/]+)$/)) {
      const quiz = quizzes[0];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: quiz?.title || 'Тестовый квиз',
          question_time: quiz?.question_time || 20,
          questions: quiz?.questions || [],
        }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unhandled mock route' }),
    });
  });
}

async function registerUser(page, username = 'alice', password = 'secret123') {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByPlaceholder('Имя пользователя').fill(username);
  await page.getByPlaceholder('Пароль').fill(password);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('✅ Регистрация успешна')).toBeVisible();
}

async function createQuiz(page, title = 'История мира', category = 'История') {
  await page.getByRole('button', { name: '+ Создать квиз' }).click();
  await page.getByPlaceholder('Например: Викторина по истории').fill(title);
  await page.getByPlaceholder('Например: История, Наука, Игры').fill(category);
  await page.getByRole('button', { name: 'Далее → Добавить вопросы' }).click();

  await page.getByPlaceholder('Введите вопрос').fill('Какой цвет у неба?');
  await page.getByPlaceholder('Вариант 1').fill('Синий');
  await page.getByPlaceholder('Вариант 2').fill('Зеленый');
  await page.locator('.option-row').nth(0).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Добавить вопрос' }).click();
  await page.getByRole('button', { name: /Создать квиз/i }).click();

  await expect(page.getByText('✅ Квиз создан!')).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
}

test('регистрация и вход работают как единый сценарий', async ({ page }) => {
  setupApiMocks(page);
  await page.goto('/auth');

  await page.getByRole('button', { name: 'Регистрация' }).click();
  await page.getByPlaceholder('Имя пользователя').fill('alice');
  await page.getByPlaceholder('Пароль').fill('secret123');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('✅ Регистрация успешна')).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

  await page.getByPlaceholder('Имя пользователя').fill('alice');
  await page.getByPlaceholder('Пароль').fill('secret123');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('✅ Вход выполнен')).toBeVisible();
});

test('организатор может создать квиз и увидеть его на панели', async ({ page }) => {
  setupApiMocks(page);
  await registerUser(page, 'organizer');
  await createQuiz(page, 'История мира', 'История');
});

test('организатор может открыть квиз на редактирование и запустить лобби', async ({ page }) => {
  setupSocketMock(page);
  setupApiMocks(page);
  await registerUser(page, 'organizer2');
  await createQuiz(page, 'Квиз по науке', 'Наука');

  await page.getByRole('button', { name: 'Редактировать' }).click();
  await expect(page.getByRole('heading', { name: /Редактирование:/ })).toBeVisible();

  await page.getByRole('button', { name: '🚀 Запустить квиз' }).click();
  await expect(page.locator('.room-code-display')).toContainText('Код комнаты:');
  await expect(page.getByRole('button', { name: /Начать квиз/i })).toBeVisible();
});

test('обычный игрок может подключиться к комнате по коду', async ({ browser }) => {
  const organizerContext = await browser.newContext();
  const playerContext = await browser.newContext();

  const organizerPage = await organizerContext.newPage();
  const playerPage = await playerContext.newPage();

  setupSocketMock(organizerPage);
  setupSocketMock(playerPage);
  setupApiMocks(organizerPage);
  setupApiMocks(playerPage);

  await registerUser(organizerPage, 'organizer3');
  await createQuiz(organizerPage, 'Квиз для игрока', 'Игры');

  await organizerPage.getByRole('button', { name: 'Редактировать' }).click();
  await organizerPage.getByRole('button', { name: '🚀 Запустить квиз' }).click();

  const roomCode = await organizerPage.locator('.room-code-display strong').textContent();
  const code = (roomCode || '').trim();

  await registerUser(playerPage, 'player1');
  await playerPage.getByRole('button', { name: 'Присоединиться' }).first().click();
  await playerPage.getByPlaceholder('Код комнаты (например: ABC123)').fill(code);
  await playerPage.locator('.join-room .btn-primary').click();

  await expect(playerPage).toHaveURL(new RegExp(`/quiz/play/${code}`));
  await expect(playerPage.getByText('⏳ Ожидание следующего вопроса...')).toBeVisible();

  await organizerContext.close();
  await playerContext.close();
});
