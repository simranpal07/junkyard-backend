/**
 * Smoke tests for API (health and public parts).
 * Run with: npm test
 * NODE_ENV=test is set by Jest so server does not listen on a port.
 */
import request from 'supertest';
import { app } from '../server';

describe('API', () => {
  describe('GET /api/health', () => {
    it('returns 200 and ok true', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('backend', 'Car Parts');
      expect(res.body).toHaveProperty('time');
    });
  });

  describe('GET /', () => {
    it('returns 200 and welcome message', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Car Parts');
    });
  });

  describe('GET /api/parts', () => {
    it('returns 200 and array when DB available, or 500 when DB unavailable', async () => {
      const res = await request(app).get('/api/parts');
      if (res.status === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      } else {
        expect(res.status).toBe(500);
      }
    });
  });

  describe('404', () => {
    it('returns 404 for unknown route', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
