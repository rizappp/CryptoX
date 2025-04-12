const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (client) => {
  // Middleware to verify user
  const authMiddleware = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user ID provided' });
    }
    try {
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Unauthorized: User not found' });
      }
      req.user = userResult.rows[0];
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  };

  // Register route
  router.post('/register', async (req, res) => {
    const { username, password, name, surname, email } = req.body;
    if (password.length < 4) {
      return res.status(400).json({ message: 'Новый пароль должен содержать минимум 4 символа' });
    }
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
      const userExists = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User with this username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await client.query(
        'INSERT INTO users (username, password_hash, name, surname, email, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
        [username, hashedPassword, name || '', surname || '', email]
      );

      res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Login route
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = userResult.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      res.json({ message: 'Login successful', userId: user.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Save pair route
  router.post('/save-pair', authMiddleware, async (req, res) => {
    const { pair } = req.body;
    const userId = req.headers['x-user-id'];

    if (!pair) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    try {
      const existingPair = await client.query(
        'SELECT * FROM saved_pairs WHERE user_id = $1 AND pair = $2',
        [userId, pair]
      );
      if (existingPair.rows.length > 0) {
        return res.status(400).json({ message: 'Pair already saved' });
      }

      await client.query(
        'INSERT INTO saved_pairs (user_id, pair) VALUES ($1, $2)',
        [userId, pair]
      );
      res.status(201).json({ message: 'Pair saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Saved pairs route (Changed to GET to match the frontend fetch)
  let cachedCoinData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1 * 60 * 1000; // 5 минут в миллисекундах

router.get('/saved-pairs', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await client.query(
      'SELECT pair FROM saved_pairs WHERE user_id = $1',
      [userId]
    );

    const savedPairs = result.rows.map(row => row.pair);

    if (savedPairs.length === 0) {
      return res.json([]);
    }

    const baseCurrencies = savedPairs.map(pair => {
      const [base] = pair.split('/');
      return base.toLowerCase();
    });

    const now = Date.now();
    if (!cachedCoinData || (now - lastFetchTime) > CACHE_DURATION) {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data from CoinGecko');
      }

      cachedCoinData = await response.json();
      lastFetchTime = now;
    }

    const enrichedPairs = savedPairs.map(pair => {
      const [base] = pair.split('/');
      const coin = cachedCoinData.find(c => c.symbol.toLowerCase() === base.toLowerCase());
      return {
        pair,
        coinData: coin || null
      };
    });

    res.json(enrichedPairs);
  } catch (error) {
    console.error('Error fetching saved pairs:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

  // Remove pair route
  router.delete('/remove-pair', authMiddleware, async (req, res) => {
    const { pair } = req.body;
    const userId = req.headers['x-user-id'];

    if (!pair) {
      return res.status(400).json({ message: 'Pair is required' });
    }

    try {
      const result = await client.query(
        'DELETE FROM saved_pairs WHERE user_id = $1 AND pair = $2',
        [userId, pair]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Pair not found' });
      }
      res.json({ message: 'Pair removed successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};