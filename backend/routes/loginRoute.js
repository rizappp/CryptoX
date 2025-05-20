const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'galimzanovrizat69@gmail.com',
    pass: process.env.EMAIL_PASS || 'olpc dbgc igsl yedc'
  }
});

const resetCodes = new Map();

module.exports = (client) => {
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
      const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Пользователь с такой почтой не найден' });
      }

      const userId = result.rows[0].id;
      const code = Math.floor(100000 + Math.random() * 900000).toString(); 
      resetCodes.set(userId, code); 

      setTimeout(() => {
        resetCodes.delete(userId);
      }, 10 * 60 * 1000); 

      const mailOptions = {
        from: process.env.EMAIL_USER || 'galimzanovrizat69@gmail.com',
        to: email,
        subject: 'Восстановление пароля CryptoX',
        text: `Ваш код для сброса пароля: ${code}. Введите его на сайте, чтобы изменить пароль. Код действителен 10 минут.`
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'Код отправлен на вашу почту' });
    } catch (error) {
      console.error('Ошибка в /forgot-password:', error);
      res.status(500).json({ message: 'Не удалось отправить код на вашу почту. Попробуйте снова позже.' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const { code, password } = req.body;

    try {
      if (password.length < 4) {
        return res.status(400).json({ message: 'Новый пароль должен содержать минимум 4 символа' });
      }

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

      const hashedPassword = await bcrypt.hash(password, 8);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
      resetCodes.delete(userId); 

      res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
      console.error('Ошибка в /reset-password:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      if (password.length < 4) {
        return res.status(400).json({ message: 'Пароль должен содержать минимум 4 символа' });
      }

      const result = await client.query(
        'SELECT id, username, password, email, created_at, name, surname FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Пользователь не найден' });
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password); 
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Неверный пароль' });
      }

      res.json({ message: 'Вход выполнен', id: user.id });
    } catch (error) {
      console.error('Ошибка в /login:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  return router;
};