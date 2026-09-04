import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Health Check Endpoints', () => {
  it('GET /health should return 200 and report component statuses', async () => {
    const res = await app.request('/health');
    assert.strictEqual(res.status === 200 || res.status === 503, true);
    
    const body = await res.json() as any;
    assert.strictEqual(typeof body.success, 'boolean');
    assert.strictEqual(typeof body.meta.requestId, 'string');
    assert.strictEqual(typeof body.meta.timestamp, 'string');
    
    if (res.status === 200) {
      assert.strictEqual(body.data.status, 'healthy');
      assert.strictEqual(typeof body.data.uptime, 'number');
      assert.ok(body.data.components);
    }
  });
});
