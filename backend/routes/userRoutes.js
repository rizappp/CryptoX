const express = require('express');
const client = require('../config/db');
const router = express.Router();

router.get('/user/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.query(
      'SELECT id, username, name, surname, created_at, email FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
});

router.put('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { username, name, surname, email } = req.body;

  try {
    if (!username || !name || !surname || !email) {
      return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
    }

    const result = await client.query(
      'UPDATE users SET username = $1, name = $2, surname = $3, email = $4 WHERE id = $5 RETURNING id, username, name, surname, created_at, email',
      [username, name, surname, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ message: 'Данные пользователя обновлены' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при обновлении данных пользователя' });
  }
});

router.delete('/delete-account', async (req, res) => {
  const id = req.headers['x-user-id'];

  try {
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ message: 'Аккаунт успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления аккаунта:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении аккаунта' });
  }
});

module.exports = router;