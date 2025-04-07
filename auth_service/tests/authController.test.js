const request = require('supertest');
const app = require('../server'); // Ensure this points to the correct server file

describe('Auth Controller API Tests', () => {
  it('should register a user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test',
        email: 'test@example.com',
        password: 'password',
        role: 'viewer',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully!');
  });

  it('should fail login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'invalid',
        password: 'wrong',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});