import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Stations Endpoint Tests', () => {
  it('should require authentication for GET /stations', async () => {
    const res = await app.request('/stations?lat=37.7749&lng=-122.4194');
    assert.strictEqual(res.status, 401);
    const body = await res.json() as any;
    assert.strictEqual(body.success, false);
  });

  it('should reject invalid auth header format for GET /stations', async () => {
    const res = await app.request('/stations?lat=37.7749&lng=-122.4194&radiusKm=50', {
      headers: {
        Authorization: 'InvalidFormat xyz',
      },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json() as any;
    assert.strictEqual(body.error.code, 'AUTH_REQUIRED');
  });
});
