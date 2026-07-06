const db = require('../db/connection');

function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

async function createQuiz(creatorId, title, category, questionTime, rules) {
  const result = await db.query(
    `INSERT INTO quizzes (creator_id, title, category, question_time, rules)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [creatorId, title, category, questionTime || 20, rules || '']
  );
  return result.rows[0];
}

async function addQuestion(quizId, text, type, options) {
  const questionResult = await db.query(
    `INSERT INTO questions (quiz_id, text, type)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [quizId, text, type]
  );

  const questionId = questionResult.rows[0].id;

  for (const option of options) {
    await db.query(
      `INSERT INTO question_options (question_id, text, is_correct)
       VALUES ($1, $2, $3)`,
      [questionId, option.text, option.isCorrect]
    );
  }

  return getQuestion(questionId);
}

async function getQuestion(questionId) {
  const result = await db.query(
    `SELECT q.id, q.quiz_id, q.text, q.type,
            json_agg(json_build_object('id', qo.id, 'text', qo.text, 'isCorrect', qo.is_correct)) as options
     FROM questions q
     LEFT JOIN question_options qo ON q.id = qo.question_id
     WHERE q.id = $1
     GROUP BY q.id`,
    [questionId]
  );
  return result.rows[0] || null;
}

async function getQuiz(quizId) {
  const result = await db.query(
    `SELECT q.*, 
            json_agg(json_build_object(
              'id', qn.id,
              'text', qn.text,
              'type', qn.type,
              'options', (SELECT json_agg(json_build_object('id', qo.id, 'text', qo.text, 'isCorrect', qo.is_correct))
                          FROM question_options qo WHERE qo.question_id = qn.id)
            )) FILTER (WHERE qn.id IS NOT NULL) as questions
     FROM quizzes q
     LEFT JOIN questions qn ON q.id = qn.quiz_id
     WHERE q.id = $1
     GROUP BY q.id`,
    [quizId]
  );
  return result.rows[0] || null;
}

async function getQuizzesByCreator(creatorId) {
  const result = await db.query(
    `SELECT q.*, 
            COUNT(qn.id) as question_count
     FROM quizzes q
     LEFT JOIN questions qn ON q.id = qn.quiz_id
     WHERE q.creator_id = $1
     GROUP BY q.id
     ORDER BY q.created_at DESC`,
    [creatorId]
  );
  return result.rows;
}

// Сессии (комнаты)
async function createSession(quizId) {
  const roomCode = generateRoomCode();
  const result = await db.query(
    `INSERT INTO quiz_sessions (quiz_id, room_code, status)
     VALUES ($1, $2, 'waiting')
     RETURNING *`,
    [quizId, roomCode]
  );
  return result.rows[0];
}

async function getSessionByRoomCode(roomCode) {
  const result = await db.query(
    `SELECT s.*, q.title, q.question_time, q.rules,
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
     WHERE s.room_code = $1 AND s.status != 'finished'
     GROUP BY s.id, q.id`,
    [roomCode]
  );
  return result.rows[0] || null;
}

async function getSession(sessionId) {
  const result = await db.query(
    `SELECT s.*, q.title, q.question_time, q.rules
     FROM quiz_sessions s
     JOIN quizzes q ON s.quiz_id = q.id
     WHERE s.id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

async function startSession(sessionId) {
  const result = await db.query(
    `UPDATE quiz_sessions
     SET status = 'running', started_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'waiting'
     RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

async function finishSession(sessionId) {
  const result = await db.query(
    `UPDATE quiz_sessions
     SET status = 'finished', finished_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

async function joinSession(sessionId, userId) {
  await db.query(
    `INSERT INTO session_participants (session_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [sessionId, userId]
  );
}

async function getSessionParticipants(sessionId) {
  const result = await db.query(
    `SELECT u.id, u.username
     FROM session_participants sp
     JOIN users u ON sp.user_id = u.id
     WHERE sp.session_id = $1`,
    [sessionId]
  );
  return result.rows;
}

async function submitAnswer(sessionId, userId, questionId, selectedOptionIds, isCorrect) {
  await db.query(
    `INSERT INTO session_answers (session_id, user_id, question_id, selected_option_ids, is_correct)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, questionId, selectedOptionIds, isCorrect]
  );

  if (isCorrect) {
    const scoreResult = await db.query(
      `INSERT INTO session_results (session_id, user_id, score)
       VALUES ($1, $2, 1)
       ON CONFLICT (session_id, user_id) DO UPDATE SET score = session_results.score + 1
       RETURNING score`,
      [sessionId, userId]
    );
    return scoreResult.rows[0];
  }

  const scoreResult = await db.query(
    `SELECT score FROM session_results WHERE session_id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return scoreResult.rows[0] || { score: 0 };
}

async function getSessionLeaderboard(sessionId) {
  const result = await db.query(
    `SELECT sr.*, u.username FROM session_results sr
     JOIN users u ON sr.user_id = u.id
     WHERE sr.session_id = $1
     ORDER BY sr.score DESC`,
    [sessionId]
  );
  
  const participants = await getSessionParticipants(sessionId);
  const resultsMap = new Map();
  
  for (const p of participants) {
    const existing = result.rows.find(r => r.user_id === p.id);
    if (existing) {
      resultsMap.set(p.id, existing);
    } else {
      resultsMap.set(p.id, {
        user_id: p.id,
        username: p.username,
        score: 0,
        rank: null
      });
    }
  }
  
  const finalResults = Array.from(resultsMap.values())
    .sort((a, b) => b.score - a.score);
  
  finalResults.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return finalResults;
}

async function deleteQuestion(questionId, quizId) {
  await db.query(
    'DELETE FROM questions WHERE id = $1 AND quiz_id = $2',
    [questionId, quizId]
  );
}

module.exports = {
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
  submitAnswer,
  getSessionLeaderboard,
  deleteQuestion,
};