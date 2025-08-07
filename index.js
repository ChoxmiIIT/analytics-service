const express = require('express');
const { createClient } = require('@clickhouse/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const app = express();
app.use(express.json());

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://clickhouse-analytics:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analyticsdb'
});

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

function arrayToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row =>
      headers.map(field => JSON.stringify(row[field] ?? "")).join(",")
    )
  ];
  return csv.join("\n");
}

async function saveToS3(data) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: 'analytics_data.csv',
    Body: data,
    ContentType: "text/csv",
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3.send(command);
    console.log("Upload successful:", result);
    return result;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
}

setInterval(async () => {
  const result = await clickhouse.query({
      query: 'SELECT * FROM analytics',
      format: 'JSONEachRow'
    });
    const data = await result.json();
    saveToS3(arrayToCSV(data))
      .then(() => console.log("Data saved to S3 successfully"))
      .catch(err => console.error("Failed to save data to S3:", err));
  console.log("Save analytics data to S3 every minute");
}, 300000);

app.post('/analytics/analytics', async (req, res) => {
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

app.get('/analytics/analytics', async (req, res) => {
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

app.get('/analytics', (req, res) => {
    res.send('Welcome to the Analytics Service');
});

app.listen(5000, () => console.log('Analytics Service running on port 5000'));
