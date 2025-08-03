const express = require('express');
const { createClient } = require('@clickhouse/client');
const app = express();
app.use(express.json());

console.log('Analytics Service starting...', {
  host: process.env.CLICKHOUSE_HOST || 'http://clickhouse-analytics:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analyticsdb'
});

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://clickhouse-analytics:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analyticsdb'
});

app.post('/analytics', async (req, res) => {
  const { page_views, clicks, scroll_depth, page_time, session_time } = req.body;
  try {
    await clickhouse.insert({
      table: 'analytics',
      values: [{ page_views, clicks, scroll_depth, page_time, session_time }],
      format: 'JSONEachRow'
    });
    res.status(201).json({ message: 'Analytics data stored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/analytics', async (req, res) => {
  try {
    const result = await clickhouse.query({
      query: 'SELECT * FROM analytics',
      format: 'JSONEachRow'
    });
    const data = await result.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Analytics Service running on port 5000'));
