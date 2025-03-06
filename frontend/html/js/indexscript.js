document.addEventListener("DOMContentLoaded", () => {
    // Check if user is authenticated
    if (!localStorage.getItem("id")) { // Check for id
      window.location.href = "login.html"; // Redirect to login if no id
    }
  
    // Logout functionality (if you have a logout button elsewhere)
    const logoutButton = document.getElementById("logoutButton"); // Add this if you have a logout button
  
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        localStorage.removeItem("id"); // Clear id
        window.location.href = "login.html"; // Redirect to login page
      });
    }
  });