import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = 'jest-authorization-secret';

jest.unstable_mockModule('../src/models/User.js', () => ({
  default: {
    findById: jest.fn(() => ({ select: async () => ({ role: 'intern' }) }))
  }
}));

const { default: app } = await import('../src/app.js');

describe('role and session gates', () => {
  test('admin endpoint rejects requests without an auth cookie', async () => {
    const response = await request(app).get('/api/admin/retention-policy');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: expect.any(String) });
  });

  test('intern receives 403 from an admin endpoint', async () => {
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011', email: 'intern@example.test', role: 'intern' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/admin/retention-policy').set('Cookie', `token=${token}`);
    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/admin access required/i);
  });
});
