const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const registerRoute = require('./routes/registerRoute');
const loginRoute = require('./routes/loginRoute');
const userRoute = require('./routes/userRoutes');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/html'))); // Исправленный путь: из backend/ в frontend/html/

// Mount registration and login routes first (no authentication needed for these)
app.use('/api', registerRoute);
app.use('/api', loginRoute);

// Protect market and user routes with authentication
app.use('/api/market', authMiddleware, async (req, res) => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1');
    if (!response.ok) {
      throw new Error('Failed to fetch cryptocurrency data from CoinGecko');
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ message: 'Ошибка при получении данных о криптовалютах' });
  }
});

app.use('/api', authMiddleware, userRoute);

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});