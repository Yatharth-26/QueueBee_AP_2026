// Queue Lifecycle & State Transitions Integration Tests
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Queue Lifecycle & State Transitions Test Suite', () => {
  let studentToken;
  let staffToken;
  let studentUser;
  let staffUser;
  let testQueue;
  let testLocation;

  beforeAll(async () => {
    // 1. Create test location
    testLocation = await prisma.location.create({
      data: {
        name: 'Test Canteen Facility',
        building: 'Engineering Block 3',
      },
    });

    // 2. Create test queue
    testQueue = await prisma.queue.create({
      data: {
        locationId: testLocation.id,
        name: 'Quick Meal Counter',
        status: 'OPEN',
        maxSize: 20,
        nextTicketNo: 100,
        avgServiceSeconds: 180,
      },
    });

    // 3. Create test student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Integration Student',
        email: `student_integ_${Date.now()}@campus.edu`,
        password: 'password123',
      });
    studentToken = studentRes.body.data.token;
    studentUser = studentRes.body.data.user;

    // 4. Create staff user and assignment
    const bcrypt = require('bcryptjs');
    staffUser = await prisma.user.create({
      data: {
        name: 'Staff Operator Integ',
        email: `staff_integ_${Date.now()}@campus.edu`,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'STAFF',
      },
    });

    await prisma.staffAssignment.create({
      data: {
        userId: staffUser.id,
        queueId: testQueue.id,
      },
    });

    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: staffUser.email,
        password: 'password123',
      });
    staffToken = staffLoginRes.body.data.token;
  });

  afterAll(async () => {
    // Teardown
    await prisma.queueEntry.deleteMany({ where: { queueId: testQueue.id } });
    await prisma.staffAssignment.deleteMany({ where: { queueId: testQueue.id } });
    await prisma.queue.delete({ where: { id: testQueue.id } });
    await prisma.location.delete({ where: { id: testLocation.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [studentUser.id, staffUser.id] } },
    });
    await prisma.$disconnect();
  });

  test('POST /api/queues/:id/join - Student joins open queue, generates unique ticket #100', async () => {
    const res = await request(app)
      .post(`/api/queues/${testQueue.id}/join`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketNo).toBe(100);
    expect(res.body.data.status).toBe('WAITING');
  });

  test('POST /api/queues/:id/join - Rejects joining when student already has active ticket', async () => {
    const res = await request(app)
      .post(`/api/queues/${testQueue.id}/join`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already have an active ticket');
  });

  test('GET /api/queues/:id/my-position - Returns live position and median ETA', async () => {
    const res = await request(app)
      .get(`/api/queues/${testQueue.id}/my-position`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.ticketNo).toBe(100);
    expect(res.body.data.status).toBe('WAITING');
    expect(res.body.data.peopleAhead).toBe(0);
    expect(res.body.data.estimatedWait).toBeDefined();
  });

  test('POST /api/staff/queues/:id/call-next - Staff calls next student using FOR UPDATE SKIP LOCKED', async () => {
    const res = await request(app)
      .post(`/api/staff/queues/${testQueue.id}/call-next`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.ticketNo).toBe(100);
    expect(res.body.data.status).toBe('CALLED');
    expect(res.body.data.servedBy).toBe(staffUser.id);
  });

  test('GET /api/queues/:id/my-position - Student position now reports CALLED status', async () => {
    const res = await request(app)
      .get(`/api/queues/${testQueue.id}/my-position`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CALLED');
    expect(res.body.data.isCalled).toBe(true);
  });

  test('POST /api/staff/entries/:entryId/complete - Staff completes service and updates history', async () => {
    // Find called entry
    const entry = await prisma.queueEntry.findFirst({
      where: { queueId: testQueue.id, status: 'CALLED' },
    });

    const res = await request(app)
      .post(`/api/staff/entries/${entry.id}/complete`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.entry.status).toBe('SERVED');
    expect(res.body.data.entry.servedAt).toBeDefined();
  });
});
