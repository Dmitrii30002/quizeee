import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('quizService', () => {
  let queryMock;
  let createQuiz;
  let addQuestion;
  let getQuestion;
  let getQuiz;
  let getQuizzesByCreator;
  let createSession;
  let getSessionByRoomCode;
  let getSession;
  let startSession;
  let finishSession;
  let joinSession;
  let getSessionParticipants;
  let getSessionLeaderboard;
  let submitAnswer;
  let deleteQuestion;

  beforeEach(() => {
    vi.resetModules();
    queryMock = vi.fn();

    const dbConnection = require('../../src/db/connection');
    dbConnection.query = queryMock;

    ({
      createQuiz,
      addQuestion,
      getQuestion,
      getQuiz,
      getQuizzesByCreator,
      createSession,
      getSessionByRoomCode,
      getSession,
      startSession,
      finishSession,
      joinSession,
      getSessionParticipants,
      getSessionLeaderboard,
      submitAnswer,
      deleteQuestion,
    } = require('../../src/services/quizService'));
  });

  it('creates a quiz with default and explicit values', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 5, title: 'General knowledge', category: 'education' }] });
    const quiz = await createQuiz(1, 'General knowledge', 'education', null, null);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO quizzes'),
      [1, 'General knowledge', 'education', 20, '']
    );
    expect(quiz).toEqual({ id: 5, title: 'General knowledge', category: 'education' });

    queryMock.mockResolvedValueOnce({ rows: [{ id: 6, title: 'Science', category: 'study' }] });
    const quizWithValues = await createQuiz(2, 'Science', 'study', 45, 'Strict');
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO quizzes'), [2, 'Science', 'study', 45, 'Strict']);
    expect(quizWithValues).toEqual({ id: 6, title: 'Science', category: 'study' });
  });

  it('adds a question with options and returns the built question', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9, quiz_id: 1, text: '2 + 2?', type: 'single', options: [{ id: 1, text: '4', isCorrect: true }] }] });

    const result = await addQuestion(1, '2 + 2?', 'single', [{ text: '4', isCorrect: true }]);

    expect(queryMock).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO questions'), [1, '2 + 2?', 'single']);
    expect(queryMock).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO question_options'), [9, '4', true]);
    expect(result).toEqual({ id: 9, quiz_id: 1, text: '2 + 2?', type: 'single', options: [{ id: 1, text: '4', isCorrect: true }] });
  });

  it('returns null or a quiz payload depending on the query result', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(getQuestion(101)).resolves.toBeNull();

    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Math', questions: [] }] });
    await expect(getQuiz(1)).resolves.toEqual({ id: 1, title: 'Math', questions: [] });

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(getSessionByRoomCode('EMPTY')).resolves.toBeNull();

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(getSession(7)).resolves.toBeNull();
  });

  it('returns quizzes created by a user and creates sessions', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Math' }] });
    await expect(getQuizzesByCreator(2)).resolves.toEqual([{ id: 1, title: 'Math' }]);

    queryMock.mockResolvedValueOnce({ rows: [{ id: 12, quiz_id: 1, status: 'waiting' }] });
    await expect(createSession(1)).resolves.toEqual({ id: 12, quiz_id: 1, status: 'waiting' });
  });

  it('starts, finishes, joins, and lists participants', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 7, status: 'running' }] });
    await expect(startSession(7)).resolves.toEqual({ id: 7, status: 'running' });

    queryMock.mockResolvedValueOnce({ rows: [{ id: 7, status: 'finished' }] });
    await expect(finishSession(7)).resolves.toEqual({ id: 7, status: 'finished' });

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(joinSession(1, 2)).resolves.toBeUndefined();

    queryMock.mockResolvedValueOnce({ rows: [{ id: 2, username: 'bob' }] });
    await expect(getSessionParticipants(1)).resolves.toEqual([{ id: 2, username: 'bob' }]);
  });

  it('builds a leaderboard that includes participants with zero score', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ user_id: 1, username: 'alice', score: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice' }, { id: 2, username: 'bob' }] });

    const leaderboard = await getSessionLeaderboard(12);

    expect(leaderboard).toEqual([
      expect.objectContaining({ user_id: 1, username: 'alice', score: 2, rank: 1 }),
      expect.objectContaining({ user_id: 2, username: 'bob', score: 0, rank: 2 }),
    ]);
  });

  it('updates score for correct and incorrect answers', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ score: 1 }] });
    const correctResult = await submitAnswer(1, 3, 8, [2], true);
    expect(correctResult).toEqual({ score: 1 });

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(submitAnswer(1, 3, 8, [2], false)).resolves.toEqual({ score: 0 });
  });

  it('deletes a question by id and quiz id', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(deleteQuestion(10, 1)).resolves.toBeUndefined();
  });
});
