const request = require('supertest');
const app = require('../src/app');

describe('charts routes', () => {
  it('GET /api/barchart returns weather chart payload', async () => {
    const res = await request(app).get('/api/barchart');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    // barchart returns { title, data } (meta may not be present)
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
        // openMeteo is optional
      })
    );
  });

  it('GET /api/piechart returns weather chart payload', async () => {
    const res = await request(app).get('/api/piechart');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    // piechart DOES include meta in your current output (keep this if true)
    expect(res.body).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        data: expect.any(Array),
      })
    );

    if (res.body.meta) {
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          unit: expect.any(String),
          sources: expect.any(Array),
        })
      );
    }

    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        bom: expect.any(Number),
      })
    );
  });
});
