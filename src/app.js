// Creates the Express app, adds middleware and connects the routes.
// (server.js starts it. Keeping them separate makes the app easier to test.)
const path = require("path");
const express = require("express");

const authRoutes = require("./routes/authRoutes");
const locationRoutes = require("./routes/locationRoutes");
const queueRoutes = require("./routes/queueRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Middleware = a function that runs on every request before the route handler.
// 1) Our own tiny logger: prints the method and URL of each request.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // pass control to the next middleware
});

// 2) Built-in middleware: reads JSON from the request body into req.body
app.use(express.json());

// 3) Built-in middleware: serves the frontend files (HTML, CSS, JS) from /public
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes (each file handles one part of the API)
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/admin", adminRoutes);

// These two MUST be last: unknown URL -> 404, any thrown error -> error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
