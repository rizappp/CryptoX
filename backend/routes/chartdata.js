// routes/chartdata.js
const express = require('express');
const router = express.Router();

router.get('/chartdata', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { pair, timeframe } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Не авторизован: отсутствует x-user-id в заголовках' });
  }

  if (!pair || !timeframe) {
    return res.status(400).json({ message: 'Пара или таймфрейм не указаны' });
  }

  // Подставь сюда свою реальную логику
  const chartData = [/* массив свечей */];

  res.json(chartData);
});

module.exports = router;
