import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INTENTS,
  executeMitraProduct,
} from '../src/services/mitraProductService.js';

const envelope = (intentId, payload) => ({
  schema_version: '1.0.0',
  contract_version: '1.0.0',
  runtime_version: '1.0.0',
  compatibility_version: 'mitra-companion-1',
  dispatch_id: 'dsp_setu_test',
  correlation_id: 'trace_setu_test',
  session_id: 'ses_setu_test',
  product_id: 'setu-ai-crm',
  capability_id: 'crm-operations',
  intent_id: intentId,
  payload,
  context: {},
});

test('inventory lookup preserves trace and delegates to the product repository', async () => {
  const calls = [];
  const repository = {
    async inventory(request) {
      calls.push(request);
      return [
        {
          name: 'Tea Leaves',
          sku: 'TEA-001',
          stockQuantity: 3,
          minThreshold: 20,
        },
      ];
    },
  };

  const result = await executeMitraProduct(
    envelope(INTENTS.INVENTORY_LOOKUP, {
      query: 'show low stock products',
      limit: 10,
    }),
    repository,
  );

  assert.equal(result.status, 'completed');
  assert.equal(result.trace_id, 'trace_setu_test');
  assert.equal(result.operation, 'inventory_lookup');
  assert.equal(result.data.low_stock_only, true);
  assert.equal(result.data.products[0].sku, 'TEA-001');
  assert.equal(calls[0].lowStockOnly, true);
  assert.equal(calls[0].limit, 10);
});

test('operations summary returns only aggregate operational facts', async () => {
  const repository = {
    async operationsSummary() {
      return {
        active_products: 8,
        low_stock_products: 2,
        total_orders: 12,
        orders_by_status: { PLACED: 4, DELIVERED: 8 },
      };
    },
  };

  const result = await executeMitraProduct(
    envelope(INTENTS.OPERATIONS_SUMMARY, {
      query: 'give me the CRM operations summary',
    }),
    repository,
  );

  assert.equal(result.operation, 'operations_summary');
  assert.equal(result.metadata.read_only, true);
  assert.equal(result.data.total_orders, 12);
  assert.equal(result.data.low_stock_products, 2);
});

test('order lookup rejects an absent order number', async () => {
  await assert.rejects(
    executeMitraProduct(
      envelope(INTENTS.ORDER_LOOKUP, {
        query: 'show an order',
      }),
      {},
    ),
    /order_number is required/,
  );
});

test('unknown product intents fail closed', async () => {
  await assert.rejects(
    executeMitraProduct(envelope('setu.unknown', { query: 'unknown' }), {}),
    /Unsupported SETU intent/,
  );
});
