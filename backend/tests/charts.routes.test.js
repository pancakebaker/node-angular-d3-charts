const request = require('supertest');

jest.mock('../src/services/weatherCharts.service', () => ({
  getWeatherBarChart: jest.fn(),
  getWeatherPieChart: jest.fn(),
}));

const weatherChartsService = require('../src/services/weatherCharts.service');
const app = require('../src/app');

describe('charts routes', () => {
  beforeEach(() => {
    weatherChartsService.getWeatherBarChart.mockResolvedValue({
      title: 'Daily Max Temperature (°C) • Sydney',
      data: [
        { date: '2026-05-20', openMeteo: 21.5, bom: 22.1 },
        { date: '2026-05-21', openMeteo: 23.2, bom: 24 },
      ],
    });

    weatherChartsService.getWeatherPieChart.mockResolvedValue({
      title: 'Temperature Share by Day • Sydney',
      data: [
        { date: '2026-05-20', openMeteo: 21.5, bom: 22.1 },
        { date: '2026-05-21', openMeteo: 23.2, bom: 24 },
      ],
      meta: { unit: '°C', sources: ['open-meteo', 'bom'] },
    });
  });

  it('GET /api/barchart returns weather chart payload', async () => {
    const res = await request(app).get('/api/barchart');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    expect(res.body).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        data: expect.any(Array),
      })
    );

    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        bom: expect.any(Number),
        openMeteo: expect.any(Number),
      })
    );
  });

  it('GET /api/piechart returns weather chart payload', async () => {
    const res = await request(app).get('/api/piechart');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    expect(res.body).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        data: expect.any(Array),
      })
    );

    expect(res.body.meta).toEqual(
      expect.objectContaining({
        unit: '°C',
        sources: expect.arrayContaining(['open-meteo', 'bom']),
      })
    );

    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        bom: expect.any(Number),
        openMeteo: expect.any(Number),
      })
    );
  });
});
