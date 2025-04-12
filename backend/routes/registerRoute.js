const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();

// Настройка Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'galimzanovrizat69@gmail.com', // Замените на ваш email
    pass: 'olpc dbgc igsl yedc' // Замените на ваш App Password
  }
});

// Временное хранилище для данных регистрации и кодов
const pendingRegistrations = new Map(); // email -> { username, password, code }

module.exports = (client) => {
  // Роут для начала регистрации
  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
      if (username.length < 4) {
        return res.status(400).json({ message: 'Имя пользователя должно содержать минимум 4 символа' });
      }

      if (password.length < 4)        {
        return res.status(400).json({ message: 'Пароль должен содержать минимум 4 символа' });
      }

      // Проверка существования пользователя
      const result = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
      if (result.rows.length > 0) {
        return res.status(400).json({ message: 'Пользователь с таким логином или почтой уже существует' });
      }

      // Генерация кода
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код
      const hashedPassword = await bcrypt.hash(password, 8); // Use async/await for consistency

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
      console.error('Ошибка в /register:', error);
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
      const result = await client.query(
        'INSERT INTO users (username, password, email, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [pending.username, pending.password, email]
      );

      pendingRegistrations.delete(email); // Удаляем временные данные
      res.json({ message: 'Регистрация успешно завершена', userId: result.rows[0].id });
    } catch (error) {
      console.error('Ошибка в /verify-email:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  return router;
};