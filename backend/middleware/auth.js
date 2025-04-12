module.exports = (client) => {
  return async (req, res, next) => {
    // Get id from headers (prefer headers over query for security)
    const id = req.headers['x-user-id'];

    if (!id) {
      return res.status(401).json({ message: 'Не авторизован: отсутствует x-user-id в заголовках' });
    }

    // Validate that id is a number (assuming user IDs are integers)
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Неверный формат идентификатора пользователя: ожидается число' });
    }

    try {
      // Validate id against the database
      const result = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Пользователь с таким идентификатором не найден' });
      }

      // Attach the validated user ID to the request
      req.user = { id: userId };
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ message: 'Ошибка сервера при проверке авторизации' });
    }
  };
};