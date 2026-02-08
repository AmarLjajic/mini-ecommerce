const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// In-memory profile store
const profiles = {
  1: { userId: 1, username: 'alice', email: 'alice@example.com', fullName: 'Alice Johnson', bio: 'Platform administrator', avatar: 'https://i.pravatar.cc/150?u=alice' },
  2: { userId: 2, username: 'bob', email: 'bob@example.com', fullName: 'Bob Smith', bio: 'Regular shopper', avatar: 'https://i.pravatar.cc/150?u=bob' },
  3: { userId: 3, username: 'charlie', email: 'charlie@example.com', fullName: 'Charlie Brown', bio: 'New customer', avatar: 'https://i.pravatar.cc/150?u=charlie' }
};

// Request logging
app.use((req, res, next) => {
  console.log(`[Profile Service] ${req.method} ${req.path} - ${new Date().toISOString()}`);
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
    console.error('[Profile Service] Auth validation failed:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'profile-service', status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /profile/:userId
app.get('/profile/:userId', validateToken, (req, res) => {
  const userId = parseInt(req.params.userId);
  const profile = profiles[userId];

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json(profile);
});

// PUT /profile/:userId
app.put('/profile/:userId', validateToken, (req, res) => {
  const userId = parseInt(req.params.userId);

  // Users can only update their own profile (unless admin)
  if (req.user.userId !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only update your own profile' });
  }

  if (!profiles[userId]) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const { email, fullName, bio } = req.body;
  if (email) profiles[userId].email = email;
  if (fullName) profiles[userId].fullName = fullName;
  if (bio) profiles[userId].bio = bio;

  console.log(`[Profile Service] Profile updated for user ${userId}`);
  res.json({ message: 'Profile updated', profile: profiles[userId] });
});

app.listen(PORT, () => {
  console.log(`[Profile Service] Running on port ${PORT}`);
  console.log(`[Profile Service] Auth service URL: ${AUTH_SERVICE_URL}`);
});
