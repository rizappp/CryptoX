const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../config/db'); // Подключаем базу данных
const router = express.Router();

// Роут для регистрации пользователя
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  // Проверяем, есть ли уже пользователь с таким именем или email
  try {
    const result = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким логином или почтой уже существует' });
    }

    // Хешируем пароль перед сохранением
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Сохраняем нового пользователя в базу данных
    await client.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3)',
      [username, hashedPassword, email]
    );

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
  }
});

module.exports = router;
