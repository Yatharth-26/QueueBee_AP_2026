// Register page logic
renderNavbar();

const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Form validation with clear messages
  if (!name) {
    showMessage("Please enter your name");
    return;
  }
  if (!email.includes("@")) {
    showMessage("Please enter a valid email address");
    return;
  }
  if (password.length < 6) {
    showMessage("Password must be at least 6 characters");
    return;
  }
  if (password !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  try {
    await apiRequest("/auth/register", "POST", { name, email, password });
    showMessage("Registration successful! Redirecting to login...", "success");
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  } catch (error) {
    showMessage(error.message);
  }
});
