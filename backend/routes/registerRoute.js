const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'galimzanovrizat69@gmail.com', 
    pass: 'olpc dbgc igsl yedc' 
  }
});

const pendingRegistrations = new Map(); 

module.exports = (client) => {
  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
      if (username.length < 4) {
        return res.status(400).json({ message: 'Имя пользователя должно содержать минимум 4 символа' });
      }

      if (password.length < 4)        {
        return res.status(400).json({ message: 'Пароль должен содержать минимум 4 символа' });
      }

      const result = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
      if (result.rows.length > 0) {
        return res.status(400).json({ message: 'Пользователь с таким логином или почтой уже существует' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString(); 
      const hashedPassword = await bcrypt.hash(password, 8); 

      pendingRegistrations.set(email, { username, password: hashedPassword, code });

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

  router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;

    try {
      const pending = pendingRegistrations.get(email);
      if (!pending || pending.code !== code) {
        return res.status(400).json({ message: 'Неверный или истекший код' });
      }

      const result = await client.query(
        'INSERT INTO users (username, password, email, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [pending.username, pending.password, email]
      );

      pendingRegistrations.delete(email);
      res.json({ message: 'Регистрация успешно завершена', userId: result.rows[0].id });
    } catch (error) {
      console.error('Ошибка в /verify-email:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  return router;
};