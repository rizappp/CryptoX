const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Client } = require('pg');
const registerRoute = require('./routes/registerRoute');
const loginRoute = require('./routes/loginRoute');
const userRoute = require('./routes/userRoutes');
const cryptoRoutes = require('./routes/cryptoRoutes');
const authMiddlewareFactory = require('./middleware/auth'); // Renamed for clarity

// Load environment variables
require('dotenv').config();

const app = express();

// Configure PostgreSQL client using DATABASE_URL from .env
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("Database connection error:", err));

// Create the authMiddleware by passing the client
const authMiddleware = authMiddlewareFactory(client);

// Log to verify
console.log('authMiddleware:', authMiddleware);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/html')));

// Pass the client to routes
app.use('/api', registerRoute(client));
app.use('/api', loginRoute(client));

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

app.use('/api', authMiddleware, cryptoRoutes(client));
app.use('/api', authMiddleware, userRoute(client));

// Catch-all for 404 errors
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 5000}`);
});