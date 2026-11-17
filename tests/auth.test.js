// Authentication & Security API Tests
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Authentication & Security Test Suite', () => {
  const testStudent = {
    name: 'Test Student One',
    email: `teststudent_${Date.now()}@campus.edu`,
    password: 'password123',
  };

  afterAll(async () => {
    // Teardown test user
    await prisma.user.deleteMany({
      where: { email: testStudent.email },
    });
    await prisma.$disconnect();
  });

  test('POST /api/auth/register - Successfully registers new student with STUDENT role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        ...testStudent,
        role: 'ADMIN', // SECURITY TEST: Client attempts privilege escalation to ADMIN!
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testStudent.email);
    // MUST be STUDENT: client role injection must be strictly ignored!
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.token).toBeDefined();
  });

  test('POST /api/auth/register - Rejects registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testStudent);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register - Rejects registration with password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Password',
        email: `short_${Date.now()}@campus.edu`,
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Successfully logs in with correct credentials and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  test('POST /api/auth/login - Rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Protected route returns authenticated user with valid JWT', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testStudent.email);
  });

  test('GET /api/auth/me - Rejects request missing Bearer token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
