document.addEventListener("DOMContentLoaded", async () => {
  const id = localStorage.getItem("id");
  const profileForm = document.getElementById("profileForm");
  const editButton = document.getElementById("editButton");
  const saveButton = document.getElementById("saveButton");
  const inputs = profileForm.querySelectorAll("input:not(#createdAt)"); // Все поля, кроме даты

  if (!id) {
    window.location.href = "/login.html";
    return;
  }

  // Загрузка данных пользователя
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

  // Нажатие кнопки "Изменить данные"
  editButton.addEventListener("click", () => {
    inputs.forEach(input => input.removeAttribute("readonly")); // Разблокируем поля
    editButton.style.display = "none"; // Скрываем "Изменить"
    saveButton.style.display = "inline-block"; // Показываем "Сохранить"
  });

  // Отправка формы при нажатии "Сохранить"
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
        headers: {
          "Content-Type": "application/json",
          "x-user-id": id
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) throw new Error("Не удалось сохранить изменения");
      alert("Данные успешно обновлены!");
      
      // Блокируем поля обратно
      inputs.forEach(input => input.setAttribute("readonly", "true"));
      editButton.style.display = "inline-block";
      saveButton.style.display = "none";
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      alert("Ошибка при сохранении данных");
    }
  });

  // Выход
  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("id");
    window.location.href = "/login.html";
  });
});