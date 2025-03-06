const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../config/db');
const nodemailer = require('nodemailer');
const router = express.Router();

// Настройка Nodemailer (используем ту же конфигурацию, что для forgot-password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'galimzanovrizat69@gmail.com', // Замените на ваш email
    pass: 'olpc dbgc igsl yedc' // Замените на ваш App Password
  }
});

// Временное хранилище для данных регистрации и кодов
const pendingRegistrations = new Map(); // email -> { username, password, code }

// Роут для начала регистрации
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Проверка существования пользователя
    const result = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Пользователь с таким логином или почтой уже существует' });
    }

    // Генерация кода
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Сохраняем данные временно
    pendingRegistrations.set(email, { username, password: hashedPassword, code });

    // Отправка email
    const mailOptions = {
      from: 'galimzanovrizat69@gmail.com',
      to: email,
      subject: 'Подтверждение регистрации CryptoX',
      text: `Ваш код для подтверждения регистрации: ${code}. Введите его на сайте, чтобы завершить регистрацию.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Код отправлен на вашу почту' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Роут для подтверждения email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  try {
    const pending = pendingRegistrations.get(email);
    if (!pending || pending.code !== code) {
      return res.status(400).json({ message: 'Неверный или истекший код' });
    }

    // Завершаем регистрацию
    await client.query(
      'INSERT INTO users (username, password, email) VALUES ($1, $2, $3)',
      [pending.username, pending.password, email]
    );

    pendingRegistrations.delete(email); // Удаляем временные данные
    res.json({ message: 'Регистрация успешно завершена' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;