const client = require('../config/db'); // Подключаем базу данных

module.exports = async (req, res, next) => {
  // Get id from headers or query parameters
  const id = req.headers['x-user-id'] || req.query.id;

  if (!id) {
    return res.status(401).json({ message: 'Не авторизован' });
  }

  try {
    // Validate id against the database
    const result = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный идентификатор пользователя' });
    }

    // If valid, attach id to request for use in routes
    req.user = { id: id };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Ошибка при проверке авторизации' });
  }
};