# Source Code Walkthrough — `backend-nodejs/` (Express)

28 files total, all individually syntax-checked (`node --check`) with zero errors — the cleanest, smallest codebase across both repositories reviewed in this handover. This is the backend the main React frontend actually uses day-to-day (see `01_EXECUTIVE_OVERVIEW.md`).

## 1. Runtime lifecycle

1. `npm start` → `node src/server.js`.
2. `.env` is loaded; `src/config/database.js` connects to MongoDB (Mongoose).
3. Express app is built: `helmet`, `cors`, rate limiting (`app.use('/api/', limiter)`), JSON body parsing (10 MB limit), `morgan` logging.
4. 12 route groups are mounted under `/api/*` — all of them, no orphans (unlike workflow-blackhole, every route file here is actually wired in — verified by cross-referencing `src/server.js` against the file list).
5. Server listens on port 8000 (or `PORT` env var) — **verified boot behavior: the HTTP listener opens before the MongoDB connection attempt resolves, and if that connection fails, `src/config/database.js` calls `process.exit(1)` directly**, killing the whole process even though it briefly appeared to start. Confirmed by live testing (see `13_EVIDENCE_PACKET.md`).

## 2. Directory structure

```
src/
├── server.js              Entry point — Express app construction, all 12 route mounts
├── config/
│   ├── database.js          Mongoose connection + exit(1)-on-failure logic
│   └── constants.js
├── middleware/
│   ├── auth.js               JWT verification, Authorization: Bearer header
│   ├── authorize.js           Role-based access control
│   ├── errorHandler.js         Central error handler
│   └── validate.js             express-validator wrapper
├── models/                  6 Mongoose schemas — see 05_DATABASE_GUIDE.md
├── routes/                  12 files, 70 endpoints total, all mounted
├── scripts/
│   ├── seedDatabase.js         `npm run seed` — populates initial data (admin/manager/customer
│   │                            accounts per the README's documented default credentials)
│   └── cleanDatabase.js
└── services/
    └── emailService.js        NodeMailer wrapper — restock notification emails
```

## 3. Routes — all mounted, none orphaned

| Route file | Mount prefix | Endpoint count |
|---|---|---|
| `auth.js` | `/api/auth` | 3 |
| `users.js` | `/api/users` | 6 |
| `products.js` | `/api/products` | 6 |
| `orders.js` | `/api/orders` | 6 |
| `inventory.js` | `/api/inventory` | 4 |
| `restock.js` | `/api/restock` | 5 |
| `ems.js` | `/api/ems` | 11 |
| `rl.js` | `/api/rl` | 8 |
| `aiDecisions.js` | `/api/ai-decisions` | 11 |
| `llmQuery.js` | `/api/llm-query` | 2 |
| `dashboard.js` | `/api/dashboard` | 3 |
| `suppliers.js` | `/api/suppliers` | 5 |

**70 total** — a meaningfully smaller and cleaner surface than the Python backend's 112, consistent with this being the focused operational CRUD API while the Python backend carries SETU, procurement, AI, and dashboard responsibilities.

## 4. Auth & password handling — verified correct

`src/models/User.js` hashes passwords properly: `bcrypt.genSalt(10)` + `bcrypt.hash()` in a pre-save hook, and a `comparePassword` instance method using `bcrypt.compare()`. **This is genuinely good practice, confirmed by reading the code directly** — worth noting explicitly since the sibling `workflow-blackhole` repository was found to store passwords in plain text; this backend does not have that problem.

## 5. Models (`src/models/`, 6 files)

| Model | Fields | Relationships |
|---|---|---|
| `User.js` | 8 | User (self, likely createdBy-style) |
| `Product.js` | 12 | User |
| `Order.js` | 8 | User, Product |
| `Supplier.js` | 8 | — |
| `RestockRequest.js` | 13 | Product, User |
| `InventoryLog.js` | 8 | Product, Order, User |

Full field-level detail in `05_DATABASE_GUIDE.md`, alongside the important cross-backend note that these collection names (`products`, `orders`, `suppliers`) are also directly touched by the Python backend's own database layer.

## 6. What's genuinely different about this codebase vs. everything else reviewed in this handover

No dead/orphaned route files, no duplicate models, no commented-out legacy code blocks found during review, and correct password hashing. Of everything examined across both repositories, this is the one codebase that didn't turn up a structural or security finding of its own — its issues (documented in `07_KNOWN_ISSUES_REGISTER.md`) are mostly at the cross-repository level (the port collision with the Python backend, the shared-database risk), not within this codebase itself.
