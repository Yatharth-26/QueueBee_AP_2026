// Concurrency Safety & Race Condition Prevention Tests
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

describe('Concurrency Safety Test Suite', () => {
  let testQueue;
  let testLocation;
  let students = [];
  let staffMembers = [];

  beforeAll(async () => {
    // 1. Create dedicated location and queue for concurrency testing
    testLocation = await prisma.location.create({
      data: {
        name: 'Concurrency Testing Counter',
        building: 'High-Concurrency Lab',
      },
    });

    testQueue = await prisma.queue.create({
      data: {
        locationId: testLocation.id,
        name: 'High Load Stress Queue',
        status: 'OPEN',
        maxSize: 50,
        nextTicketNo: 1,
        avgServiceSeconds: 120,
      },
    });

    // 2. Pre-create 10 distinct student accounts with JWT tokens
    const passwordHash = await bcrypt.hash('password123', 10);
    for (let i = 0; i < 10; i++) {
      const email = `concurrent_student_${i}_${Date.now()}@campus.edu`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: `Concurrent Student ${i}`,
          email,
          password: 'password123',
        });
      students.push({
        id: regRes.body.data.user.id,
        token: regRes.body.data.token,
      });
    }

    // 3. Pre-create 2 staff members assigned to this queue
    for (let s = 1; s <= 2; s++) {
      const staffUser = await prisma.user.create({
        data: {
          name: `Counter Staff ${s}`,
          email: `concurrent_staff_${s}_${Date.now()}@campus.edu`,
          passwordHash,
          role: 'STAFF',
        },
      });

      await prisma.staffAssignment.create({
        data: {
          userId: staffUser.id,
          queueId: testQueue.id,
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: staffUser.email,
          password: 'password123',
        });

      staffMembers.push({
        id: staffUser.id,
        token: loginRes.body.data.token,
      });
    }
  });

  afterAll(async () => {
    // Teardown
    await prisma.queueEntry.deleteMany({ where: { queueId: testQueue.id } });
    await prisma.staffAssignment.deleteMany({ where: { queueId: testQueue.id } });
    await prisma.queue.delete({ where: { id: testQueue.id } });
    await prisma.location.delete({ where: { id: testLocation.id } });
    const userIds = [...students.map(s => s.id), ...staffMembers.map(m => m.id)];
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  test('CONCURRENCY TEST 1: 10 simultaneous students join queue - Zero duplicate tickets allocated', async () => {
    // Fire all 10 join requests simultaneously in parallel using Promise.all
    const joinPromises = students.map((student) =>
      request(app)
        .post(`/api/queues/${testQueue.id}/join`)
        .set('Authorization', `Bearer ${student.token}`)
    );

    const responses = await Promise.all(joinPromises);

    // Verify all 10 succeeded
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // Extract ticket numbers
    const allocatedTicketNos = responses.map((r) => r.body.data.ticketNo);
    expect(allocatedTicketNos.length).toBe(10);

    // CRITICAL CONCURRENCY CHECK: All ticket numbers must be completely unique!
    const uniqueTickets = new Set(allocatedTicketNos);
    expect(uniqueTickets.size).toBe(10);

    // Ensure sequential range: from 1 to 10
    const sortedTickets = [...allocatedTicketNos].sort((a, b) => a - b);
    expect(sortedTickets).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Verify database queue next_ticket_no is updated to 11
    const updatedQueue = await prisma.queue.findUnique({
      where: { id: testQueue.id },
    });
    expect(updatedQueue.nextTicketNo).toBe(11);
  });

  test('CONCURRENCY TEST 2: FOR UPDATE SKIP LOCKED - 2 concurrent staff call next simultaneously', async () => {
    // Staff 1 and Staff 2 simultaneously click "Call Next" at the exact same millisecond
    const callPromises = staffMembers.map((staff) =>
      request(app)
        .post(`/api/staff/queues/${testQueue.id}/call-next`)
        .set('Authorization', `Bearer ${staff.token}`)
    );

    const [res1, res2] = await Promise.all(callPromises);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const ticketStaff1 = res1.body.data.ticketNo;
    const ticketStaff2 = res2.body.data.ticketNo;

    // FOR UPDATE SKIP LOCKED VERIFICATION:
    // Staff 1 locked ticket #1.
    // Staff 2 skipped the locked row and locked ticket #2!
    // Neither staff received the same ticket!
    expect(ticketStaff1).not.toBe(ticketStaff2);
    expect([1, 2]).toContain(ticketStaff1);
    expect([1, 2]).toContain(ticketStaff2);

    // Complete both so staff counters are freed
    await request(app)
      .post(`/api/staff/entries/${res1.body.data.id}/complete`)
      .set('Authorization', `Bearer ${staffMembers[0].token}`);

    await request(app)
      .post(`/api/staff/entries/${res2.body.data.id}/complete`)
      .set('Authorization', `Bearer ${staffMembers[1].token}`);
  });
});
