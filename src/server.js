// Entry point: loads the .env file and starts the HTTP server.
require("dotenv").config(); // must run first so process.env has our settings

const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Please create a .env file (see .env.example).");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`QueueBee is running at http://localhost:${PORT}`);
});
