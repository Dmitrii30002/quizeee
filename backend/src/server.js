require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { runMigrations } = require('./db/migrations');
const { initWebSocket, scheduleQuiz } = require('./websocket/handler');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

initWebSocket(io);

app.post('/api/quizzes/:id/start-live', async (req, res) => {
  try {
    const { quizId, roomCode, questions, questionTime } = req.body;
    scheduleQuiz(io, quizId, roomCode, questions, questionTime);
    res.json({ message: 'Quiz started' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function start() {
  try {
    console.log('[APP] Running migrations...');
    await runMigrations();
    console.log('[APP] Migrations complete');

    server.listen(PORT, () => {
      console.log(`[APP] Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[APP] Startup error:', err);
    process.exit(1);
  }
}

start();
