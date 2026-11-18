// Handles registration, login and "who am I".
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!email.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Is the email already used?
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered" });
    }

    // Hash the password. 10 = "salt rounds" (how much work bcrypt does).
    // Hashing is one-way: we can compare passwords but never get the original back.
    const passwordHash = await bcrypt.hash(password, 10);

    // Security: the role is ALWAYS STUDENT here. We ignore any role sent by the client,
    // otherwise anyone could register themselves as ADMIN.
    const user = await prisma.user.create({
      data: { name: name.trim(), email: cleanEmail, passwordHash, role: "STUDENT" },
    });

    res.status(201).json({
      message: "Registration successful. Please log in",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error); // send the error to the central error handler
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Same message for "no such user" and "wrong password" so attackers learn nothing
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // bcrypt.compare hashes the typed password and compares it with the stored hash
    const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Create the JWT. The payload holds id, name and role; the server signs it with JWT_SECRET.
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me   (needs requireAuth)
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe };
