const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// In-memory product store with seed data
const products = [
  { id: 1, name: 'Wireless Headphones', description: 'Noise-cancelling Bluetooth headphones', price: 79.99, category: 'Electronics', image: 'https://via.placeholder.com/200?text=Headphones' },
  { id: 2, name: 'Running Shoes', description: 'Lightweight breathable running shoes', price: 129.99, category: 'Footwear', image: 'https://via.placeholder.com/200?text=Shoes' },
  { id: 3, name: 'Coffee Maker', description: 'Programmable 12-cup coffee maker', price: 49.99, category: 'Kitchen', image: 'https://via.placeholder.com/200?text=Coffee' },
  { id: 4, name: 'Backpack', description: 'Water-resistant laptop backpack', price: 59.99, category: 'Accessories', image: 'https://via.placeholder.com/200?text=Backpack' },
  { id: 5, name: 'Desk Lamp', description: 'LED desk lamp with adjustable brightness', price: 34.99, category: 'Home Office', image: 'https://via.placeholder.com/200?text=Lamp' },
  { id: 6, name: 'Yoga Mat', description: 'Non-slip exercise yoga mat', price: 24.99, category: 'Fitness', image: 'https://via.placeholder.com/200?text=YogaMat' },
  { id: 7, name: 'Mechanical Keyboard', description: 'RGB mechanical gaming keyboard', price: 89.99, category: 'Electronics', image: 'https://via.placeholder.com/200?text=Keyboard' },
  { id: 8, name: 'Water Bottle', description: 'Insulated stainless steel water bottle', price: 19.99, category: 'Accessories', image: 'https://via.placeholder.com/200?text=Bottle' }
];

let nextId = products.length + 1;

// Request logging
app.use((req, res, next) => {
  console.log(`[Product Service] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Validate JWT by calling Auth Service
async function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/validate`, {
      headers: { Authorization: authHeader }
    });
    const data = await response.json();

    if (!data.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('[Product Service] Auth validation failed:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}

// Require admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'product-service', status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /products - list all products (public)
app.get('/products', (req, res) => {
  res.json(products);
});

// GET /products/:id - get single product (public)
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /products - create product (admin only)
app.post('/products', validateToken, requireAdmin, (req, res) => {
  const { name, description, price, category, image } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const product = {
    id: nextId++,
    name,
    description: description || '',
    price: parseFloat(price),
    category: category || 'General',
    image: image || 'https://via.placeholder.com/200?text=Product'
  };

  products.push(product);
  console.log(`[Product Service] New product created: ${product.name} (id: ${product.id})`);
  res.status(201).json(product);
});

// POST /products/:id/notify - internal endpoint for inventory notifications
app.post('/products/:id/notify', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { stock, message } = req.body;
  console.log(`[Product Service] Inventory notification for "${product.name}": ${message} (stock: ${stock})`);

  if (stock === 0) {
    console.log(`[Product Service] WARNING: "${product.name}" is now OUT OF STOCK`);
  } else if (stock <= 5) {
    console.log(`[Product Service] WARNING: "${product.name}" has LOW STOCK (${stock} remaining)`);
  }

  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`[Product Service] Running on port ${PORT}`);
  console.log(`[Product Service] ${products.length} products loaded`);
});
