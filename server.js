/**
 * Simpson Strong-Tie Strong Agent
 * Agent-to-Agent MCP + REST Service
 * 
 * No human UI. Agents call /mcp or /v1/api endpoints.
 * Payment via x402 protocol (USDC on Base L2).
 * 
 * Powered by Atlas-Construction-Pro / HiveForge
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mcpRouter = require('./src/routes/mcp');
const apiRouter = require('./src/routes/api');
const { requirePayment, PRICING } = require('./src/middleware/x402');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Health (free, no auth) ────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'simpson-strong-agent',
      version: '1.0.0',
      status: 'healthy',
      type: 'agent-to-agent',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      catalog: 'Simpson Strong-Tie C-C-2024',
      products: 35,
      models: '400+',
      protocol: 'MCP + REST',
      payment: 'x402 / USDC on Base L2'
    }
  });
});

// ── Discovery (free, no auth) ─────────────────────────────────
app.get('/.well-known/simpson-agent.json', (req, res) => {
  res.json({
    service: 'simpson-strong-agent',
    version: '1.0.0',
    description: 'Complete Simpson Strong-Tie structural connector catalog with load tables, SDC classification, holdown sizing, hurricane tie selection, corrosion advisory, and code reference. Agent-to-agent only.',
    agent_type: 'engineering',
    species: 'industrial',
    genome_id: 'gen_1a46aebe0037',
    did: 'did:hive:1463515c-e7b9-46cc-8079-46df92a6a241',
    host: process.env.SERVICE_URL || 'https://simpson-strong-agent.onrender.com',
    endpoints: {
      health: '/health',
      mcp: '/mcp',
      api: '/v1/api',
      discovery: '/.well-known/simpson-agent.json',
      pricing: '/.well-known/hive-payments.json'
    },
    mcp: {
      protocol: 'JSON-RPC 2.0',
      endpoint: '/mcp',
      transport: 'HTTP POST',
      methods: ['tools/list', 'tools/call'],
      tools: [
        'simpson_product_lookup',
        'simpson_check_load',
        'simpson_size_holdown',
        'simpson_select_hurricane_tie',
        'simpson_classify_sdc',
        'simpson_corrosion_advisor',
        'simpson_products_by_application',
        'simpson_code_reference',
        'simpson_catalog_stats'
      ]
    },
    rest_api: {
      base: '/v1/api',
      endpoints: [
        'GET /v1/api/products?query=&category=&application=&sdc_rating=&finish=&min_load=&load_type=',
        'GET /v1/api/products/:id',
        'POST /v1/api/check-load',
        'POST /v1/api/size-holdown',
        'POST /v1/api/select-hurricane-tie',
        'POST /v1/api/classify-sdc',
        'POST /v1/api/corrosion-advisor',
        'GET /v1/api/applications',
        'GET /v1/api/applications/:app',
        'GET /v1/api/codes/:section',
        'GET /v1/api/stats'
      ]
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      pricing: PRICING
    },
    catalog_coverage: {
      source: 'Simpson Strong-Tie C-C-2024',
      codes: ['IBC 2012-2024', 'IRC 2012-2024', 'ASCE 7-16/7-22', 'NDS 2018/2024', 'SDPWS 2015/2021'],
      categories: ['joist_hangers', 'hurricane_ties', 'straps', 'post_bases', 'angles', 'holdowns', 'shearwalls', 'anchors', 'fasteners', 'truss_connectors', 'deck_connectors', 'ridge_connectors', 'concealed', 'outdoor'],
      applications: ['roof', 'truss', 'wall', 'floor', 'foundation', 'deck', 'shearwall', 'seismic', 'beam', 'continuous_load_path', 'retrofit', 'commercial', 'hurricane', 'glulam'],
      sdc_coverage: 'A through F',
      methodology: 'ASD (Allowable Stress Design)',
      esr_reports: '60+'
    },
    hive_ecosystem: {
      hiveforge: 'https://hiveforge-lhu4.onrender.com',
      hivetrust: 'https://hivetrust.onrender.com',
      hivemind: 'https://hivemind-1-52cw.onrender.com',
      hivelaw: 'https://hivelaw.onrender.com',
      hiveagent: 'https://www.hiveagentiq.com'
    }
  });
});

// ── Payment Discovery ─────────────────────────────────────────
app.get('/.well-known/hive-payments.json', (req, res) => {
  res.json({
    service: 'simpson-strong-agent',
    protocol: 'x402',
    currency: 'USDC',
    network: 'base',
    payment_address: process.env.PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f7BABA',
    pricing: PRICING,
    free_endpoints: ['/health', '/.well-known/*', '/v1/api/stats', '/v1/api/applications'],
    auth_methods: ['x402-payment', 'x-api-key (hive internal)']
  });
});

// ── Payment Middleware ─────────────────────────────────────────
app.use(requirePayment);

// ── MCP Endpoint ──────────────────────────────────────────────
app.use('/mcp', mcpRouter);

// ── REST API ──────────────────────────────────────────────────
app.use('/v1/api', apiRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `${req.method} ${req.path} is not a valid endpoint.`,
    hint: 'See GET /.well-known/simpson-agent.json for available endpoints.',
    available: {
      health: 'GET /health',
      discovery: 'GET /.well-known/simpson-agent.json',
      mcp: 'POST /mcp (JSON-RPC 2.0)',
      api: '/v1/api/*'
    }
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  Simpson Strong-Tie Strong Agent v1.0.0  ║`);
  console.log(`  ║  Agent-to-Agent • MCP + REST • x402      ║`);
  console.log(`  ║  Port: ${PORT}                              ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
  console.log(`  MCP:   POST /mcp`);
  console.log(`  API:   /v1/api/*`);
  console.log(`  Disco: GET /.well-known/simpson-agent.json\n`);
});
