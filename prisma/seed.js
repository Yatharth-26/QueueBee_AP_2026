// Seeding = filling the database with starting data so the app is usable on day one.
// Run with:  npm run seed      (running it again resets the data)
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// helper: a time N minutes ago
function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  // 1) Clear old data (tickets first, because they depend on users and locations)
  await prisma.queueTicket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();

  // 2) Create users. Every demo account uses the password: password123
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: { name: "Admin Anita", email: "admin@queuebee.edu", passwordHash, role: "ADMIN" },
  });
  const staff = await prisma.user.create({
    data: { name: "Staff Sameer", email: "staff@queuebee.edu", passwordHash, role: "STAFF" },
  });
  const demoStudent = await prisma.user.create({
    data: { name: "Demo Student", email: "student@queuebee.edu", passwordHash, role: "STUDENT" },
  });
  const riya = await prisma.user.create({
    data: { name: "Riya Sharma", email: "riya@queuebee.edu", passwordHash, role: "STUDENT" },
  });
  const kabir = await prisma.user.create({
    data: { name: "Kabir Mehta", email: "kabir@queuebee.edu", passwordHash, role: "STUDENT" },
  });
  const meera = await prisma.user.create({
    data: { name: "Meera Nair", email: "meera@queuebee.edu", passwordHash, role: "STUDENT" },
  });

  // 3) Create locations
  const canteen = await prisma.location.create({
    data: { name: "Canteen", description: "Main campus canteen - food counter", avgServiceMinutes: 3 },
  });
  const library = await prisma.location.create({
    data: { name: "Library Desk", description: "Book issue and return desk", avgServiceMinutes: 4 },
  });
  const feeOffice = await prisma.location.create({
    data: { name: "Fee Office", description: "Fee payment and receipts", avgServiceMinutes: 6 },
  });
  await prisma.location.create({
    data: { name: "Certificate Counter", description: "Bonafide and other certificates", avgServiceMinutes: 8 },
  });

  // 4) Create sample tickets (some finished, some waiting) so statistics are not empty
  await prisma.queueTicket.createMany({
    data: [
      // Canteen
      { ticketNumber: 1, status: "COMPLETED", userId: riya.id, locationId: canteen.id, createdAt: minutesAgo(90), calledAt: minutesAgo(85), completedAt: minutesAgo(82) },
      { ticketNumber: 2, status: "COMPLETED", userId: kabir.id, locationId: canteen.id, createdAt: minutesAgo(80), calledAt: minutesAgo(78), completedAt: minutesAgo(75) },
      { ticketNumber: 3, status: "WAITING", userId: riya.id, locationId: canteen.id, createdAt: minutesAgo(10) },
      { ticketNumber: 4, status: "WAITING", userId: kabir.id, locationId: canteen.id, createdAt: minutesAgo(5) },
      // Library Desk
      { ticketNumber: 1, status: "COMPLETED", userId: demoStudent.id, locationId: library.id, createdAt: minutesAgo(200), calledAt: minutesAgo(195), completedAt: minutesAgo(190) },
      { ticketNumber: 2, status: "WAITING", userId: meera.id, locationId: library.id, createdAt: minutesAgo(8) },
      // Fee Office
      { ticketNumber: 1, status: "CANCELLED", userId: demoStudent.id, locationId: feeOffice.id, createdAt: minutesAgo(300) },
      { ticketNumber: 2, status: "COMPLETED", userId: meera.id, locationId: feeOffice.id, createdAt: minutesAgo(250), calledAt: minutesAgo(245), completedAt: minutesAgo(238) },
    ],
  });

  console.log("Seed finished. Demo logins (password for all: password123):");
  console.log("  Admin   : " + admin.email);
  console.log("  Staff   : " + staff.email);
  console.log("  Student : " + demoStudent.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
