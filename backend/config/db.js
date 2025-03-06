const { Client } = require('pg')
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect()
    .then(() => console.log('Connected to database'))
    .catch(err => console.error('Connection error', err.stack));

module.exports = client;
