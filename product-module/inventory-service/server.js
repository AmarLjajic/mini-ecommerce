const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3004;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';

// In-memory inventory store (keyed by productId)
const inventory = {
  1: { productId: 1, stock: 50, warehouse: 'A' },
  2: { productId: 2, stock: 30, warehouse: 'B' },
  3: { productId: 3, stock: 100, warehouse: 'A' },
  4: { productId: 4, stock: 15, warehouse: 'C' },
  5: { productId: 5, stock: 75, warehouse: 'A' },
  6: { productId: 6, stock: 200, warehouse: 'B' },
  7: { productId: 7, stock: 8, warehouse: 'C' },
  8: { productId: 8, stock: 0, warehouse: 'B' }
};

// Request logging
app.use((req, res, next) => {
  console.log(`[Inventory Service] ${req.method} ${req.path} - ${new Date().toISOString()}`);
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
    console.error('[Inventory Service] Auth validation failed:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}

// Notify Product Service about inventory changes (inter-service communication)
async function notifyProductService(productId, stock) {
  try {
    const message = stock === 0
      ? 'Product is out of stock'
      : stock <= 5
        ? 'Product has low stock'
        : 'Stock level updated';

    const response = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock, message })
    });

    if (response.ok) {
      console.log(`[Inventory Service] Notified Product Service about product ${productId} (stock: ${stock})`);
    } else {
      console.error(`[Inventory Service] Product Service notification failed: ${response.status}`);
    }
  } catch (err) {
    console.error(`[Inventory Service] Could not reach Product Service: ${err.message}`);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'inventory-service', status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /inventory/:productId - get stock level (public)
app.get('/inventory/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  const item = inventory[productId];

  if (!item) {
    return res.status(404).json({ error: 'Inventory record not found for this product' });
  }

  res.json(item);
});

// GET /inventory - get all inventory (public)
app.get('/inventory', (req, res) => {
  res.json(Object.values(inventory));
});

// PUT /inventory/:productId - update stock (authenticated)
app.put('/inventory/:productId', validateToken, async (req, res) => {
  const productId = parseInt(req.params.productId);
  const { stock } = req.body;

  if (stock === undefined || stock === null) {
    return res.status(400).json({ error: 'Stock value is required' });
  }

  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  if (!inventory[productId]) {
    // Create new inventory record
    inventory[productId] = { productId, stock, warehouse: 'A' };
  } else {
    const oldStock = inventory[productId].stock;
    inventory[productId].stock = stock;
    console.log(`[Inventory Service] Product ${productId}: stock ${oldStock} -> ${stock}`);
  }

  // Inter-service communication: notify Product Service
  await notifyProductService(productId, stock);

  res.json({ message: 'Inventory updated', inventory: inventory[productId] });
});

app.listen(PORT, () => {
  console.log(`[Inventory Service] Running on port ${PORT}`);
  console.log(`[Inventory Service] Product Service URL: ${PRODUCT_SERVICE_URL}`);
  console.log(`[Inventory Service] Tracking ${Object.keys(inventory).length} products`);
});
