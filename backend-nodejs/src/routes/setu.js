import express from 'express';
import mongoose from 'mongoose';
import { BrightConnectionConnector } from '../services/brightConnectionConnector.js';
import { FailureHandlerService } from '../services/failureHandlerService.js';
import { UiVisibilityService } from '../services/uiVisibilityService.js';
import { BucketLineageAdapter } from '../services/bucketLineageAdapter.js';
import { TelemetryService } from '../services/telemetryService.js';
import { NiyantranAdapter } from '../services/niyantranAdapter.js';

const router = express.Router();

// MongoDB Schema for SETU Ingested Signals
const setuSignalSchema = new mongoose.Schema({
  ingestion_id: { type: String, required: true, unique: true },
  trace_id: { type: String, required: true, index: true },
  entity_id: { type: String, required: true },
  event_type: { type: String, required: true },
  signal_type: { type: String, required: true },
  severity: { type: String, required: true },
  timestamp: { type: String, required: true },
  tenant_id: { type: String, required: true, index: true },
  payload: { type: Object, default: {} },
  source_context: { type: Object, default: null },
  source_context_available: { type: Boolean, default: false },
  source_context_warnings: { type: Array, default: null },
  ingested_at: { type: String, default: () => new Date().toISOString() },
  status: { type: String, default: 'ingested' }
}, { timestamps: true });

const SetuSignal = mongoose.models.SetuSignal || mongoose.model('SetuSignal', setuSignalSchema);

const REQUIRED_SOURCE_CONTEXT_FIELDS = [
  'source_system',
  'connected_company_id',
  'connected_company_name',
  'source_entity',
  'received_at'
];

/**
 * Common handler for Sampada signal ingestion
 */
async function handleSignalIngest(req, res) {
  try {
    const signalData = req.body;

    if (!signalData || typeof signalData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'invalid_payload_type',
        message: 'Signal payload must be an object'
      });
    }

    const { trace_id, entity_id, event_type, signal_type, severity, timestamp, tenant_id, payload, source_context, failure_action } = signalData;

    // Check required signal fields (fallback entity_id/trace_id for Artha Sampada envelope if nested in payload)
    const resolvedTraceId = trace_id || (payload && payload.trace_id) || signalData.correlation_id || `trc_gen_${Date.now()}`;
    const resolvedEntityId = entity_id || (payload && payload.source && payload.source.entity_id) || signalData.workforce_ref_id || 'ent_gen_01';
    const resolvedEventType = event_type || (payload && payload.signal_id) || signalData.signal_type || 'artha_signal';
    const resolvedSignalType = signal_type || req.params.signal_type || 'compliance';
    const resolvedSeverity = severity || (payload && payload.severity) || 'INFO';
    const resolvedTimestamp = timestamp || (payload && payload.timestamp) || new Date().toISOString();
    const resolvedTenantId = tenant_id || (payload && payload.tenant_id) || 'tenant_artha';

    // Resolve source_context
    const resolvedSourceContext = source_context || (payload && payload.source_context) || {
      source_system: signalData.origin_system || 'artha',
      connected_company_id: 'artha_comp_001',
      connected_company_name: 'AI Artha Compliance',
      store_id: null,
      store_name: null,
      location_identifier: null,
      store_context_available: false,
      source_entity: (payload && payload.source && payload.source.entity_type) || 'COMPLIANCE_SIGNAL',
      source_record_id: resolvedEntityId,
      source_timestamp: resolvedTimestamp,
      received_at: new Date().toISOString(),
      sync_id: null
    };

    const contextAvailable = Boolean(resolvedSourceContext && Object.keys(resolvedSourceContext).length > 0);
    const contextWarnings = [];

    if (contextAvailable) {
      const missingCtx = REQUIRED_SOURCE_CONTEXT_FIELDS.filter(f => !resolvedSourceContext[f]);
      if (missingCtx.length > 0) {
        contextWarnings.push({
          warning: 'source_context_incomplete',
          missing_fields: missingCtx,
          action: 'record_marked_incomplete'
        });

        if (failure_action) {
          const failureRes = await FailureHandlerService.handleMissingSourceContext(resolvedTraceId, resolvedTenantId, missingCtx, failure_action);
          if (!failureRes.success) {
            return res.status(failureRes.status_code).json(failureRes);
          }
        }
      }
    } else {
      contextWarnings.push({
        warning: 'source_context_absent',
        action: 'record_marked_context_unavailable'
      });

      if (failure_action) {
        const failureRes = await FailureHandlerService.handleMissingSourceContext(resolvedTraceId, resolvedTenantId, REQUIRED_SOURCE_CONTEXT_FIELDS, failure_action);
        if (!failureRes.success || failureRes.quarantined) {
          return res.status(failureRes.status_code).json(failureRes);
        }
      }
    }

    const ingestionId = `ing_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 15)}_${resolvedTraceId.slice(0, 8)}`;

    const recordData = {
      ingestion_id: ingestionId,
      trace_id: resolvedTraceId,
      entity_id: resolvedEntityId,
      event_type: resolvedEventType,
      signal_type: resolvedSignalType,
      severity: resolvedSeverity,
      timestamp: resolvedTimestamp,
      tenant_id: resolvedTenantId,
      payload: payload || signalData,
      source_context: contextAvailable ? resolvedSourceContext : null,
      source_context_available: contextAvailable,
      source_context_warnings: contextWarnings.length > 0 ? contextWarnings : null,
      ingested_at: new Date().toISOString(),
      status: 'ingested'
    };

    // Save to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      await SetuSignal.create(recordData);
    }

    const response = {
      success: true,
      signal_id: ingestionId, // Artha parseSampadaAcknowledge looks for signal_id / ingestion_id
      ingestion_id: ingestionId,
      trace_id: resolvedTraceId,
      message: 'Signal ingested successfully',
      source_context_available: contextAvailable
    };

    if (contextWarnings.length > 0) {
      response.source_context_warnings = contextWarnings;
    }
    if (contextAvailable) {
      response.source_context = resolvedSourceContext;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
}

