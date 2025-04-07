const request = require('supertest');
const app = require('../server'); // Ensure this path points to the correct server file

describe('API Gateway Tests', () => {
  it('should route /auth/register to auth service', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password',
    });
    expect(response.status).toBe(201);
  });
});