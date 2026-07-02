const { query } = require('./connection');

const migrations = [
  {
    id: 1,
    name: 'Create users table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);
    },
  },
  {
    id: 2,
    name: 'Create quizzes table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS quizzes (
          id SERIAL PRIMARY KEY,
          creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          question_time INTEGER NOT NULL DEFAULT 20,
          rules TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON quizzes(creator_id);
      `);
    },
  },
  {
    id: 3,
    name: 'Create questions table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('single', 'multiple')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
      `);
    },
  },
  {
    id: 4,
    name: 'Create question options table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS question_options (
          id SERIAL PRIMARY KEY,
          question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          text VARCHAR(255) NOT NULL,
          is_correct BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_options_question ON question_options(question_id);
      `);
    },
  },
  {
    id: 5,
    name: 'Create quiz sessions table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS quiz_sessions (
          id SERIAL PRIMARY KEY,
          quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          room_code VARCHAR(10) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'running', 'finished')),
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          finished_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_quiz ON quiz_sessions(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON quiz_sessions(room_code);
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON quiz_sessions(status);
      `);
    },
  },
  {
    id: 6,
    name: 'Create session participants table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS session_participants (
          id SERIAL PRIMARY KEY,
          session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(session_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_participants_session ON session_participants(session_id);
        CREATE INDEX IF NOT EXISTS idx_participants_user ON session_participants(user_id);
      `);
    },
  },
  {
    id: 7,
    name: 'Create session answers table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS session_answers (
          id SERIAL PRIMARY KEY,
          session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          selected_option_ids INTEGER[] NOT NULL,
          is_correct BOOLEAN NOT NULL,
          answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_answers_session_user ON session_answers(session_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_answers_question ON session_answers(question_id);
      `);
    },
  },
  {
    id: 8,
    name: 'Create session results table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS session_results (
          id SERIAL PRIMARY KEY,
          session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          score INTEGER NOT NULL DEFAULT 0,
          rank INTEGER,
          finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(session_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_results_session ON session_results(session_id);
        CREATE INDEX IF NOT EXISTS idx_results_user ON session_results(user_id);
      `);
    },
  },
  {
    id: 9,
    name: 'Create migrations table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
];

async function runMigrations() {
  console.log('[MIGRATIONS] Starting...');
  
  // Create migrations table first
  await migrations[8].up();

  for (const migration of migrations) {
    const result = await query('SELECT id FROM migrations WHERE id = $1', [migration.id]);
    
    if (result.rows.length === 0) {
      console.log(`[MIGRATION] Running: ${migration.name}`);
      try {
        await migration.up();
        await query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
        console.log(`[MIGRATION] ✓ ${migration.name}`);
      } catch (err) {
        console.error(`[MIGRATION] ✗ ${migration.name}:`, err.message);
        throw err;
      }
    }
  }

  console.log('[MIGRATIONS] Complete');
}

module.exports = {
  runMigrations,
};