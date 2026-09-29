import assert from 'node:assert';
import test, { describe, it } from 'node:test';
import app from '../src/app.js';

describe('App Express Server & Static Routes', () => {
  it('GET /health returns status ok', async () => {
    // Simulate req/res via node HTTP request or test listener
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.service, 'la-taberna-nyaa-extractor');
    } finally {
      server.close();
    }
  });

  it('GET / serves index.html dashboard', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/`);
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes('La Taberna Nyaa'));
      assert.ok(html.includes('id="search-form"'));
    } finally {
      server.close();
    }
  });

  it('POST /api/nyaa/schedule validates request body', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/nyaa/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    } finally {
      server.close();
    }
  });
});
