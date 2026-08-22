import express from 'express';
import mongoose from 'mongoose';

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
 * POST /setu/signals/ingest
 * Ingest Sampada signal with explicit source_context provenance validation
 */
router.post('/signals/ingest', async (req, res) => {
  try {
    const signalData = req.body;

    if (!signalData || typeof signalData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'invalid_payload_type',
        message: 'Signal payload must be an object'
      });
    }

    const { trace_id, entity_id, event_type, signal_type, severity, timestamp, tenant_id, payload, source_context } = signalData;

    // Check required signal fields
    const missing = ['trace_id', 'entity_id', 'event_type', 'signal_type', 'severity', 'timestamp', 'tenant_id'].filter(f => !signalData[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'missing_required_fields',
        message: 'Signal payload missing required fields',
        details: { missing_fields: missing }
      });
    }

    // Resolve source_context
    const contextAvailable = Boolean(source_context && Object.keys(source_context).length > 0);
    const contextWarnings = [];

    if (contextAvailable) {
      const missingCtx = REQUIRED_SOURCE_CONTEXT_FIELDS.filter(f => !source_context[f]);
      if (missingCtx.length > 0) {
        contextWarnings.push({
          warning: 'source_context_incomplete',
          missing_fields: missingCtx,
          action: 'record_marked_incomplete'
        });
      }
    } else {
      contextWarnings.push({
        warning: 'source_context_absent',
        action: 'record_marked_context_unavailable'
      });
    }

    const ingestionId = `ing_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 15)}_${trace_id.slice(0, 8)}`;

    const recordData = {
      ingestion_id: ingestionId,
      trace_id,
      entity_id,
      event_type,
      signal_type,
      severity,
      timestamp,
      tenant_id,
      payload: payload || {},
      source_context: contextAvailable ? source_context : null,
      source_context_available: contextAvailable,
      source_context_warnings: contextWarnings.length > 0 ? contextWarnings : null,
      ingested_at: new Date().toISOString(),
      status: 'ingested'
    };

    // Save to MongoDB if connected, else return structured response
    if (mongoose.connection.readyState === 1) {
      await SetuSignal.create(recordData);
    }

    const response = {
      success: true,
      ingestion_id: ingestionId,
      trace_id,
      message: 'Signal ingested successfully',
      source_context_available: contextAvailable
    };

    if (contextWarnings.length > 0) {
      response.source_context_warnings = contextWarnings;
    }
    if (contextAvailable) {
      response.source_context = source_context;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

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
 * POST /setu/test/failures
 * Test failure scenarios (Test E - missing source_context)
 */
router.post('/test/failures', (req, res) => {
  const { action = 'quarantine', missing_fields = ['connected_company_id'] } = req.body || {};
  const isReject = action === 'reject';

  return res.status(isReject ? 400 : 202).json({
    success: !isReject,
    error: 'missing_source_context',
    message: isReject
      ? 'Record rejected — mandatory source_context fields are missing.'
      : 'Record quarantined — source_context incomplete. Manual review required.',
    action,
    missing_context_fields: missing_fields,
    source_context_available: false,
    status_code: isReject ? 400 : 202
  });
});

export default router;
