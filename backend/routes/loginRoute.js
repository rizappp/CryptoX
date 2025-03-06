const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../config/db');
const nodemailer = require('nodemailer');
const router = express.Router();

// Настройка Nodemailer (замените на свои данные SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail', // Или другой сервис (Mailgun, SendGrid и т.д.)
  auth: {
    user: 'galimzanovrizat69@gmail.com', // Ваш email
    pass: 'olpc dbgc igsl yedc' // Пароль приложения (для Gmail нужен App Password, а не обычный пароль)
  }
});

// Временное хранилище кодов (в реальном проекте используйте Redis или БД)
const resetCodes = new Map();

// Роут для отправки кода на email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Пользователь с такой почтой не найден' });
    }

    const userId = result.rows[0].id;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код
    resetCodes.set(userId, code); // Сохраняем код

    const mailOptions = {
      from: 'galimzanovrizat69@gmail.com',
      to: email,
      subject: 'Восстановление пароля CryptoX',
      text: `Ваш код для сброса пароля: ${code}. Введите его на сайте, чтобы изменить пароль.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Код отправлен на вашу почту' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Роут для сброса пароля
router.post('/reset-password', async (req, res) => {
  const { code, password } = req.body;

  try {
    let userId;
    for (const [id, storedCode] of resetCodes) {
      if (storedCode === code) {
        userId = id;
        break;
      }
    }

    if (!userId) {
      return res.status(400).json({ message: 'Неверный или истекший код' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    resetCodes.delete(userId); // Удаляем код после использования

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Существующий роут для логина
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
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Неверный пароль' });
    }

    res.json({ message: 'Вход выполнен', id: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;