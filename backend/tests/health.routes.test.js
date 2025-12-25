const request = require('supertest');
const app = require('../src/app');

describe('health route', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('backend');
    expect(typeof res.body.time).toBe('string');
  });
});
