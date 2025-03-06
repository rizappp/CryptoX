const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../config/db'); // Подключаем базу данных
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await client.query(
      'SELECT id, username, password, email, created_at, name, surname FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    console.log("User found:", user); // Debug log

    // Проверяем пароль
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    res.json({ message: 'Вход выполнен', id: user.id }); // Return id
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;