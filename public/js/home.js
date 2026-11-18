// Home page: show the navbar, and if the user is already logged in, change the buttons.
renderNavbar();

const loggedInUser = getUser();
if (loggedInUser) {
  document.getElementById("hero-buttons").innerHTML =
    `<a class="btn btn-bee btn-big" href="${dashboardUrl(loggedInUser.role)}">Go to my dashboard</a>`;
}