/**
 * POST /setu/signals/ingest & POST /setu/signals/:signal_type
 * Ingest Sampada signal with explicit source_context provenance validation
 */
router.post('/signals/ingest', handleSignalIngest);
router.post('/signals/:signal_type', handleSignalIngest);


/**
 * GET /setu/signals/:trace_id
 * Retrieve ingested signals by trace_id
 */
router.get('/signals/:trace_id', async (req, res) => {
  try {
    const { trace_id } = req.params;
    let signals = [];

    if (mongoose.connection.readyState === 1) {
      signals = await SetuSignal.find({ trace_id }).lean();
    }

    return res.status(200).json({
      trace_id,
      signals,
      count: signals.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

/**
 * POST /setu/bright/catalog
 * Transform raw Bright Connection catalog payload into MDU format
 */
router.post('/bright/catalog', (req, res) => {
  try {
    const { items = [], sync_id = null } = req.body || {};
    const rawItems = Array.isArray(items) ? items : [req.body];
    const canonicalProducts = BrightConnectionConnector.transformProductCatalog(rawItems, sync_id);

    return res.status(200).json({
      success: true,
      mdu_type: 'product_catalog',
      count: canonicalProducts.length,
      products: canonicalProducts
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'catalog_transformation_failed',
      message: error.message
    });
  }
});

/**
 * POST /setu/bright/orders
 * Transform raw Bright Connection order payload into MDU format
 */
router.post('/bright/orders', (req, res) => {
  try {
    const { order = {}, sync_id = null } = req.body || {};
    const rawOrder = req.body.order_id ? req.body : order;
    const canonicalOrder = BrightConnectionConnector.transformOrderPayload(rawOrder, sync_id);

    return res.status(200).json({
      success: true,
      mdu_type: 'order_record',
      order: canonicalOrder
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'order_transformation_failed',
      message: error.message
    });
  }
});

/**
 * POST /setu/bright/field-visits
 * Transform raw Bright Connection field visit payload into MDU format
 */
router.post('/bright/field-visits', (req, res) => {
  try {
    const { visit = {}, sync_id = null } = req.body || {};
    const rawVisit = req.body.visit_id ? req.body : visit;
    const canonicalVisit = BrightConnectionConnector.transformFieldVisitEvidence(rawVisit, sync_id);

    return res.status(200).json({
      success: true,
      mdu_type: 'field_visit_evidence',
      visit: canonicalVisit
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'visit_transformation_failed',
      message: error.message
    });
  }
});

/**
 * GET /setu/visibility/candidate/:trace_id
 * Get UI candidate state for trace_id
 */
router.get('/visibility/candidate/:trace_id', async (req, res) => {
  try {
    const { trace_id } = req.params;
    const result = await UiVisibilityService.getCandidateState(trace_id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'visibility_lookup_failed', message: error.message });
  }
});

/**
 * GET /setu/visibility/tasks/:trace_id
 * Get task state visibility for trace_id
 */
router.get('/visibility/tasks/:trace_id', async (req, res) => {
  try {
    const { trace_id } = req.params;
    const result = await UiVisibilityService.getTaskStateVisibility(trace_id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'visibility_lookup_failed', message: error.message });
  }
});

/**
 * POST /setu/lineage/emit
 * Emit lineage event
 */
router.post('/lineage/emit', async (req, res) => {
  try {
    const { execution, event_type, payload, overrides } = req.body || {};
    const event = await BucketLineageAdapter.emitExecutionEvent(execution, event_type, payload, overrides);
    return res.status(200).json({ success: true, event });
  } catch (error) {
    return res.status(400).json({ success: false, error: 'lineage_emit_failed', message: error.message });
  }
});

/**
 * POST /setu/telemetry/emit
 * Emit telemetry event
 */
router.post('/telemetry/emit', async (req, res) => {
  try {
    const event = await TelemetryService.emit(req.body);
    return res.status(200).json({ success: true, event });
  } catch (error) {
    return res.status(400).json({ success: false, error: 'telemetry_emit_failed', message: error.message });
  }
});

/**
 * POST /setu/niyantran/task-state
 * Consume task state from Niyantran
 */
router.post('/niyantran/task-state', async (req, res) => {
  try {
    const result = await NiyantranAdapter.consumeTaskState(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: 'niyantran_task_state_failed', message: error.message });
  }
});

/**
 * POST /setu/test/failures
 * Test failure scenarios (Test E - missing source_context)
 */
router.post('/test/failures', async (req, res) => {
  const { action = 'quarantine', missing_fields = ['connected_company_id'], trace_id = 'trc_test_12345', tenant_id = 'tenant_test' } = req.body || {};
  const failureRes = await FailureHandlerService.handleMissingSourceContext(trace_id, tenant_id, missing_fields, action);
  return res.status(failureRes.status_code).json(failureRes);
});

export default router;


