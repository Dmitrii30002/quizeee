const express = require('express');
const { authenticate } = require('../middleware/auth');
const { register, login, getProfile, getUserHistory } = require('../services/userService');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const { user, token } = await register(username, password);
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const { user, token } = await login(username, password);
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await getProfile(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await getUserHistory(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
