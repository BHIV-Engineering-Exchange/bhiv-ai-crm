import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import { executeMitraProduct } from '../services/mitraProductService.js';

const router = express.Router();

const safeEqual = (provided, expected) => {
  const providedBuffer = Buffer.from(String(provided || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

router.use((req, res, next) => {
  const configured = process.env.SETU_MITRA_API_KEY;
  if (!configured) {
    return res.status(503).json({
      success: false,
      status: 'unavailable',
      error: 'SETU Mitra integration key is not configured',
    });
  }
  if (!safeEqual(req.get('X-SETU-API-Key'), configured)) {
    return res.status(401).json({
      success: false,
      status: 'rejected',
      error: 'Invalid SETU integration credential',
    });
  }
  return next();
});

router.post('/execute', async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      status: 'unavailable',
      error: 'SETU MongoDB dependency is not ready',
    });
  }
  try {
    const result = await executeMitraProduct(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (
      error instanceof TypeError ||
      error.code === 'UNSUPPORTED_SETU_INTENT'
    ) {
      return res.status(422).json({
        success: false,
        status: 'rejected',
        error: error.message,
      });
    }
    return next(error);
  }
});

export default router;
