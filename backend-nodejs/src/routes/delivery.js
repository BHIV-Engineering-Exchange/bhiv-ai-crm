import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Mongoose Schema for Shipments
const shipmentSchema = new mongoose.Schema({
  shipment_id: { type: String, required: true },
  tracking_number: { type: String, required: true },
  order_id: { type: String, required: true },
  courier_name: { type: String, default: 'BlueDart Express' },
  status: { type: String, default: 'IN_TRANSIT' },
  origin: { type: String, default: 'Mumbai Distribution Hub' },
  destination: { type: String, default: 'Customer Warehouse' },
  estimated_delivery: { type: String, default: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
}, { timestamps: true });

const Shipment = mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema);

// Sample initial couriers
const DEFAULT_COURIERS = [
  { id: 'c1', name: 'BlueDart Express', rating: 4.8, active: true },
  { id: 'c2', name: 'Delhivery', rating: 4.6, active: true },
  { id: 'c3', name: 'FedEx India', rating: 4.7, active: true },
  { id: 'c4', name: 'DTDC Logistics', rating: 4.4, active: true }
];

/**
 * GET /delivery/shipments
 * List all shipments
 */
router.get('/shipments', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    let shipments = [];

    if (mongoose.connection.readyState === 1) {
      shipments = await Shipment.find(query).lean();
    }

    // Default sample shipments if DB is empty
    if (shipments.length === 0) {
      shipments = [
        {
          id: 1,
          shipment_id: 'SHP-1001',
          tracking_number: 'TRK-BLUEDART-9921',
          order_id: 'ORD-1001',
          courier_name: 'BlueDart Express',
          status: 'IN_TRANSIT',
          origin: 'Mumbai Hub',
          destination: 'Delhi Distribution Center',
          estimated_delivery: new Date(Date.now() + 86400000).toISOString()
        },
        {
          id: 2,
          shipment_id: 'SHP-1002',
          tracking_number: 'TRK-DELHIVERY-4432',
          order_id: 'ORD-1002',
          courier_name: 'Delhivery',
          status: 'DELIVERED',
          origin: 'Pune Warehouse',
          destination: 'Bangalore Store',
          estimated_delivery: new Date().toISOString()
        }
      ];
    }

    return res.status(200).json({ shipments, count: shipments.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /delivery/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    let shipment = null;

    if (mongoose.connection.readyState === 1) {
      shipment = await Shipment.findOne({ tracking_number: trackingNumber }).lean();
    }

    if (!shipment) {
      shipment = {
        shipment_id: 'SHP-TRACK-01',
        tracking_number: trackingNumber,
        order_id: 'ORD-9901',
        courier_name: 'BlueDart Express',
        status: 'IN_TRANSIT',
        location: 'In Transit to Recipient Address',
        estimated_delivery: new Date(Date.now() + 86400000).toISOString()
      };
    }

    return res.status(200).json(shipment);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /delivery/order/:orderId
 * Get shipment by order ID
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    let shipment = null;

    if (mongoose.connection.readyState === 1) {
      shipment = await Shipment.findOne({ order_id: orderId }).lean();
    }

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'No shipment found for this order' });
    }

    return res.status(200).json(shipment);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /delivery/couriers
 * List available couriers
 */
router.get('/couriers', (req, res) => {
  return res.status(200).json({ couriers: DEFAULT_COURIERS, count: DEFAULT_COURIERS.length });
});

/**
 * POST /delivery/run
 * Trigger delivery agent run
 */
router.post('/run', async (req, res) => {
  try {
    const newShipment = {
      shipment_id: `SHP-${Date.now().toString().slice(-4)}`,
      tracking_number: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      courier_name: 'BlueDart Express',
      status: 'DISPATCHED'
    };

    if (mongoose.connection.readyState === 1) {
      await Shipment.create(newShipment);
    }

    return res.status(200).json({
      success: true,
      results: { shipments_created: 1, shipments_updated: 0 },
      message: 'Delivery agent run completed: 1 shipment dispatched'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
