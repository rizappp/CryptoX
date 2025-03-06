const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const client = new Client();
const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    try {
      const userExists = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hashedPassword]);
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    try {
      const userResult = await client.query('SELECT * FROM users WHERE username = $1', [username]);
  
      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const user = userResult.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
  
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
  
      res.json({ message: 'Login successful', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });

  module.exports = router;
