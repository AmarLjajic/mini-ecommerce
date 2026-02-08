# Mini E-Commerce Microservices

A simplified e-commerce system built with microservices architecture for learning purposes.

## Architecture

```
Frontend (HTML/JS - Port 8080)
    |
API Gateway (Express - Port 3000)
    |
    +-- User Module
    |   +-- Auth Service (Port 3001)     - login, logout, JWT validation
    |   +-- Profile Service (Port 3002)  - user profile management
    |
    +-- Product Module
        +-- Product Service (Port 3003)  - product catalog
        +-- Inventory Service (Port 3004) - stock management
```

**Key concepts demonstrated:**
- Service independence (each service runs separately with its own package.json)
- Inter-service communication (Inventory Service notifies Product Service on stock changes)
- Module boundaries (User Module vs Product Module)
- API Gateway pattern (single entry point for all clients)
- JWT-based authentication across services
- Docker containerization and orchestration

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 18+](https://nodejs.org/) (for local development without Docker)

## Quick Start

### Run with Docker Compose (recommended)

```bash
cd mini-ecommerce

# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

Once running:
- **Frontend:** http://localhost:8080
- **API Gateway:** http://localhost:3000

### Run Services Individually (development)

Each service can be run standalone for development:

```bash
# Terminal 1: Auth Service
cd user-module/auth-service
npm install
npm start

# Terminal 2: Profile Service
cd user-module/profile-service
npm install
npm start

# Terminal 3: Product Service
cd product-module/product-service
npm install
npm start

# Terminal 4: Inventory Service
cd product-module/inventory-service
npm install
npm start

# Terminal 5: API Gateway
cd api-gateway
npm install
npm start

# Terminal 6: Frontend (use any static file server)
cd frontend
npx http-server -p 8080
```

## Test Users

| Username | Password      | Role  |
|----------|---------------|-------|
| alice    | password123   | admin |
| bob      | password456   | user  |
| charlie  | password789   | user  |

## API Documentation

All requests go through the API Gateway at `http://localhost:3000`.

### Auth Service (`/api/auth`)

| Method | Endpoint           | Auth | Description              |
|--------|-------------------|------|--------------------------|
| POST   | `/api/auth/login`  | No   | Login, returns JWT token |
| POST   | `/api/auth/logout` | Yes  | Invalidates token        |
| GET    | `/api/auth/validate` | Yes | Validates current token  |
| GET    | `/api/auth/health` | No   | Health check             |

**Login request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "alice", "role": "admin" }
}
```

### Profile Service (`/api/profile`)

| Method | Endpoint                 | Auth | Description          |
|--------|-------------------------|------|----------------------|
| GET    | `/api/profile/:userId`  | Yes  | Get user profile     |
| PUT    | `/api/profile/:userId`  | Yes  | Update user profile  |

**Get profile:**
```bash
curl http://localhost:3000/api/profile/1 \
  -H "Authorization: Bearer <token>"
```

**Update profile:**
```bash
curl -X PUT http://localhost:3000/api/profile/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Alice J.", "bio": "Updated bio"}'
```

### Product Service (`/api/products`)

| Method | Endpoint              | Auth  | Description               |
|--------|-----------------------|-------|---------------------------|
| GET    | `/api/products`       | No    | List all products         |
| GET    | `/api/products/:id`   | No    | Get single product        |
| POST   | `/api/products`       | Admin | Create new product        |

**List products:**
```bash
curl http://localhost:3000/api/products
```

**Create product (admin only):**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Widget", "price": 9.99, "category": "General"}'
```

### Inventory Service (`/api/inventory`)

| Method | Endpoint                      | Auth | Description            |
|--------|-------------------------------|------|------------------------|
| GET    | `/api/inventory`              | No   | Get all inventory      |
| GET    | `/api/inventory/:productId`   | No   | Get stock for product  |
| PUT    | `/api/inventory/:productId`   | Yes  | Update stock level     |

**Check stock:**
```bash
curl http://localhost:3000/api/inventory/1
```

**Update stock (triggers notification to Product Service):**
```bash
curl -X PUT http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"stock": 5}'
```

## Testing Flows

### 1. User Login Flow
1. POST `/api/auth/login` with credentials
2. Receive JWT token
3. Use token in subsequent requests via `Authorization: Bearer <token>` header

### 2. Fetch Profile Flow
1. Login to get token
2. GET `/api/profile/:userId` with token
3. Profile Service calls Auth Service to validate token
4. Returns profile data

### 3. Browse Products Flow
1. GET `/api/products` (no auth required)
2. GET `/api/inventory` to see stock levels
3. Frontend combines both to show products with availability

### 4. Check and Update Inventory Flow
1. Login as any user
2. PUT `/api/inventory/:productId` with new stock value
3. Inventory Service updates stock
4. Inventory Service notifies Product Service (inter-service communication)
5. Product Service logs the notification (check docker logs)

### 5. Admin Create Product Flow
1. Login as alice (admin)
2. POST `/api/products` with product data
3. Product Service validates admin role via Auth Service
4. New product appears in listing

## Learning Exercises

### Exercise 1: Modify a Service
1. Edit `product-module/product-service/server.js`
2. Add a `DELETE /products/:id` endpoint
3. Rebuild: `docker compose up --build product-service`
4. Test with curl

### Exercise 2: Scale a Service
```bash
# Run 3 instances of the product service
docker compose up --scale product-service=3 -d

# The API Gateway will still route to the original container by name.
# To truly load-balance, you'd add a reverse proxy like Nginx or Traefik.
```

### Exercise 3: Add a New Endpoint
Add a search endpoint to Product Service:
1. Add `GET /products/search?q=keyword` that filters by name
2. Add the gateway route if needed
3. Test from the frontend

### Exercise 4: Add a New Microservice
Create an Order Service in a new `order-module/order-service/` directory:
1. Copy the structure from an existing service
2. Create `server.js`, `package.json`, `Dockerfile`
3. Add it to `docker-compose.yml`
4. Add a gateway route in `api-gateway/server.js`
5. Have it call Product and Inventory services

## Next Steps

### Add a Real Database
Replace in-memory stores with a database:
- Add a PostgreSQL or MongoDB container to `docker-compose.yml`
- Use an ORM like Prisma or Mongoose
- Each service gets its own database (database-per-service pattern)

### Add a Message Queue
Replace synchronous HTTP calls with asynchronous messaging:
- Add RabbitMQ or Redis container
- Inventory Service publishes events instead of calling Product Service directly
- Enables event-driven architecture

### Implement Service Discovery
- Use tools like Consul or etcd
- Services register themselves on startup
- Gateway discovers services dynamically

### Deploy to Cloud
- Push images to a container registry (Docker Hub, ECR, GCR)
- Deploy to Kubernetes, AWS ECS, or Google Cloud Run
- Add an ingress controller or load balancer
- Set up CI/CD pipeline

### Add Observability
- Centralized logging with ELK stack or Loki
- Distributed tracing with Jaeger or Zipkin
- Metrics with Prometheus and Grafana
