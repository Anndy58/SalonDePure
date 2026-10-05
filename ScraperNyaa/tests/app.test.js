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

  it('POST /api/nyaa/schedule is no longer available', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/nyaa/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 404);
    } finally {
      server.close();
    }
  });

  it('streams each shallow result before the completion event', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/nyaa/stream-logs?q=1080p&mode=shallow&limit=1`);
      const body = await res.text();
      const events = body
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.slice(6)));
      const resultIndex = events.findIndex((event) => event.type === 'RESULT');
      const completeIndex = events.findIndex((event) => event.type === 'COMPLETE');

      assert.strictEqual(res.status, 200);
      assert.ok(resultIndex >= 0, 'stream should include a result event');
      assert.ok(completeIndex > resultIndex, 'completion should follow result events');
      assert.strictEqual(typeof events[completeIndex].stats.scannedCount, 'number');
    } finally {
      server.close();
    }
  });
});
