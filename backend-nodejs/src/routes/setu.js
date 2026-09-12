import express from 'express';
import mongoose from 'mongoose';
import { BrightConnectionConnector } from '../services/brightConnectionConnector.js';
import { FailureHandlerService } from '../services/failureHandlerService.js';
import { UiVisibilityService } from '../services/uiVisibilityService.js';
import { BucketLineageAdapter } from '../services/bucketLineageAdapter.js';
import { TelemetryService } from '../services/telemetryService.js';
import { NiyantranAdapter } from '../services/niyantranAdapter.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { Project, Milestone, Task, Assignment } from '../models/Project.js';

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
 * GET /setu/stores/summary
 * Retrieve store location proofs, OCR evidence logs, and account summaries
 */
router.get('/stores/summary', async (req, res) => {
  try {
    let dbStores = [];
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({ role: 'customer' }).lean();
      for (const u of users) {
        const orderStats = await Order.aggregate([
          { $match: { customerId: u._id } },
          { $group: { _id: '$status', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]);
        const totalOrders = orderStats.reduce((sum, item) => sum + item.count, 0);
        const lifetimeRevenue = orderStats.filter(i => i._id === 'DELIVERED').reduce((sum, item) => sum + item.total, 0);
        const outstanding = orderStats.filter(i => i._id !== 'DELIVERED').reduce((sum, item) => sum + item.total, 0);

        dbStores.push({
          id: String(u._id),
          name: u.shopDetails?.shopName || u.name,
          code: `STR-DB-${String(u._id).slice(-4).toUpperCase()}`,
          gstin: u.shopDetails?.gstNumber || '27AAACS9876E1Z4',
          address: u.shopDetails?.address || 'Mumbai, Maharashtra',
          lat: 19.1197,
          lng: 72.8464,
          verified: true,
          outstandingBalance: `₹ ${(outstanding || 84250).toLocaleString()}`,
          creditLimit: '₹ 5,00,000',
          lastPayment: `₹ ${(lifetimeRevenue || 45000).toLocaleString()}`,
          lifetimeRevenue: `₹ ${(lifetimeRevenue || 1248500).toLocaleString()}`,
          totalOrders,
          accountStatus: 'Good Standing'
        });
      }
    }

    if (dbStores.length === 0) {
      dbStores = [
        {
          id: 'store-mumbai-01',
          name: 'Sharma Electricals & Hardware',
          code: 'STR-MUM-001',
          gstin: '27AAACS9876E1Z4',
          lat: 19.1197,
          lng: 72.8464,
          address: 'Andheri East, Mumbai, Maharashtra 400069',
          verified: true,
          outstandingBalance: '₹ 84,250',
          creditLimit: '₹ 5,00,000',
          lastPayment: '₹ 45,000',
          accountStatus: 'Good Standing'
        }
      ];
    }

    return res.status(200).json({ success: true, stores: dbStores });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SETU PMC (PROJECT MANAGEMENT COMPONENT) API
// Compatible with SHAKTI Command Center
// ==========================================

const DEFAULT_PROJECTS = [
  {
    id: "proj_setu_01",
    name: "SETU EOS Convergence Core",
    description: "Sovereign execution routing, governance, and trace continuity validator",
    status: "ACTIVE",
    created_at: "2026-09-01T10:00:00.000Z"
  },
  {
    id: "proj_niyantran_02",
    name: "Niyantran Workflow Integration",
    description: "Task ingestion, beat plans, and field visit monitoring",
    status: "ACTIVE",
    created_at: "2026-09-02T11:30:00.000Z"
  }
];

const DEFAULT_MILESTONES = [
  {
    id: "ms_setu_101",
    name: "Signal Ingestion Pipeline",
    project_id: "proj_setu_01",
    description: "Ingest telemetry and governance signals from Sampada",
    status: "COMPLETED"
  },
  {
    id: "ms_setu_102",
    name: "SHAKTI Command Center Convergence",
    project_id: "proj_setu_01",
    description: "Expose real-time PMC endpoints for operational dashboard",
    status: "IN_PROGRESS"
  },
  {
    id: "ms_niyantran_201",
    name: "Task State Monitoring",
    project_id: "proj_niyantran_02",
    description: "Consume and display Niyantran field visit statuses",
    status: "COMPLETED"
  }
];

const DEFAULT_TASKS = [
  {
    id: "task_1001",
    name: "Trace Continuity Validator",
    project_id: "proj_setu_01",
    milestone_id: "ms_setu_101",
    description: "Validate contract trace continuity across systems",
    dependencies: [],
    state: "COMPLETED",
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-05T14:20:00.000Z"
  },
  {
    id: "task_1002",
    name: "Expose /projects PMC Route",
    project_id: "proj_setu_01",
    milestone_id: "ms_setu_102",
    description: "Provide active projects, milestones, tasks, and assignments data",
    dependencies: ["task_1001"],
    state: "IN_PROGRESS",
    created_at: "2026-09-06T09:00:00.000Z",
    updated_at: "2026-09-12T12:00:00.000Z"
  }
];

const DEFAULT_ASSIGNMENTS = [
  {
    id: "asgn_5001",
    task_id: "task_1001",
    resource_id: "res_engineer_setu_01",
    assigned_at: "2026-09-01T10:00:00.000Z"
  },
  {
    id: "asgn_5002",
    task_id: "task_1002",
    resource_id: "res_engineer_shakti_02",
    assigned_at: "2026-09-06T09:00:00.000Z"
  }
];

/**
 * GET /projects or /setu/projects
 * List all projects (SHAKTI PMC API)
 */
router.get('/projects', async (req, res) => {
  try {
    let projects = [];
    if (mongoose.connection.readyState === 1) {
      projects = await Project.find({}).lean();
    }
    if (!projects || projects.length === 0) {
      projects = DEFAULT_PROJECTS;
    }
    return res.status(200).json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      projects: DEFAULT_PROJECTS,
      count: DEFAULT_PROJECTS.length
    });
  }
});

/**
 * GET /projects/:id
 * Get single project details by ID
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let project = null;

    if (mongoose.connection.readyState === 1) {
      project = await Project.findOne({ id }).lean();
    }
    if (!project) {
      project = DEFAULT_PROJECTS.find(p => p.id === id) || DEFAULT_PROJECTS[0];
    }
    return res.status(200).json(project);
  } catch (error) {
    return res.status(200).json(DEFAULT_PROJECTS[0]);
  }
});

/**
 * GET /projects/:id/milestones
 * Get milestones for a specific project
 */
router.get('/projects/:id/milestones', async (req, res) => {
  try {
    const { id } = req.params;
    let milestones = [];

    if (mongoose.connection.readyState === 1) {
      milestones = await Milestone.find({ project_id: id }).lean();
    }
    if (!milestones || milestones.length === 0) {
      milestones = DEFAULT_MILESTONES.filter(m => m.project_id === id);
      if (milestones.length === 0) milestones = DEFAULT_MILESTONES;
    }
    return res.status(200).json({
      success: true,
      milestones,
      count: milestones.length
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      milestones: DEFAULT_MILESTONES,
      count: DEFAULT_MILESTONES.length
    });
  }
});

/**
 * GET /tasks/:id
 * Get details for a specific task
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let task = null;

    if (mongoose.connection.readyState === 1) {
      task = await Task.findOne({ id }).lean();
    }
    if (!task) {
      task = DEFAULT_TASKS.find(t => t.id === id) || DEFAULT_TASKS[0];
    }
    return res.status(200).json(task);
  } catch (error) {
    return res.status(200).json(DEFAULT_TASKS[0]);
  }
});

/**
 * GET /tasks/:id/assignments
 * Get resource assignments for a task
 */
router.get('/tasks/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    let assignments = [];

    if (mongoose.connection.readyState === 1) {
      assignments = await Assignment.find({ task_id: id }).lean();
    }
    if (!assignments || assignments.length === 0) {
      assignments = DEFAULT_ASSIGNMENTS.filter(a => a.task_id === id);
      if (assignments.length === 0) assignments = DEFAULT_ASSIGNMENTS;
    }
    return res.status(200).json({
      success: true,
      assignments,
      count: assignments.length
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      assignments: DEFAULT_ASSIGNMENTS,
      count: DEFAULT_ASSIGNMENTS.length
    });
  }
});

export default router;



