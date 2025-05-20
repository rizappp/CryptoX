document.addEventListener("DOMContentLoaded", async () => {
  const id = localStorage.getItem("id");
  const profileForm = document.getElementById("profileForm");
  const editButton = document.getElementById("editButton");
  const saveButton = document.getElementById("saveButton");
  const deleteButton = document.getElementById("deleteButton");
  const logoutButton = document.getElementById("logoutDropdown"); 

  const handleLogout = () => {
    localStorage.removeItem("id");
    window.location.href = "/login.html";
  };

  if (profileForm && !id) {
    window.location.href = "/login.html";
    return;
  }

  if (profileForm && id) {
    try {
      const response = await fetch(`http://localhost:5000/api/user/${id}`, {
        headers: { "x-user-id": id }
      });
      if (!response.ok) throw new Error("Не удалось загрузить данные пользователя");
      const user = await response.json();

      document.getElementById("username").value = user.username;
      document.getElementById("name").value = user.name;
      document.getElementById("surname").value = user.surname;
      document.getElementById("createdAt").value = new Date(user.created_at).toLocaleDateString();
      document.getElementById("email").value = user.email;
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      alert("Ошибка загрузки профиля");
    }

    editButton.addEventListener("click", () => {
      const inputs = profileForm.querySelectorAll("input:not(#createdAt)");
      inputs.forEach(input => input.removeAttribute("readonly"));
      editButton.style.display = "none";
      saveButton.style.display = "inline-block";
    });

    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const updatedData = {
        username: document.getElementById("username").value,
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        email: document.getElementById("email").value
      };

      try {
        const response = await fetch(`http://localhost:5000/api/user/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-user-id": id },
          body: JSON.stringify(updatedData)
        });

        if (!response.ok) throw new Error("Не удалось сохранить изменения");
        alert("Данные успешно обновлены!");
        const inputs = profileForm.querySelectorAll("input:not(#createdAt)");
        inputs.forEach(input => input.setAttribute("readonly", "true"));
        editButton.style.display = "inline-block";
        saveButton.style.display = "none";
      } catch (error) {
        console.error("Ошибка сохранения:", error);
        alert("Заполните все поля");
      }
    });

    deleteButton.addEventListener("click", async () => {
      if (confirm("Вы уверены, что хотите удалить аккаунт? Все ваши данные будут потеряны навсегда.")) {
        try {
          const response = await fetch(`http://localhost:5000/api/delete-account`, {
            method: "DELETE",
            headers: { "x-user-id": id }
          });

          if (!response.ok) throw new Error("Не удалось удалить аккаунт");
          alert("Аккаунт успешно удален!");
          window.location.href = "/login.html";
        } catch (error) {
          console.error("Ошибка удаления аккаунта:", error);
          alert("Ошибка при удалении аккаунта");
        }
      }
    });

    if (logoutButton) {
      logoutButton.addEventListener("click", handleLogout);
    } else {
      console.warn("Logout button not found. Ensure the element with id='logoutDropdown' exists.");
    }
  }
});