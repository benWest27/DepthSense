const request = require('supertest');
const app = require('../server'); // Ensure this points to the correct server file

describe('Dataset API Tests', () => {
  let token;

  beforeAll(async () => {
    // Authenticate and get a token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password' }); // Replace with valid credentials
    token = response.body.token;
  });

  it('should insert a dataset successfully', async () => {
    const response = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Dataset', value: 123.45 });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Dataset');
  });

  it('should fetch all datasets', async () => {
    const response = await request(app)
      .get('/api/datasets')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});