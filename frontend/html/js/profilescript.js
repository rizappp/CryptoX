document.addEventListener("DOMContentLoaded", () => {
    // Check if user is authenticated
    if (!localStorage.getItem("id")) { // Check for id in localStorage
      window.location.href = "login.html"; // Redirect to login if no id
    }
  
    const profileForm = document.getElementById("profileForm");
    const editButton = document.getElementById("editButton");
    const saveButton = document.getElementById("saveButton");
    const logoutButton = document.getElementById("logoutButton");
  
    let isEditing = false;
  
    // Fetch user data from the backend
    async function fetchUserData() {
      try {
        const id = localStorage.getItem("id");
        console.log("Fetching user data for id:", id); // Debug log
        const response = await fetch(`http://localhost:5000/api/user/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": id // Send id in custom header for authMiddleware
          }
        });
  
        if (!response.ok) {
          console.error("HTTP Error:", response.status, response.statusText);
          throw new Error(`Ошибка при получении данных пользователя: ${response.status} - ${response.statusText}`);
        }
  
        const userData = await response.json();
        populateForm(userData);
      } catch (error) {
        console.error("Ошибка:", error);
        alert("Не удалось загрузить данные профиля. Попробуйте позже.");
        if (error.message.includes("401") || error.message.includes("403")) {
          localStorage.removeItem("id"); // Clear invalid id
          window.location.href = "login.html"; // Redirect to login
        }
      }
    }
  
    // Populate form with user data
    function populateForm(userData) {
      document.getElementById("username").value = userData.username || "";
      document.getElementById("name").value = userData.name || "";
      document.getElementById("surname").value = userData.surname || "";
      document.getElementById("createdAt").value = userData.created_at ? new Date(userData.created_at).toLocaleDateString('ru-RU') : ""; // Format date
      document.getElementById("email").value = userData.email || "";
    }
  
    // Toggle edit mode
    editButton.addEventListener("click", () => {
      if (!isEditing) {
        isEditing = true;
        editButton.style.display = "none";
        saveButton.style.display = "inline-block";
        document.querySelectorAll("input:not([readonly])").forEach(input => input.removeAttribute("readonly"));
      }
    });
  
    // Save updated user data
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!isEditing) return;
  
      const id = localStorage.getItem("id");
      const updatedData = {
        username: document.getElementById("username").value.trim(),
        name: document.getElementById("name").value.trim(),
        surname: document.getElementById("surname").value.trim(),
        email: document.getElementById("email").value.trim()
      };
  
      // Basic validation
      if (!updatedData.username || !updatedData.name || !updatedData.surname || !updatedData.email) {
        alert("Все поля обязательны для заполнения!");
        return;
      }
  
      try {
        const response = await fetch(`http://localhost:5000/api/user/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": id // Send id in custom header for authMiddleware
          },
          body: JSON.stringify(updatedData)
        });
  
        if (!response.ok) {
          console.error("HTTP Error:", response.status, response.statusText);
          throw new Error(`Ошибка при обновлении данных: ${response.status} - ${response.statusText}`);
        }
  
        const data = await response.json();
        alert("Данные успешно обновлены!");
        isEditing = false;
        saveButton.style.display = "none";
        editButton.style.display = "inline-block";
        document.querySelectorAll("input:not([readonly])").forEach(input => input.setAttribute("readonly", true));
        // Refresh data after update
        fetchUserData();
      } catch (error) {
        console.error("Ошибка:", error);
        alert("Не удалось обновить данные. Попробуйте позже.");
      }
    });
  
    // Logout functionality
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("id"); // Clear id
      window.location.href = "login.html"; // Redirect to login page
    });
  
    // Initial fetch of user data
    fetchUserData();
  });