// One shared Prisma Client for the whole app.
// Prisma Client is our ORM: it lets us talk to PostgreSQL using JavaScript
// objects instead of writing raw SQL.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
