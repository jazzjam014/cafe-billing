const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// Initialize additional tables required for orders and items
async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
          order_id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_amount DECIMAL(10, 2) NOT NULL,
          payment_status VARCHAR(20) DEFAULT 'Paid'
      );

      CREATE TABLE IF NOT EXISTS order_items (
          order_item_id SERIAL PRIMARY KEY,
          order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
          item_id INT REFERENCES menu_items(item_id),
          quantity INT NOT NULL,
          subtotal DECIMAL(10, 2) NOT NULL
      );
    `);
    console.log('✅ Orders and Order Items tables verified/created successfully.');
  } catch (err) {
    console.error('❌ Error setting up database tables:', err);
  }
}

// ---------------- API ENDPOINTS ----------------

// GET: Fetch all menu items from menu_items table
app.get('/api/menu', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items ORDER BY item_id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Create a new bill / order
app.post('/api/orders', async (req, res) => {
  const { items, total_amount } = req.body; // items = [{ item_id, quantity, subtotal }, ...]
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert into orders table
    const orderRes = await client.query(
      'INSERT INTO orders (total_amount) VALUES ($1) RETURNING order_id, created_at',
      [total_amount]
    );
    const orderId = orderRes.rows[0].order_id;
    const createdAt = orderRes.rows[0].created_at;

    // 2. Insert line items into order_items table
    for (let item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, item_id, quantity, subtotal) VALUES ($1, $2, $3, $4)',
        [orderId, item.item_id, item.quantity, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Order created successfully!',
      order_id: orderId,
      created_at: createdAt,
      total_amount: total_amount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET: Fetch sales history
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY order_id DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 SDF Cafe Billing server running on http://localhost:${PORT}`);
  await initTables();
});
