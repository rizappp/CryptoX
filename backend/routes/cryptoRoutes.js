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
      console.error('Auth middleware error:', error);
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
      console.error('Register error:', error);
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
      console.error('Login error:', error);
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
      console.error('Save pair error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Saved pairs route
  let cachedCoinData = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 1 * 60 * 1000; // 1 minute in milliseconds

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

  // Chart data route
  router.get('/chart-data', authMiddleware, async (req, res) => {
    const { pair, timeframe } = req.query;
    const userId = req.user.id;

    console.log('Chart data request:', { pair, timeframe, userId });

    if (!pair || !timeframe) {
      console.log('Missing pair or timeframe:', { pair, timeframe });
      return res.status(400).json({ message: 'Pair and timeframe are required' });
    }

    const validTimeframes = ['1m', '5m', '15m', '1h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      console.log('Invalid timeframe:', timeframe);
      return res.status(400).json({ message: 'Invalid timeframe. Use: 1m, 5m, 15m, 1h, 1d' });
    }

    try {
      // Map pair to Binance symbol
      const [base, quote] = pair.split('/');
      console.log('Extracted base and quote:', base, quote);
      const binanceSymbolMap = {
        'BTC/USD': 'BTCUSDT',
        'ETH/USD': 'ETHUSDT',
        'WBTC/USD': 'WBTCUSDT',
        'WSTETH/USD': 'WSTETHUSDT',
        'AVAX/USD': 'AVAXUSDT',
        'LINK/USD': 'LINKUSDT',
        'TON/USD': 'TONUSDT'
      };
      const symbol = binanceSymbolMap[pair];
      if (!symbol) {
        console.log('Unsupported pair for Binance:', pair);
        return res.status(400).json({ message: `Unsupported pair: ${pair}` });
      }

      // Map timeframe to Binance interval
      const timeframeMap = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '1d': '1d'
      };
      const interval = timeframeMap[timeframe];

      // Map timeframe to duration in minutes
      const intervalDurationMap = {
        '1m': 1,
        '5m': 5,
        '15m': 15,
        '1h': 60,
        '1d': 1440
      };
      const intervalDuration = intervalDurationMap[timeframe];

      // Calculate limit based on timeframe (more candles for 1m than 5m)
      const limitMap = {
        '1m': 4320,  // 3 days (4320 minutes)
        '5m': 2880,  // 10 days (2880 * 5 minutes = 14400 minutes)
        '15m': 960,  // 10 days (960 * 15 minutes = 14400 minutes)
        '1h': 720,   // 30 days (720 hours)
        '1d': 180    // 180 days
      };
      const desiredLimit = limitMap[timeframe];

      // Binance API limit per request is 1000 candles
      const maxLimitPerRequest = 1000;
      let allData = [];
      let remainingCandles = desiredLimit;
      let endTime = Date.now();

      while (remainingCandles > 0) {
        const candlesToFetch = Math.min(remainingCandles, maxLimitPerRequest);
        const startTime = endTime - (candlesToFetch * intervalDuration * 60 * 1000);

        console.log('Fetching Binance data:', { symbol, interval, startTime, endTime, candlesToFetch });
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${Math.floor(startTime)}&endTime=${Math.floor(endTime)}&limit=${candlesToFetch}`;
        console.log('Binance URL:', url);
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('Binance fetch failed:', { status: response.status, errorText });
          throw new Error(`Failed to fetch chart data from Binance: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log(`Fetched ${data.length} candles, remaining: ${remainingCandles}`);

        // Validate data
        if (!Array.isArray(data) || data.length === 0) {
          console.log('No more data available');
          break;
        }

        allData = [...data, ...allData]; // Prepend data to maintain chronological order
        remainingCandles -= data.length;
        endTime = data[0][0] - 1; // Set endTime to the timestamp of the earliest candle minus 1ms
      }

      console.log(`Total candles fetched: ${allData.length}`);
      console.log('Raw Binance response (first 5):', allData.slice(0, 5));
      console.log('Raw Binance response (last 5):', allData.slice(-5));

      // Validate data
      if (allData.length === 0) {
        throw new Error('No data received from Binance');
      }

      // Format data for Lightweight Charts with validation
      const chartData = allData.map(item => {
        const [timestamp, open, high, low, close, volume] = item;
        if (high === low) {
          console.warn('High and low are equal for timestamp:', timestamp);
        }
        return {
          time: Math.floor(parseInt(timestamp) / 1000),
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseFloat(volume)
        };
      });

      console.log('Formatted chart data (first 5):', chartData.slice(0, 5));
      console.log('Formatted chart data (last 5):', chartData.slice(-5));
      res.json(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error.message, error.stack);
      res.status(500).json({ message: `Ошибка сервера: ${error.message}` });
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
      console.error('Remove pair error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};