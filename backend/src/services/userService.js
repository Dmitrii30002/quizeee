const bcrypt = require('bcryptjs');
const { query } = require('../db/connection');
const { createToken } = require('../middleware/auth');

async function register(username, password) {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    throw new Error('Username already taken');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash]
  );

  const user = result.rows[0];
  const token = createToken(user);
  return { user, token };
}

async function login(username, password) {
  if (!username || !password) {
    throw new Error('Username and password required');
  }

  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid username or password');
  }

  const token = createToken({
    id: user.id,
    username: user.username,
  });

  return {
    user: { id: user.id, username: user.username },
    token,
  };
}

async function getProfile(userId) {
  const result = await query(
    `SELECT id, username, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  return result.rows[0];
}

async function getUserHistory(userId) {
  const result = await query(
    `SELECT qr.*, q.title, q.category, q.finished_at
     FROM quiz_results qr
     JOIN quizzes q ON qr.quiz_id = q.id
     WHERE qr.user_id = $1
     ORDER BY qr.finished_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  register,
  login,
  getProfile,
  getUserHistory,
};


module.exports = {
  register,
  login,
  getProfile,
  getUserHistory,
};
