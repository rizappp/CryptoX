document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!localStorage.getItem("id")) {
    window.location.href = "login.html"; // Redirect to login if no id
  }

  // Logout functionality
  const logoutButton = document.getElementById("logoutDropdown"); // Updated to match index.html

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("id"); // Clear id
      window.location.href = "login.html"; // Redirect to login page
    });
  } else {
    console.warn("Logout button not found. Ensure the element with id='logoutDropdown' exists.");
  }
});