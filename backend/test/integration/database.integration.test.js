import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:dima15@localhost:5432/practika_PDV';

const { query, pool } = await import('../../src/db/connection');
const { runMigrations } = await import('../../src/db/migrations');
const userService = await import('../../src/services/userService');
const quizService = await import('../../src/services/quizService');

let dbAvailable = false;

describe('database integration', () => {
  beforeAll(async () => {
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      await runMigrations();
    } catch (error) {
      console.warn('Skipping database integration tests:', error.message);
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    await query(`
      TRUNCATE TABLE
        session_results,
        session_answers,
        session_participants,
        quiz_sessions,
        question_options,
        questions,
        quizzes,
        users
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (dbAvailable) {
      await pool.end();
    }
  });

  it('persists a user and allows authentication flow', async () => {
    if (!dbAvailable) return;

    const registered = await userService.register('integration-user', 'secret123');
    const loggedIn = await userService.login('integration-user', 'secret123');
    const profile = await userService.getProfile(registered.user.id);

    expect(registered.user.username).toBe('integration-user');
    expect(loggedIn.user.username).toBe('integration-user');
    expect(profile.username).toBe('integration-user');
  });

  it('creates a quiz, adds questions, and tracks session results', async () => {
    if (!dbAvailable) return;

    const creator = await userService.register('quiz-owner', 'secret123');
    const quiz = await quizService.createQuiz(creator.user.id, 'Math quiz', 'education', 15, 'No notes');
    const question = await quizService.addQuestion(quiz.id, '2 + 2?', 'single', [
      { text: '3', isCorrect: false },
      { text: '4', isCorrect: true },
    ]);
    const session = await quizService.createSession(quiz.id);

    await quizService.joinSession(session.id, creator.user.id);
    await quizService.submitAnswer(session.id, creator.user.id, question.id, [2], true);
    const leaderboard = await quizService.getSessionLeaderboard(session.id);

    expect(quiz.title).toBe('Math quiz');
    expect(question.text).toBe('2 + 2?');
    expect(session.status).toBe('waiting');
    expect(leaderboard[0]).toEqual(expect.objectContaining({ username: 'quiz-owner', score: 1 }));
  });
});
