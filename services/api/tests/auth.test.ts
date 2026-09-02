import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

describe('Auth Middleware & Security Checks', () => {
  it('should return 401 AUTH_REQUIRED when Authorization header is missing', async () => {
    const res = await app.request('/vehicles');
    assert.strictEqual(res.status, 401);
    
    const body = await res.json() as any;
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'AUTH_REQUIRED');
  });

  it('should return 401 AUTH_REQUIRED when Authorization header is malformed', async () => {
    const res = await app.request('/vehicles', {
      headers: {
        Authorization: 'Basic invalidcredentials',
      },
    });
    assert.strictEqual(res.status, 401);
    
    const body = await res.json() as any;
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'AUTH_REQUIRED');
  });

  it('should return 401 AUTH_INVALID when Firebase token is expired or invalid', async () => {
    const res = await app.request('/vehicles', {
      headers: {
        Authorization: 'Bearer invalid-token-string-xyz',
      },
    });
    assert.strictEqual(res.status, 401);
    
    const body = await res.json() as any;
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'AUTH_INVALID');
  });
});
