const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

const PORT = process.env.PORT || 3000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PROFILE_SERVICE_URL = process.env.PROFILE_SERVICE_URL || 'http://localhost:3002';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';

// CORS
app.use(cors());

// Request logging
app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));

// Custom request logger
app.use((req, res, next) => {
  console.log(`[API Gateway] Routing: ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    routes: {
      auth: AUTH_SERVICE_URL,
      profile: PROFILE_SERVICE_URL,
      products: PRODUCT_SERVICE_URL,
      inventory: INVENTORY_SERVICE_URL
    }
  });
});

// Proxy options factory
function createProxy(target, pathRewrite) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(`[API Gateway] -> Proxying to ${target}${proxyReq.path}`);
      },
      error: (err, req, res) => {
        console.error(`[API Gateway] Proxy error: ${err.message}`);
        res.status(502).json({ error: 'Service unavailable', service: target });
      }
    }
  });
}

// Route: /api/auth/* -> Auth Service
app.use('/api/auth', createProxy(AUTH_SERVICE_URL, { '^/api/auth': '' }));

// Route: /api/profile/* -> Profile Service
app.use('/api/profile', createProxy(PROFILE_SERVICE_URL, { '^/api/profile': '/profile' }));

// Route: /api/products/* -> Product Service
app.use('/api/products', createProxy(PRODUCT_SERVICE_URL, { '^/api/products': '/products' }));

// Route: /api/inventory/* -> Inventory Service
app.use('/api/inventory', createProxy(INVENTORY_SERVICE_URL, { '^/api/inventory': '/inventory' }));

// 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'Mini E-Commerce API Gateway',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET  /api/auth/validate',
      'GET  /api/profile/:userId',
      'PUT  /api/profile/:userId',
      'GET  /api/products',
      'GET  /api/products/:id',
      'POST /api/products',
      'GET  /api/inventory',
      'GET  /api/inventory/:productId',
      'PUT  /api/inventory/:productId'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port ${PORT}`);
  console.log(`[API Gateway] Routes:`);
  console.log(`  /api/auth/*      -> ${AUTH_SERVICE_URL}`);
  console.log(`  /api/profile/*   -> ${PROFILE_SERVICE_URL}`);
  console.log(`  /api/products/*  -> ${PRODUCT_SERVICE_URL}`);
  console.log(`  /api/inventory/* -> ${INVENTORY_SERVICE_URL}`);
});
