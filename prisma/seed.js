// High-Volume Realistic Campus Database Seeding Script (10,000+ Records)
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee) · Team T0083

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Smart Queue (QueueBee) Database Seeding...');
  const startTime = Date.now();

  // Clean existing tables in cascade order
  console.log('🧹 Purging existing data...');
  await prisma.queueStatsHourly.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  console.log('🔑 Hashing default passwords...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('adminPassword123', 10);

  // 1. Create Core Administrative & Staff Users
  console.log('👤 Creating Admin and Staff accounts...');
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@smartqueue.campus',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const staffCanteen = await prisma.user.create({
    data: {
      name: 'Ramesh Kumar (Canteen Supervisor)',
      email: 'staff.canteen@smartqueue.campus',
      passwordHash: defaultPasswordHash,
      role: 'STAFF',
    },
  });

  const staffLibrary = await prisma.user.create({
    data: {
      name: 'Priya Sharma (Head Librarian)',
      email: 'staff.library@smartqueue.campus',
      passwordHash: defaultPasswordHash,
      role: 'STAFF',
    },
  });

  const staffAccounts = await prisma.user.create({
    data: {
      name: 'Anil Verma (Senior Accounts Officer)',
      email: 'staff.accounts@smartqueue.campus',
      passwordHash: defaultPasswordHash,
      role: 'STAFF',
    },
  });

  const staffAcademic = await prisma.user.create({
    data: {
      name: 'Sunita Rao (Academic Registrar Desk)',
      email: 'staff.academic@smartqueue.campus',
      passwordHash: defaultPasswordHash,
      role: 'STAFF',
    },
  });

  const staffList = [staffCanteen, staffLibrary, staffAccounts, staffAcademic];

  // 2. Create Core Team Student Accounts
  console.log('🎓 Creating Team Student Accounts...');
  const teamStudents = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Yatharth Soni (Lead)',
        email: 'yatharth@student.campus',
        passwordHash: defaultPasswordHash,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Madhav Aggarwal',
        email: 'madhav@student.campus',
        passwordHash: defaultPasswordHash,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kavy Singhvi',
        email: 'kavy@student.campus',
        passwordHash: defaultPasswordHash,
        role: 'STUDENT',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Aaditya Bansal',
        email: 'aaditya@student.campus',
        passwordHash: defaultPasswordHash,
        role: 'STUDENT',
      },
    }),
  ]);

  // Create additional 100 realistic student users
  console.log('👥 Generating 100 student accounts...');
  const studentData = [];
  for (let i = 1; i <= 100; i++) {
    studentData.push({
      name: faker.person.fullName(),
      email: `student${i}@campus.edu`,
      passwordHash: defaultPasswordHash,
      role: 'STUDENT',
    });
  }
  await prisma.user.createMany({ data: studentData });

  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  });

  // 3. Create Campus Locations
  console.log('🏢 Creating Campus Locations...');
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Main Student Canteen',
        building: 'Student Activity Center (SAC)',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Central Library Circulation',
        building: 'Dr. Sarvepalli Radhakrishnan Library',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Accounts & Student Fee Counter',
        building: 'Administrative Block - Floor 1',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Academic Affairs & Certificates',
        building: 'Administrative Block - Floor 2',
      },
    }),
  ]);

  // 4. Create Service Queues
  console.log('📋 Creating Service Queues...');
  const queues = await Promise.all([
    // Canteen Queues
    prisma.queue.create({
      data: {
        locationId: locations[0].id,
        name: 'Hot Meals & Lunch Thali Counter',
        maxSize: 60,
        avgServiceSeconds: 240, // 4 mins median
        status: 'OPEN',
      },
    }),
    prisma.queue.create({
      data: {
        locationId: locations[0].id,
        name: 'Snacks & Beverage Express Counter',
        maxSize: 40,
        avgServiceSeconds: 120, // 2 mins median
        status: 'OPEN',
      },
    }),
    // Library Queues
    prisma.queue.create({
      data: {
        locationId: locations[1].id,
        name: 'Book Issue & Return Desk',
        maxSize: 50,
        avgServiceSeconds: 180, // 3 mins median
        status: 'OPEN',
      },
    }),
    prisma.queue.create({
      data: {
        locationId: locations[1].id,
        name: 'No-Dues & Clearance Counter',
        maxSize: 30,
        avgServiceSeconds: 300, // 5 mins median
        status: 'OPEN',
      },
    }),
    // Accounts Queues
    prisma.queue.create({
      data: {
        locationId: locations[2].id,
        name: 'Semester Fee Verification Desk',
        maxSize: 45,
        avgServiceSeconds: 360, // 6 mins median
        status: 'OPEN',
      },
    }),
    // Academic Cell
    prisma.queue.create({
      data: {
        locationId: locations[3].id,
        name: 'Grade Sheet & Degree Issue Counter',
        maxSize: 50,
        avgServiceSeconds: 420, // 7 mins median
        status: 'OPEN',
      },
    }),
  ]);

  // 5. Create Staff Assignments
  console.log('🔗 Assigning staff members to counter queues...');
  await prisma.staffAssignment.createMany({
    data: [
      { userId: staffCanteen.id, queueId: queues[0].id },
      { userId: staffCanteen.id, queueId: queues[1].id },
      { userId: staffLibrary.id, queueId: queues[2].id },
      { userId: staffLibrary.id, queueId: queues[3].id },
      { userId: staffAccounts.id, queueId: queues[4].id },
      { userId: staffAcademic.id, queueId: queues[5].id },
    ],
  });

  // 6. Generate 10,000+ Historical Realistic Queue Entries
  const TOTAL_ENTRIES = 10500;
  console.log(`📊 Generating ${TOTAL_ENTRIES} realistic historical queue entries across 30 days...`);

  const batchSize = 1000;
  let ticketCounters = {};
  queues.forEach((q) => {
    ticketCounters[q.id] = 1;
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let currentBatch = [];

  for (let i = 0; i < TOTAL_ENTRIES; i++) {
    const queue = queues[i % queues.length];
    const ticketNo = ticketCounters[queue.id]++;
    const student = allStudents[i % allStudents.length];
    const staff = staffList[i % staffList.length];

    // Distribute timestamps over past 30 days during operational campus hours (8:30 AM to 5:30 PM)
    const randomDayOffset = Math.floor(Math.random() * 30);
    const entryDate = new Date(thirtyDaysAgo.getTime() + randomDayOffset * 24 * 60 * 60 * 1000);

    const operationalHour = 8 + Math.floor(Math.random() * 9); // 8 AM to 5 PM
    const operationalMin = Math.floor(Math.random() * 60);
    const operationalSec = Math.floor(Math.random() * 60);
    entryDate.setHours(operationalHour, operationalMin, operationalSec);

    // Realistic status distribution
    const rand = Math.random();
    let status = 'SERVED';
    let calledAt = null;
    let servedAt = null;
    let servedBy = null;

    if (rand < 0.83) {
      // 83% SERVED
      status = 'SERVED';
      const waitTimeSec = 60 + Math.floor(Math.random() * 600); // 1 to 10 mins wait
      calledAt = new Date(entryDate.getTime() + waitTimeSec * 1000);

      // Realistic service duration: mostly ~3-5 mins, occasional 15-20 min outliers
      let serviceSec = 120 + Math.floor(Math.random() * 300);
      if (Math.random() < 0.05) {
        serviceSec = 900 + Math.floor(Math.random() * 600); // 15-25 min outlier
      }
      servedAt = new Date(calledAt.getTime() + serviceSec * 1000);
      servedBy = staff.id;
    } else if (rand < 0.90) {
      // 7% NO_SHOW
      status = 'NO_SHOW';
      const waitTimeSec = 120 + Math.floor(Math.random() * 400);
      calledAt = new Date(entryDate.getTime() + waitTimeSec * 1000);
      servedAt = new Date(calledAt.getTime() + 180 * 1000); // 3 mins timeout
      servedBy = staff.id;
    } else {
      // 10% CANCELLED (student left before counter)
      status = 'CANCELLED';
    }

    currentBatch.push({
      queueId: queue.id,
      userId: student.id,
      ticketNo,
      status,
      joinedAt: entryDate,
      calledAt,
      servedAt,
      servedBy,
    });

    if (currentBatch.length >= batchSize) {
      await prisma.queueEntry.createMany({ data: currentBatch });
      process.stdout.write(`  ✓ Inserted ${i + 1} / ${TOTAL_ENTRIES} entries...\r`);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    await prisma.queueEntry.createMany({ data: currentBatch });
    console.log(`  ✓ Inserted final entries. Total: ${TOTAL_ENTRIES}`);
  }

  // 7. Generate a few live active waiting & called entries for demo
  console.log('🎫 Adding active demo tickets for live testing...');
  let studentCounter = 0;
  for (let qIdx = 0; qIdx < queues.length; qIdx++) {
    const queue = queues[qIdx];
    // 1 called entry
    const calledStudent = allStudents[studentCounter++];
    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        userId: calledStudent.id,
        ticketNo: ticketCounters[queue.id]++,
        status: 'CALLED',
        joinedAt: new Date(Date.now() - 600000), // 10 mins ago
        calledAt: new Date(Date.now() - 120000), // 2 mins ago
        servedBy: staffList[qIdx % staffList.length].id,
      },
    });

    // 3 waiting entries per queue (with unique students)
    for (let w = 0; w < 3; w++) {
      const waitStudent = allStudents[studentCounter++];
      await prisma.queueEntry.create({
        data: {
          queueId: queue.id,
          userId: waitStudent.id,
          ticketNo: ticketCounters[queue.id]++,
          status: 'WAITING',
          joinedAt: new Date(Date.now() - (3 - w) * 180000),
        },
      });
    }

    // Update next ticket number on queue
    await prisma.queue.update({
      where: { id: queue.id },
      data: { nextTicketNo: ticketCounters[queue.id] },
    });
  }

  // 8. Populate queue_stats_hourly pre-aggregated analytics
  console.log('📈 Pre-aggregating hourly queue statistics (queue_stats_hourly)...');
  await prisma.$executeRaw`
    INSERT INTO queue_stats_hourly (id, queue_id, hour, joins, served, no_shows, avg_wait_seconds)
    SELECT 
      gen_random_uuid() AS id,
      queue_id,
      date_trunc('hour', joined_at) AS hour,
      COUNT(*) AS joins,
      COUNT(CASE WHEN status = 'SERVED' THEN 1 END) AS served,
      COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) AS no_shows,
      COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - joined_at))), 0) AS avg_wait_seconds
    FROM queue_entries
    GROUP BY queue_id, date_trunc('hour', joined_at)
    ON CONFLICT (queue_id, hour) DO NOTHING;
  `;

  const totalEntriesCount = await prisma.queueEntry.count();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`🎉 Seeding completed successfully in ${duration}s!`);
  console.log(`📊 Total Queue Entries in DB: ${totalEntriesCount.toLocaleString()}`);
  console.log(`======================================================`);
  console.log(`🔐 DEMO LOGIN CREDENTIALS:`);
  console.log(`------------------------------------------------------`);
  console.log(`👑 Administrator:`);
  console.log(`   Email:    admin@smartqueue.campus`);
  console.log(`   Password: adminPassword123`);
  console.log(``);
  console.log(`👔 Staff Counter Operators:`);
  console.log(`   Canteen:  staff.canteen@smartqueue.campus (password: password123)`);
  console.log(`   Library:  staff.library@smartqueue.campus (password: password123)`);
  console.log(`   Accounts: staff.accounts@smartqueue.campus (password: password123)`);
  console.log(`   Academic: staff.academic@smartqueue.campus (password: password123)`);
  console.log(``);
  console.log(`🎓 Student Accounts:`);
  console.log(`   Lead:     yatharth@student.campus (password: password123)`);
  console.log(`   Student:  student1@campus.edu (password: password123)`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
