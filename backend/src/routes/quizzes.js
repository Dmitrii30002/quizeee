const express = require('express');
const { authenticate } = require('../middleware/auth');
const { query } = require('../db/connection');
const {
  createQuiz,
  addQuestion,
  getQuiz,
  getQuizzesByCreator,
  createSession,
  getSessionByRoomCode,
  startSession,
  finishSession,
  joinSession,
  getSessionParticipants,
  getSessionLeaderboard,
  deleteQuestion,
} = require('../services/quizService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const quizzes = await getQuizzesByCreator(req.user.id);
    res.json(quizzes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, category, questionTime, rules } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }
    const quiz = await createQuiz(req.user.id, title, category, questionTime, rules);
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/questions', authenticate, async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const { text, type, options } = req.body;
    if (!text || !type || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Invalid question payload' });
    }

    const question = await addQuestion(req.params.id, text, type, options);
    res.json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:quizId/questions/:questionId', authenticate, async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await deleteQuestion(req.params.questionId, req.params.quizId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/sessions', authenticate, async (req, res) => {
  try {
    const quiz = await getQuiz(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ error: 'Add at least one question' });
    }

    const session = await createSession(req.params.id);
    res.json({ session, quiz });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sessions/room/:roomCode', async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sessions/room/:roomCode/start', authenticate, async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const quiz = await getQuiz(session.quiz_id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const started = await startSession(session.id);
    res.json(started);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sessions/room/:roomCode/join', authenticate, async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await joinSession(session.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sessions/room/:roomCode/participants', authenticate, async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const participants = await getSessionParticipants(session.id);
    res.json(participants);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sessions/room/:roomCode/leaderboard', async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const leaderboard = await getSessionLeaderboard(session.id);
    res.json(leaderboard);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sessions/room/:roomCode/finish', authenticate, async (req, res) => {
  try {
    const session = await getSessionByRoomCode(req.params.roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const quiz = await getQuiz(session.quiz_id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (quiz.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const finished = await finishSession(session.id);
    res.json(finished);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/leaderboard', async (req, res) => {
  try {
    const sessions = await query(
      'SELECT id FROM quiz_sessions WHERE quiz_id = $1 ORDER BY id DESC LIMIT 1',
      [req.params.id]
    );
    
    if (sessions.rows.length === 0) {
      return res.json([]);
    }
    
    const sessionId = sessions.rows[0].id;
    
    const participants = await query(
      `SELECT u.id, u.username
       FROM session_participants sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.session_id = $1`,
      [sessionId]
    );
    
    const results = await query(
      `SELECT sr.* FROM session_results sr
       WHERE sr.session_id = $1
       ORDER BY sr.score DESC`,
      [sessionId]
    );
    
    const resultsMap = new Map();
    
    for (const p of participants.rows) {
      resultsMap.set(p.id, {
        user_id: p.id,
        username: p.username,
        score: 0,
        rank: null
      });
    }
    
    for (const r of results.rows) {
      if (resultsMap.has(r.user_id)) {
        const existing = resultsMap.get(r.user_id);
        existing.score = r.score;
        existing.rank = r.rank;
      }
    }
    
    const finalResults = Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score);
    
    finalResults.forEach((item, index) => {
      item.rank = index + 1;
    });
    
    res.json(finalResults);
  } catch (err) {
    console.error('[API] Leaderboard error:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;