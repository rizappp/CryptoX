const express = require('express');
const router = express.Router();

module.exports = (client) => {
  router.get('/user/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Неверный формат идентификатора пользователя: ожидается число' });
      }

      const result = await client.query(
        'SELECT id, username, name, surname, created_at, email FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Ошибка в /user/:id:', error);
      res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
    }
  });

  router.put('/user/:id', async (req, res) => {
    const { id } = req.params;
    const { username, name, surname, email } = req.body;

    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Неверный формат идентификатора пользователя: ожидается число' });
      }

      if (!username || !name || !surname || !email) {
        return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
      }

      const result = await client.query(
        'UPDATE users SET username = $1, name = $2, surname = $3, email = $4 WHERE id = $5 RETURNING id, username, name, surname, created_at, email',
        [username, name, surname, email, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      res.json({ message: 'Данные пользователя обновлены', user: result.rows[0] });
    } catch (error) {
      console.error('Ошибка в /user/:id (PUT):', error);
      res.status(500).json({ message: 'Ошибка при обновлении данных пользователя' });
    }
  });

  router.delete('/delete-account', async (req, res) => {
    const id = req.headers['x-user-id'];

    try {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Неверный формат идентификатора пользователя: ожидается число в заголовке x-user-id' });
      }

      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      res.json({ message: 'Аккаунт успешно удален' });
    } catch (error) {
      console.error('Ошибка в /delete-account:', error);
      res.status(500).json({ message: 'Ошибка сервера при удалении аккаунта' });
    }
  });

  return router;
};