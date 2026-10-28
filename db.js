const { Pool } = require('pg');

// Configure connection to local PostgreSQL server (SDF)
const pool = new Pool({
  user: 'postgres',          // Default PostgreSQL username
  host: 'localhost',         // Server host
  database: 'cafe.billing',  // Your database name
  password: 'YOUR_PASSWORD', // Replace with your PostgreSQL password
  port: 5432,
});

module.exports = pool;
