import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // assert manually
});

describe('Analytics Service – smoke flow', () => {
  test('GET /analytics returns welcome', async () => {
    const res = await client.get('/analytics');
    expect([200, 204]).toContain(res.status);
    // can be text/html, so just check it contains the phrase
    expect(String(res.data)).toMatch(/Welcome to the Analytics Service/i);
  });

  test('POST /analytics/analytics accepts a payload', async () => {
    const payload = {
      page_views: 1,
      clicks: 0,
      scroll_depth: 61,
      page_time: 4,
      session_time: 4
    };
    const res = await client.post('/analytics/analytics', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    expect([200, 201]).toContain(res.status);
    // typical response: { message: 'Analytics data stored' }
    expect(res.data).toBeDefined();
  });

  test('GET /analytics/analytics lists rows (array)', async () => {
    const res = await client.get('/analytics/analytics');
    // ClickHouse query returns JSONEachRow -> usually array of objects
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    // sanity: at least one object with expected keys (if table has data)
    if (res.data.length > 0) {
      const row = res.data[0];
      ['page_views','clicks','scroll_depth','page_time','session_time']
        .forEach(k => expect(row).toHaveProperty(k));
    }
  });
});
