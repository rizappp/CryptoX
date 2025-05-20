const express = require('express');
const router = express.Router();
const WebSocket = require('ws');

module.exports = (client, wss) => {
  router.post('/save-pair', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { pair } = req.body;

    console.log('Полученные данные:', { userId, pair, body: req.body, headers: req.headers });

    if (!userId || !pair) {
        return res.status(401).json({ message: 'Не авторизован: отсутствует x-user-id в заголовках' });
    }

    try {
        const normalizedPair = pair.replace('-', '/').toUpperCase();
        console.log('Сохранение пары:', { userId, pair: normalizedPair });

        const existingPair = await client.query(
            'SELECT * FROM saved_pairs WHERE user_id = $1 AND pair = $2',
            [userId, normalizedPair]
        );

        if (existingPair.rows.length > 0) {
            console.log('Пара уже существует');
            return res.status(200).json({ message: 'Пара уже сохранена' });
        } else {
            await client.query(
                'INSERT INTO saved_pairs (user_id, pair) VALUES ($1, $2)',
                [userId, normalizedPair]
            );
            console.log('Пара успешно добавлена');
            return res.status(201).json({ message: 'Пара успешно сохранена' });
        }
    } catch (error) {
        console.error('Ошибка при сохранении пары:', error.stack);
        return res.status(500).json({ message: 'Ошибка при сохранении пары', error: error.message });
    }
});

