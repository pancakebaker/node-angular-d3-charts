const request = require('supertest');

jest.mock('../src/services/weatherAggregate.service', () => ({
  getCombined: jest.fn(),
}));

const weatherAgg = require('../src/services/weatherAggregate.service');
const app = require('../src/app');

describe('GET /api/weather/combined', () => {
  beforeEach(() => {
    weatherAgg.getCombined.mockResolvedValue({
      location: { latitude: -33.86, longitude: 151.2 },
      generatedAtUtc: '2025-12-25T00:00:00.000Z',
      sources: {
        openMeteo: { source: 'open-meteo', raw: {} },
        bom: { source: 'bom', raw: {} },
      },
      combined: { daily: [], threeHourly: [] },
    });
  });

  it('returns combined weather payload', async () => {
    const res = await request(app).get(
      '/api/weather/combined?lat=-33.86&lon=151.20&bomSearch=Sydney&days=7'
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    expect(res.body).toEqual(
      expect.objectContaining({
        location: expect.any(Object),
        generatedAtUtc: expect.any(String),
        sources: expect.any(Object),
        combined: expect.any(Object),
      })
    );
  });

  it('validates required query params', async () => {
    const res = await request(app).get('/api/weather/combined');
    expect(res.status).toBe(400);
  });
});
