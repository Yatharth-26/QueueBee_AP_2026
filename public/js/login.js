// Login page logic
renderNavbar();

const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser from reloading the page
  hideMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Simple form validation before calling the server
  if (!email || !password) {
    showMessage("Please enter your email and password");
    return;
  }

  try {
    const data = await apiRequest("/auth/login", "POST", { email, password });

    // Remember the token + user, then go to the right dashboard
    saveLogin(data.token, data.user);
    window.location.href = dashboardUrl(data.user.role);
  } catch (error) {
    showMessage(error.message);
  }
});

// Demo buttons just fill the form (they do not log in by themselves)
document.querySelectorAll("[data-email]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("email").value = button.dataset.email;
    document.getElementById("password").value = "password123";
  });
});