router.delete('/remove-pair', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { pair } = req.body;

    console.log('Полученные данные для удаления:', { userId, pair });

    if (!userId || !pair) {
        return res.status(400).json({ message: 'Отсутствуют userId или pair' });
    }

    try {
        const normalizedPair = pair.replace('-', '/').toUpperCase();
        console.log('Удаление пары:', { userId, pair: normalizedPair });

        const result = await client.query(
            'DELETE FROM saved_pairs WHERE user_id = $1 AND pair = $2',
            [userId, normalizedPair]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Пара не найдена' });
        }

        console.log('Пара успешно удалена');
        return res.status(200).json({ message: 'Пара успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении пары:', error.stack);
        return res.status(500).json({ message: 'Ошибка при удалении пары', error: error.message });
    }
});

  router.get('/saved-pairs', async (req, res) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    try {
      console.log('Fetching saved pairs for user:', userId);
      const result = await client.query('SELECT pair FROM saved_pairs WHERE user_id = $1', [userId]);
      const pairs = result.rows.map(row => ({
        pair: row.pair
      }));
      res.status(200).json(pairs);
    } catch (error) {
      console.error('Error fetching saved pairs:', error);
      res.status(500).json({ message: 'Error fetching saved pairs' });
    }
  });

  router.get('/chart-data', async (req, res) => {
    const { pair, timeframe } = req.query;
    const userId = req.headers['x-user-id'];

    if (!userId || !pair || !timeframe) {
      return res.status(400).json({ message: 'Missing userId, pair, or timeframe' });
    }

    const normalizedPair = pair.replace('-', '/').toUpperCase();
    console.log('Chart data request:', { userId, pair: normalizedPair, timeframe });

    const validTimeframes = ['1m', '5m', '15m', '1h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      console.log('Invalid timeframe:', timeframe);
      return res.status(400).json({ message: 'Invalid timeframe. Use: 1m, 5m, 15m, 1h, 1d' });
    }

    try {
      const binanceSymbolMap = {
        'BTC/USD': 'BTCUSDT',
        'ETH/USD': 'ETHUSDT',
        'WBTC/USD': 'WBTCUSDT',
        'WSTETH/USD': 'WSTETHUSDT',
        'AVAX/USD': 'AVAXUSDT'
      };
      const symbol = binanceSymbolMap[normalizedPair];
      if (!symbol) {
        console.log('Unsupported pair:', normalizedPair);
        return res.status(400).json({ message: `Unsupported pair: ${normalizedPair}` });
      }

      const timeframeMap = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '1d': '1d'
      };
      const interval = timeframeMap[timeframe];
      const limit = 1000;
      const endTime = Date.now();
      const startTime = endTime - (limit * getTimeframeMillis(timeframe));

      console.log('Fetching klines from Binance:', { symbol, interval, startTime, endTime, limit });
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`
      );

      if (!response.ok) {
        console.error('Binance API error:', response.status, response.statusText);
        throw new Error('Failed to fetch data from Binance');
      }

      const data = await response.json();
      console.log('Received klines:', data.length);

      const chartData = data.map(kline => ({
        time: Math.floor(kline[0] / 1000),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));

      res.status(200).json(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      res.status(500).json({ message: 'Error fetching chart data' });
    }
  });

  router.get('/chart-data-stream', async (req, res) => {
    const { pair, timeframe } = req.query;
    const userId = req.headers['x-user-id'];

    if (!userId || !pair || !timeframe) {
      console.error('Stream request missing parameters:', { userId, pair, timeframe });
      return res.status(400).json({ message: 'Missing userId, pair, or timeframe' });
    }

    const normalizedPair = pair.replace('-', '/').toUpperCase();
    console.log('Chart data stream request:', { userId, pair: normalizedPair, timeframe });

    const validTimeframes = ['1m', '5m', '15m', '1h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      console.error('Invalid timeframe:', timeframe);
      return res.status(400).json({ message: 'Invalid timeframe. Use: 1m, 5m, 15m, 1h, 1d' });
    }

    try {
      const binanceSymbolMap = {
        'BTC/USD': 'BTCUSDT',
        'ETH/USD': 'ETHUSDT',
        'WBTC/USD': 'WBTCUSDT',
        'WSTETH/USD': 'WSTETHUSDT',
        'AVAX/USD': 'AVAXUSDT'
      };
      const symbol = binanceSymbolMap[normalizedPair];
      if (!symbol) {
        console.error('Unsupported pair:', normalizedPair);
        return res.status(400).json({ message: `Unsupported pair: ${normalizedPair}` });
      }

      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        console.error('Unauthorized: User not found for userId:', userId);
        return res.status(401).json({ message: 'Unauthorized: User not found' });
      }

      console.log('Stream initiated for:', { userId, pair: normalizedPair, timeframe });
      res.status(200).json({ message: 'Stream initiated', pair: normalizedPair, timeframe, userId });
    } catch (error) {
      console.error('Error initiating stream:', error);
      res.status(500).json({ message: 'Error initiating stream' });
    }
  });

  const subscriptions = new Map();

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        console.log('Received WebSocket message:', message.toString());
        const data = JSON.parse(message);
        const { userId, pair, timeframe } = data;
        console.log('Subscription request:', { userId, pair, timeframe });

        if (!userId || !pair || !timeframe) {
          console.error('Invalid subscription: Missing userId, pair, or timeframe');
          ws.send(JSON.stringify({ error: 'Missing userId, pair, or timeframe' }));
          return;
        }

        const normalizedPair = pair.replace('-', '/').toUpperCase();
        client.query('SELECT * FROM users WHERE id = $1', [userId])
          .then(userResult => {
            if (userResult.rows.length === 0) {
              console.error('Unauthorized: User not found for userId:', userId);
              ws.send(JSON.stringify({ error: 'Unauthorized: User not found' }));
              ws.close();
              return;
            }

            const binanceSymbolMap = {
              'BTC/USD': 'BTCUSDT',
              'ETH/USD': 'ETHUSDT',
              'WBTC/USD': 'WBTCUSDT',
              'WSTETH/USD': 'WSTETHUSDT',
              'AVAX/USD': 'AVAXUSDT'
            };
            const symbol = binanceSymbolMap[normalizedPair];
            if (!symbol) {
              console.error('Unsupported pair:', normalizedPair);
              ws.send(JSON.stringify({ error: `Unsupported pair: ${normalizedPair}` }));
              return;
            }

            const validTimeframes = ['1m', '5m', '15m', '1h', '1d'];
            if (!validTimeframes.includes(timeframe)) {
              console.error('Invalid timeframe:', timeframe);
              ws.send(JSON.stringify({ error: `Invalid timeframe: ${timeframe}` }));
              return;
            }

            const streamKey = `${userId}_${normalizedPair}_${timeframe}`;
            if (subscriptions.has(streamKey)) {
              console.log(`Closing existing subscription for ${streamKey}`);
              subscriptions.get(streamKey).close();
            }

            function connectBinance() {
              console.log(`Connecting to Binance WebSocket for ${streamKey}`);
              const binanceWs = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
              subscriptions.set(streamKey, binanceWs);

              binanceWs.on('open', () => {
                console.log(`Binance WebSocket opened for ${streamKey}`);
              });

              binanceWs.on('message', (data) => {
                const msg = JSON.parse(data);
                console.log(`Binance WebSocket message for ${streamKey}:`, msg);
                if (msg.e === 'kline') {
                  const kline = msg.k;
                  const candle = {
                    time: Math.floor(kline.t / 1000),
                    open: parseFloat(kline.o),
                    high: parseFloat(kline.h),
                    low: parseFloat(kline.l),
                    close: parseFloat(kline.c),
                    volume: parseFloat(kline.v),
                    isClosed: kline.x
                  };
                  console.log(`Sending kline to client for ${streamKey}:`, candle);
                  ws.send(JSON.stringify({ type: 'kline', candle }));
                }
              });

              binanceWs.on('error', (error) => {
                console.error(`Binance WebSocket error for ${streamKey}:`, error.message);
              });

              binanceWs.on('close', () => {
                console.log(`Binance WebSocket closed for ${streamKey}, reconnecting in 5s...`);
                subscriptions.delete(streamKey);
                setTimeout(connectBinance, 5000);
              });
            }

            connectBinance();

            ws.on('close', () => {
              console.log(`Client WebSocket closed for ${streamKey}`);
              if (subscriptions.has(streamKey)) {
                subscriptions.get(streamKey).close();
                subscriptions.delete(streamKey);
              }
            });
          })
          .catch(error => {
            console.error('Error validating user for WebSocket:', error);
            ws.send(JSON.stringify({ error: 'Server error' }));
            ws.close();
          });
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
    });
  });

  function getTimeframeMillis(timeframe) {
    const timeframeMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    return timeframeMap[timeframe] || 60 * 60 * 1000;
  }

  return router;
};