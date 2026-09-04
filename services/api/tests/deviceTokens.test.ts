import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Device Token Registration', () => {
  it('should reject unauthenticated device token registration with 401', async () => {
    const res = await app.request('/users/me/device-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: 'sample-fcm-token', platform: 'android' }),
    });
    assert.strictEqual(res.status, 401);
  });

  it('should reject unauthenticated device token deletion with 401', async () => {
    const res = await app.request('/users/me/device-token', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: 'sample-fcm-token' }),
    });
    assert.strictEqual(res.status, 401);
  });
});
