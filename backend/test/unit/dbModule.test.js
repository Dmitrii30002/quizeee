import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('db module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports query and pool from connection module', async () => {
    const connection = require('../../src/db/connection');
    expect(connection).toHaveProperty('query');
    expect(connection).toHaveProperty('pool');
  });

  it('logs and rethrows errors from query', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connection = require('../../src/db/connection');
    const originalQuery = connection.pool.query;
    connection.pool.query = vi.fn().mockRejectedValueOnce(new Error('boom'));

    await expect(connection.query('SELECT 1')).rejects.toThrow('boom');
    expect(consoleError).toHaveBeenCalled();

    connection.pool.query = originalQuery;
    consoleError.mockRestore();
  });
});
