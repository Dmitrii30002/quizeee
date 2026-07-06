import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, saveSession, loadSession, clearSession } from '../src/api';

describe('API', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  describe('request', () => {
    it('должен добавлять Authorization header если есть токен', async () => {
      localStorage.setItem('quiz_token', 'test-token');
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'ok' }),
      });
      global.fetch = mockFetch;

      await request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('должен выбрасывать ошибку при не-ok ответе', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Not found' }),
      });
      global.fetch = mockFetch;

      await expect(request('/test')).rejects.toThrow('Not found');
    });
  });

  describe('Session', () => {
    it('saveSession должен сохранять данные в localStorage', () => {
      saveSession({ id: 1, username: 'test' }, 'token123');
      
      expect(localStorage.getItem('quiz_token')).toBe('token123');
      expect(localStorage.getItem('quiz_user')).toBe('{"id":1,"username":"test"}');
    });

    it('loadSession должен возвращать данные из localStorage', () => {
      localStorage.setItem('quiz_token', 'token123');
      localStorage.setItem('quiz_user', '{"id":1,"username":"test"}');

      const session = loadSession();
      expect(session).toEqual({ token: 'token123', user: { id: 1, username: 'test' } });
    });

    it('loadSession должен возвращать null если нет данных', () => {
      const session = loadSession();
      expect(session).toBeNull();
    });

    it('clearSession должен очищать localStorage', () => {
      localStorage.setItem('quiz_token', 'token123');
      localStorage.setItem('quiz_user', '{"id":1,"username":"test"}');
      
      clearSession();
      
      expect(localStorage.getItem('quiz_token')).toBeNull();
      expect(localStorage.getItem('quiz_user')).toBeNull();
    });
  });
});