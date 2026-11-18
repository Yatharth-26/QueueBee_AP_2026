// Routes = which URL + HTTP method calls which controller function.
const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);

module.exports = router;
