import request from 'supertest';
import app from '../app.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('GET / returns 200 and success true', async () => {
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body && res.body.success, true);
});
