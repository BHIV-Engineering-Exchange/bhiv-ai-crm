# API Documentation — `backend-nodejs/` (Express)

**Base URL (dev):** `http://localhost:8000` (or `PORT` env var — collides with the Python backend's default, see `04_DEPLOYMENT_GUIDE.md` §3) · **70 verified live endpoints** across 12 route files, all confirmed mounted in `src/server.js` — no orphaned route files in this codebase (unlike `workflow-blackhole`).

**This is the backend the main React frontend actually uses day-to-day** — see `01_EXECUTIVE_OVERVIEW.md` for how that was verified.

## 1. Authentication

`Authorization: Bearer <jwt>` header, verified in `src/middleware/auth.js`. Passwords are hashed correctly with `bcryptjs` (verified — see `03b_BACKEND_NODEJS_WALKTHROUGH.md`).

### `POST /api/auth/register`, `POST /api/auth/login`

Standard register/login pair; on success both return a JWT. Because `User.js` hashes on save and compares with `bcrypt.compare()`, a plaintext-password vulnerability of the kind found in `workflow-blackhole` does not apply here — confirmed directly.

### `GET /api/auth/me` (protected)

Returns the current authenticated user's profile.

## 2. A second example: Products

### `GET /api/products`, `POST /api/products` (protected)

`POST` body maps to the `Product.js` schema: `name`, `sku`, `description`, `category`, `costPrice`, `sellingPrice`, `stockQuantity`, `minThreshold`, `unit`, `supplier`, `isActive`. **Important cross-backend note:** these field names (camelCase, `sku`, `costPrice`/`sellingPrice`) are **not** the same shape as the Python backend's `ProductModel` (`product_id`, `unit_price`, `weight_kg`, etc.) even though both ultimately write to a collection nominally called `products` in the same database — see `05_DATABASE_GUIDE.md` §1 for the full comparison. If you're integrating against "the products API," make sure you know which backend you're actually calling.

## 3. A third example: Orders

### `POST /api/orders` (protected)

Body maps to `Order.js`: `orderNumber`, `customerId`, `items` (array of line items — multi-product orders), `totalAmount`, `status`, `tracking`, `notes`, `shippingAddress`. Again, **not** the same shape as the Python backend's single-product `OrderModel` — see `05_DATABASE_GUIDE.md` §1.

## 4. Common failure-scenario conventions (verified pattern, consistent with the codebase's `errorHandler.js`)

| Status | Meaning |
|---|---|
| `400` | Validation error (`express-validator`, via `middleware/validate.js`) |
| `401` | Missing/invalid JWT |
| `403` | Insufficient role (`middleware/authorize.js`) |
| `404` | Resource not found |
| `500` | Unhandled error, routed through the central `errorHandler.js` |

## 5. Dependencies per endpoint group

| If this is unavailable | These endpoints degrade or fail |
|---|---|
| MongoDB Atlas | Everything — and note the whole process exits(1) if this connection fails at startup (verified) |
| SMTP (`services/emailService.js`) | Restock notification emails specifically — not confirmed whether this fails the request or just skips silently; check `emailService.js` directly if this matters for your use case |
| LLM provider | `/api/llm-query` specifically |

## 6. Full verified endpoint reference (70 endpoints, grouped by route file)

<details><summary><b>aiDecisions.js</b> — 11 endpoints</summary>

| Method | Path |
|---|---|
| POST | `/api/ai-decisions/make` |
| GET | `/api/ai-decisions/workflows` |
| GET | `/api/ai-decisions/workflows/:id` |
| POST | `/api/ai-decisions/workflows` |
| PUT | `/api/ai-decisions/workflows/:id` |
| POST | `/api/ai-decisions/workflows/:id/execute` |
| GET | `/api/ai-decisions/analytics` |
| GET | `/api/ai-decisions/history` |
| GET | `/api/ai-decisions/:id` |
| GET | `/api/ai-decisions/settings` |
| PUT | `/api/ai-decisions/settings` |

</details>

<details><summary><b>auth.js</b> — 3 endpoints</summary>

| Method | Path |
|---|---|
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |

</details>

<details><summary><b>dashboard.js</b> — 3 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/dashboard/stats` |
| GET | `/api/dashboard/recent-activity` |
| GET | `/api/dashboard/alerts` |

</details>

<details><summary><b>ems.js</b> — 11 endpoints</summary>

| Method | Path |
|---|---|
| POST | `/api/ems/send-to-supplier` |
| POST | `/api/ems/restock-alert` |
| POST | `/api/ems/purchase-order` |
| POST | `/api/ems/shipment-notification` |
| GET | `/api/ems/stats` |
| GET | `/api/ems/activity` |
| GET | `/api/ems/scheduled` |
| POST | `/api/ems/schedule` |
| GET | `/api/ems/templates` |
| GET | `/api/ems/settings` |
| PUT | `/api/ems/settings` |

</details>

<details><summary><b>inventory.js</b> — 4 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/inventory/logs` |
| POST | `/api/inventory/adjust` |
| GET | `/api/inventory/low-stock` |
| GET | `/api/inventory/stats` |

</details>

<details><summary><b>llmQuery.js</b> — 2 endpoints</summary>

| Method | Path |
|---|---|
| POST | `/api/llm-query` |
| GET | `/api/llm-query/examples` |

</details>

<details><summary><b>orders.js</b> — 6 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/orders` |
| POST | `/api/orders` |
| GET | `/api/orders/:id` |
| PUT | `/api/orders/:id/dispatch` |
| PUT | `/api/orders/:id/deliver` |
| GET | `/api/orders/stats/summary` |

</details>

<details><summary><b>products.js</b> — 6 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/products` |
| POST | `/api/products` |
| GET | `/api/products/:id` |
| PUT | `/api/products/:id` |
| DELETE | `/api/products/:id` |
| GET | `/api/products/stats/summary` |

</details>

<details><summary><b>restock.js</b> — 5 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/restock` |
| POST | `/api/restock/run-procurement` |
| POST | `/api/restock/:id/resend-email` |
| PUT | `/api/restock/:id/complete` |
| GET | `/api/restock/stats/summary` |

</details>

<details><summary><b>rl.js</b> — 8 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/rl/analytics` |
| GET | `/api/rl/rankings` |
| GET | `/api/rl/agents/:agentName/recommendations` |
| GET | `/api/rl/agents/:agentName/performance` |
| POST | `/api/rl/actions` |
| GET | `/api/rl/actions` |
| GET | `/api/rl/progress` |
| POST | `/api/rl/workflow` |

</details>

<details><summary><b>suppliers.js</b> — 5 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/suppliers` |
| POST | `/api/suppliers` |
| PUT | `/api/suppliers/:id` |
| DELETE | `/api/suppliers/:id` |
| GET | `/api/suppliers/stats` |

</details>

<details><summary><b>users.js</b> — 6 endpoints</summary>

| Method | Path |
|---|---|
| GET | `/api/users` |
| POST | `/api/users` |
| GET | `/api/users/:id` |
| PUT | `/api/users/:id` |
| DELETE | `/api/users/:id` |
| GET | `/api/users/stats/summary` |

</details>
