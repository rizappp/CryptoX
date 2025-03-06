document.addEventListener("DOMContentLoaded", async () => {
  const id = localStorage.getItem("id");
  const profileForm = document.getElementById("profileForm");
  const editButton = document.getElementById("editButton");
  const saveButton = document.getElementById("saveButton");
  const deleteButton = document.getElementById("deleteButton");
  const logoutButton = document.getElementById("logoutButton");

  // Функция выхода из аккаунта
  const handleLogout = () => {
    localStorage.removeItem("id");
    window.location.href = "/login.html";
  };

  // Проверка авторизации только для profile.html
  if (profileForm && !id) {
    window.location.href = "/login.html";
    return;
  }

  // Логика для страницы профиля
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
        alert("Ошибка при сохранении данных");
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
          handleLogout();
        } catch (error) {
          console.error("Ошибка удаления аккаунта:", error);
          alert("Ошибка при удалении аккаунта");
        }
      }
    });

    logoutButton.addEventListener("click", handleLogout);
  }

  // Выход через dropdown на всех страницах
  const logoutDropdown = document.getElementById("logoutDropdown");
  if (logoutDropdown) {
    logoutDropdown.addEventListener("click", handleLogout);
  } else {
    console.warn("Элемент logoutDropdown не найден на странице");
  }
});