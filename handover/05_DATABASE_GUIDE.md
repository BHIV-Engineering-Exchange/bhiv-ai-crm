# Database Guide — ai-crm (CRM + Logistics + SETU)

**Engine:** MongoDB (Atlas) · **Database:** `ai_crm_logistics` on cluster `cluster0.7c16heb...` · **Verified: both backends connect to this exact same database** — confirmed by directly comparing the connection strings in `backend/.env` and `backend-nodejs/.env` (identical host, database name, and username).

## 1. Read this section first — the shared-database schema risk is real and field-level confirmed

This isn't a theoretical concern. Both backends define their own schema for what are, by collection name, the **same MongoDB collections** — and their field-level shapes genuinely disagree:

**`products` collection:**
| Python (`ProductModel`, `database/mongodb_models.py`) | Node (`Product.js`, `backend-nodejs/src/models/`) |
|---|---|
| `product_id`, `name`, `category`, `description`, `unit_price`, `weight_kg`, `dimensions`, `supplier_id`, `reorder_point`, `max_stock`, `is_active`, `created_at`, `updated_at`, plus image/marketing fields | `name`, `sku`, `description`, `category`, `costPrice`, `sellingPrice`, `stockQuantity`, `minThreshold`, `unit`, `supplier`, `isActive`, `createdBy` |

**`orders` collection:**
| Python (`OrderModel`) | Node (`Order.js`) |
|---|---|
| `order_id` (int), `status`, `customer_id`, `product_id`, `quantity`, `order_date`, `updated_at` — single product per order | `orderNumber`, `customerId`, `items` (array — multiple products per order), `totalAmount`, `status`, `tracking`, `notes`, `shippingAddress` |

These are not just naming-convention differences (snake_case vs. camelCase) — the actual data model is different (Python's order is single-product; Node's order is multi-product via an `items` array). **Verified directly by reading both schema definitions field-by-field, not inferred.**

**What this means in practice:** if both backends are actually live and both write to these collections, each risks writing documents the other can't correctly interpret, or (if they're pointed at logically the same collection) silently coexisting only because MongoDB doesn't enforce a schema — not because the applications agree on one. **This needs deliberate resolution or confirmation from the team** (e.g., maybe only one backend is the real writer for these collections in practice, with the other only reading a subset of fields) — that operational reality can't be determined from the code alone and should be confirmed by whoever runs both services day-to-day.

## 2. Python backend — two schema layers (legacy SQL + active MongoDB)

`database/models.py` defines 24 SQLAlchemy ORM classes (`Order`, `Return`, `RestockRequest`, `AgentLog`, `HumanReview`, `Inventory`, `PurchaseOrder`, `Supplier`, `Shipment`, `Courier`, `Product`, `DeliveryEvent`, `Alert`, `KPIMetric`, `NotificationLog`, `Account`, `Contact`, `Lead`, `Opportunity`, `Activity`, `CommunicationLog`, `Task`, `Note`) — this is the **legacy SQLite-era schema**, per `MONGODB_MIGRATION_COMPLETE.md` in the repo root, which documents that the app has since migrated off it. Treat this file as historical unless you find a specific still-active code path reading from `DATABASE_URL` (the SQLite connection string) — the main app reads via `MONGODB_URL`.

`database/mongodb_models.py` defines **18 active Pydantic models**: `OrderModel`, `ReturnModel`, `RestockRequestModel`, `AgentLogModel`, `HumanReviewModel`, `InventoryModel`, `PurchaseOrderModel`, `SupplierModel`, `ProductModel`, `ShipmentModel`, `CourierModel`, `AccountModel`, `ContactModel`, `LeadModel`, `OpportunityModel`, `ActivityModel`, `TaskModel`. **Note this list is shorter than the SQL version** — `DeliveryEvent`, `Alert`, `KPIMetric`, `NotificationLog`, `CommunicationLog`, and `Note` don't have a MongoDB-era equivalent here, suggesting either the migration didn't carry every entity over, or those features were deliberately dropped — worth confirming with the team rather than assuming either way.

The **CRM-specific entities** — `Account`, `Contact`, `Lead`, `Opportunity`, `Activity`, `Task` — exist only in the Python backend, with no Node equivalent. These are not at risk of the cross-backend collision described in §1.

## 3. Node backend — 6 Mongoose models

| Model | Fields | Relationships |
|---|---|---|
| `User.js` | 8 | User (self) |
| `Product.js` | 12 | User |
| `Order.js` | 8 | User, Product |
| `Supplier.js` | 8 | — |
| `RestockRequest.js` | 13 | Product, User |
| `InventoryLog.js` | 8 | Product, Order, User |

Full field list for `Product.js` and `Order.js` is in §1 above (shown for direct comparison against the Python equivalents); the rest follow the same Mongoose conventions.

## 4. SETU's own persistence

`setu/mongo_store.py` is a separate persistence layer specifically for SETU's lineage/telemetry/signal data — not part of the CRM/logistics collections discussed above, and not something the Node backend touches at all. Treat SETU's data as its own namespace within the shared database.

## 5. Migration history

`MONGODB_MIGRATION_COMPLETE.md` (repo root) documents the SQLite → MongoDB migration as complete. No ongoing migrations framework was found for either backend — schema evolution happens by editing the Pydantic/Mongoose definitions directly.

## 6. Seed data

`backend-nodejs/src/scripts/seedDatabase.js` (`npm run seed`) is a real, confirmed seed script — per that package's own `README.md`, it creates default admin/manager/customer accounts. No equivalent seed script was identified for the Python backend in this pass; check `backend/scripts/` directly if you need to bootstrap Python-backend-specific data.

## 7. Backup & restore procedures

No backup automation (script, cron job, or documented procedure) comparable to `workflow-blackhole`'s was found in this repository for either backend. Since production data lives on MongoDB Atlas, confirm with whoever administers that Atlas project whether automated backups / point-in-time recovery are enabled — this can't be determined from the codebase alone.
