const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const {
  joinSession,
  submitAnswer,
  finishSession,
  getSessionLeaderboard,
  getSession,
} = require('../services/quizService');

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-secret-key';

function initWebSocket(io) {
  const sessions = new Map();

  io.on('connection', (socket) => {
    console.log(`[WS] User connected: ${socket.id}`);

    socket.on('organizer-join', async (data) => {
      try {
        const { roomCode } = data;
        const sessionResult = await query(
          'SELECT id, status FROM quiz_sessions WHERE room_code = $1',
          [roomCode]
        );

        if (sessionResult.rows.length === 0) {
          return socket.emit('error-message', 'Комната не найдена');
        }

        const sessionId = sessionResult.rows[0].id;
        socket.data.sessionId = sessionId;
        socket.data.isOrganizer = true;
        socket.join(roomCode);

        if (!sessions.has(roomCode)) {
          sessions.set(roomCode, {
            sessionId,
            organizer: socket.id,
            participants: new Set()
          });
        }

        console.log(`[WS] Organizer joined room ${roomCode}`);
        socket.emit('organizer-joined', { sessionId, roomCode });
      } catch (err) {
        console.error('[WS] Organizer join error:', err.message);
        socket.emit('error-message', 'Ошибка подключения');
      }
    });

    socket.on('join-room', async (data) => {
      try {
        const { roomCode, token } = data;
        const payload = jwt.verify(token, JWT_SECRET);

        const result = await query('SELECT id, username FROM users WHERE id = $1', [payload.id]);
        if (result.rows.length === 0) {
          return socket.emit('error-message', 'Пользователь не найден');
        }

        const user = result.rows[0];

        const sessionResult = await query(
          `SELECT s.id, s.quiz_id, q.title, q.question_time,
              json_agg(json_build_object(
                'id', qn.id,
                'text', qn.text,
                'type', qn.type,
                'options', (SELECT json_agg(json_build_object('id', qo.id, 'text', qo.text))
                            FROM question_options qo WHERE qo.question_id = qn.id)
              )) FILTER (WHERE qn.id IS NOT NULL) as questions
       FROM quiz_sessions s 
       JOIN quizzes q ON s.quiz_id = q.id 
       LEFT JOIN questions qn ON q.id = qn.quiz_id
       WHERE s.room_code = $1 AND s.status IN ('waiting', 'running')
       GROUP BY s.id, q.id`,
          [roomCode]
        );

        if (sessionResult.rows.length === 0) {
          return socket.emit('error-message', 'Комната не найдена или квиз уже завершен');
        }

        const sessionData = sessionResult.rows[0];
        const sessionId = sessionData.id;

        socket.data.user = user;
        socket.data.sessionId = sessionId;
        socket.data.roomCode = roomCode;
        socket.join(roomCode);

        await joinSession(sessionId, user.id);

        if (sessions.has(roomCode)) {
          sessions.get(roomCode).participants.add(socket.id);
        }

        socket.emit('room-joined', {
          sessionId,
          userId: user.id,
          username: user.username,
          title: sessionData.title,
          questions: sessionData.questions || [],
          questionTime: sessionData.question_time || 20
        });

        socket.to(roomCode).emit('participant-joined', {
          id: user.id,
          username: user.username
        });

        console.log(`[WS] ${user.username} joined room ${roomCode}`);
      } catch (err) {
        console.error('[WS] Join error:', err.message);
        socket.emit('error-message', 'Ошибка авторизации');
      }
    });

    socket.on('submit-answer', async (data) => {
      try {
        const { roomCode, questionId, selectedOptionIds } = data;
        const user = socket.data.user;

        if (!user) {
          return socket.emit('error-message', 'Не авторизован');
        }

        const sessionId = socket.data.sessionId;

        const questionResult = await query(
          `SELECT qo.id, qo.is_correct FROM question_options qo
           WHERE qo.question_id = $1`,
          [questionId]
        );

        const correctOptionIds = questionResult.rows
          .filter((row) => row.is_correct)
          .map((row) => row.id);

        const isCorrect =
          Array.isArray(selectedOptionIds) &&
          selectedOptionIds.length === correctOptionIds.length &&
          selectedOptionIds.every((id) => correctOptionIds.includes(id));

        const result = await submitAnswer(
          sessionId,
          user.id,
          questionId,
          selectedOptionIds,
          isCorrect
        );

        socket.emit('answer-received', {
          correct: isCorrect,
          totalScore: result.score,
        });

        socket.to(roomCode).emit('participant-answer', {
          userId: user.id,
          username: user.username,
          questionId,
          selectedOptionIds,
          isCorrect
        });

        console.log(`[WS] ${user.username} answered question ${questionId}: ${isCorrect ? 'correct' : 'incorrect'}`);
      } catch (err) {
        console.error('[WS] Answer error:', err.message);
        socket.emit('error-message', err.message);
      }
    });

    socket.on('quiz-started', (data) => {
      const { roomCode } = data;
      io.to(roomCode).emit('quiz-started', { message: 'Квиз начат!' });
    });

    socket.on('question-start', (data) => {
      const { roomCode, question, duration, number, total } = data;
      io.to(roomCode).emit('question-start', {
        question,
        duration,
        number,
        total
      });
    });

    socket.on('question-ended', (data) => {
      const { roomCode, questionId } = data;
      io.to(roomCode).emit('question-ended', { questionId });
    });

    socket.on('finish-quiz', async (data) => {
      try {
        const { roomCode } = data;
        const sessionResult = await query(
          'SELECT id FROM quiz_sessions WHERE room_code = $1',
          [roomCode]
        );

        if (sessionResult.rows.length === 0) {
          return;
        }

        const sessionId = sessionResult.rows[0].id;
        await finishSession(sessionId);
        const leaderboard = await getSessionLeaderboard(sessionId);

        io.to(roomCode).emit('quiz-ended', { leaderboard });
        console.log(`[WS] Session ${sessionId} finished`);

        if (sessions.has(roomCode)) {
          sessions.delete(roomCode);
        }
      } catch (err) {
        console.error('[WS] Finish error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WS] User disconnected: ${socket.id}`);

      for (const [roomCode, room] of sessions) {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          io.to(roomCode).emit('participant-left', { socketId: socket.id });
        }
        if (room.organizer === socket.id) {
          io.to(roomCode).emit('organizer-left', { message: 'Организатор покинул комнату' });
          sessions.delete(roomCode);
        }
      }
    });


    socket.on('submit-answer', async (data) => {
      try {
        const { roomCode, questionId, selectedOptionIds } = data;
        const user = socket.data.user;

        if (!user) {
          return socket.emit('error-message', 'Не авторизован');
        }

        const sessionId = socket.data.sessionId;

        const questionResult = await query(
          `SELECT qo.id, qo.is_correct FROM question_options qo
       WHERE qo.question_id = $1`,
          [questionId]
        );

        const correctOptionIds = questionResult.rows
          .filter((row) => row.is_correct)
          .map((row) => row.id);

        const isCorrect =
          Array.isArray(selectedOptionIds) &&
          selectedOptionIds.length === correctOptionIds.length &&
          selectedOptionIds.every((id) => correctOptionIds.includes(id));

        const result = await submitAnswer(
          sessionId,
          user.id,
          questionId,
          selectedOptionIds,
          isCorrect
        );

        socket.emit('answer-received', {
          correct: isCorrect,
          totalScore: result.score,
        });

        socket.to(roomCode).emit('participant-answer', {
          userId: user.id,
          username: user.username,
          questionId: questionId,
          isCorrect: isCorrect,
          selectedOptionIds: selectedOptionIds
        });

        console.log(`[WS] ${user.username} answered question ${questionId}: ${isCorrect ? 'correct' : 'incorrect'}`);
      } catch (err) {
        console.error('[WS] Answer error:', err.message);
        socket.emit('error-message', err.message);
      }
    });
  });
}

module.exports = {
  initWebSocket,
};