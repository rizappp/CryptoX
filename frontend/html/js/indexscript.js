document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("id")) {
    window.location.href = "login.html"; 
  }

  const logoutButton = document.getElementById("logoutDropdown");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("id"); 
      window.location.href = "login.html";
    });
  } else {
    console.warn("Logout button not found. Ensure the element with id='logoutDropdown' exists.");
  }
});