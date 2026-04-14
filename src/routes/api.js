/**
 * REST API Routes — Agent-to-Agent
 * Direct HTTP endpoints for agents that prefer REST over MCP
 */

const express = require('express');
const router = express.Router();
const catalog = require('../services/catalog');

// ── Product Lookup ─────────────────────────────────────────────
router.get('/products', (req, res) => {
  const result = catalog.lookupProduct(req.query);
  res.json({ success: true, data: result });
});

router.get('/products/:id', (req, res) => {
  const result = catalog.lookupProduct({ query: req.params.id });
  if (result.count === 0) return res.status(404).json({ success: false, error: `Product '${req.params.id}' not found` });
  res.json({ success: true, data: result.products[0] });
});

// ── Load Check ─────────────────────────────────────────────────
router.post('/check-load', (req, res) => {
  const result = catalog.checkLoadCapacity(req.body);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result });
});

// ── Holdown Sizing ─────────────────────────────────────────────
router.post('/size-holdown', (req, res) => {
  const result = catalog.sizeHoldown(req.body);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result });
});

// ── Hurricane Tie ──────────────────────────────────────────────
router.post('/select-hurricane-tie', (req, res) => {
  const result = catalog.selectHurricaneTie(req.body);
  res.json({ success: true, data: result });
});

// ── SDC Classifier ─────────────────────────────────────────────
router.post('/classify-sdc', (req, res) => {
  const result = catalog.classifySDC(req.body);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result });
});

// ── Corrosion Advisor ──────────────────────────────────────────
router.post('/corrosion-advisor', (req, res) => {
  const result = catalog.adviseCorrision(req.body);
  res.json({ success: true, data: result });
});

// ── Application Filter ────────────────────────────────────────
router.get('/applications/:app', (req, res) => {
  const result = catalog.getProductsByApplication({ application: req.params.app });
  if (result.error) return res.status(400).json({ success: false, error: result.error, available: result.available });
  res.json({ success: true, data: result });
});

router.get('/applications', (req, res) => {
  const { APPLICATIONS } = require('../data/products');
  res.json({ success: true, data: APPLICATIONS });
});

// ── Code Reference ─────────────────────────────────────────────
router.get('/codes/:section', (req, res) => {
  const result = catalog.lookupCode({ code_section: req.params.section });
  res.json({ success: true, data: result });
});

// ── Catalog Stats ──────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json({ success: true, data: catalog.getCatalogStats() });
});

module.exports = router;
