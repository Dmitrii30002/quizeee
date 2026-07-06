import { describe, it, beforeEach, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('userService', () => {
  let queryMock;
  let register;
  let login;
  let getProfile;
  let getUserHistory;

  beforeEach(() => {
    vi.resetModules();
    queryMock = vi.fn();

    const dbConnection = require('../../src/db/connection');
    dbConnection.query = queryMock;

    const auth = require('../../src/middleware/auth');
    auth.createToken = vi.fn((user) => `token-${user.username}`);

    ({ register, login, getProfile, getUserHistory } = require('../../src/services/userService'));
  });

  it('registers a new user and returns a token', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'alice' }] });

    const result = await register('alice', 'secret123');

    expect(queryMock).toHaveBeenCalledWith('SELECT id FROM users WHERE username = $1', ['alice']);
    expect(queryMock).toHaveBeenCalledWith(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      ['alice', expect.any(String)]
    );
    expect(result.user).toEqual({ id: 1, username: 'alice' });
    expect(result.token).toBe('token-alice');
  });

  it('rejects missing credentials and short usernames during registration', async () => {
    await expect(register('', 'secret123')).rejects.toThrow('Username and password required');
    await expect(register('alice', '')).rejects.toThrow('Username and password required');
    await expect(register('ab', 'secret123')).rejects.toThrow('Username must be at least 3 characters');
  });

  it('rejects duplicate usernames during registration', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await expect(register('alice', 'secret123')).rejects.toThrow('Username already taken');
  });

  it('logs in an existing user with the correct password', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    queryMock.mockResolvedValueOnce({ rows: [{ id: 7, username: 'bob', password_hash: passwordHash }] });

    const result = await login('bob', 'secret123');

    expect(result.user).toEqual({ id: 7, username: 'bob' });
    expect(result.token).toBe('token-bob');
  });

  it('rejects missing credentials and invalid login attempts', async () => {
    await expect(login('', 'secret123')).rejects.toThrow('Username and password required');
    await expect(login('bob', '')).rejects.toThrow('Username and password required');

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(login('unknown', 'secret123')).rejects.toThrow('Invalid username or password');

    const passwordHash = await bcrypt.hash('secret123', 10);
    queryMock.mockResolvedValueOnce({ rows: [{ id: 7, username: 'bob', password_hash: passwordHash }] });
    await expect(login('bob', 'wrong-password')).rejects.toThrow('Invalid username or password');
  });

  it('returns a user profile when found and throws when it is missing', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 3, username: 'carol', created_at: '2024-01-01' }] });
    await expect(getProfile(3)).resolves.toEqual({ id: 3, username: 'carol', created_at: '2024-01-01' });

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(getProfile(999)).rejects.toThrow('User not found');
  });

  it('returns user history rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, quiz_id: 2, title: 'Math', category: 'education', finished_at: '2024-01-01' }] });

    await expect(getUserHistory(5)).resolves.toEqual([{ id: 1, quiz_id: 2, title: 'Math', category: 'education', finished_at: '2024-01-01' }]);
  });
});
