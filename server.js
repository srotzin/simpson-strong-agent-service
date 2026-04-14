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

// ── Root Discovery (free, no auth) ────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Simpson Strong-Tie Construction Agent',
    description: 'Agent-to-agent construction hardware specialist. 400+ structural connectors, holdowns, anchors, and fasteners. Code compliance checking, load analysis, and material selection.',
    version: '1.0.0',
    type: 'agent-to-agent',
    protocol: 'x402 + MCP',
    tools: {
      product_lookup: { description: 'Search 400+ Simpson products by name, application, or specification', price_usdc: 0.01 },
      check_load: { description: 'Verify if a connector meets specified load requirements', price_usdc: 0.02 },
      size_holdown: { description: 'Select correct holdown for given uplift and deflection', price_usdc: 0.03 },
      select_hurricane_tie: { description: 'Hurricane tie selection by wind zone and member size', price_usdc: 0.02 },
      classify_sdc: { description: 'Seismic Design Category classification', price_usdc: 0.03 },
      corrosion_advisor: { description: 'Material selection for corrosive environments', price_usdc: 0.01 },
      products_by_application: { description: 'Find all products for a specific application', price_usdc: 0.01 },
      code_reference: { description: 'Building code reference lookup (IBC, IRC, ASCE)', price_usdc: 0.01 },
      catalog_stats: { description: 'Catalog statistics and coverage', price_usdc: 0 }
    },
    free_endpoints: ['/health', '/', '/.well-known/ai-plugin.json', '/.well-known/hive-payments.json', '/mcp'],
    onboard: {
      description: 'Join the Hive Civilization for enhanced access and reputation',
      endpoint: 'https://hivegate.onrender.com/v1/gate/onboard',
      benefit: 'Registered agents get volume discounts and priority routing'
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf'
    }
  });
});

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

// ── OpenAI Plugin Manifest (free, no auth) ───────────────────
app.get('/.well-known/ai-plugin.json', (req, res) => {
  const host = process.env.SERVICE_URL || 'https://simpson-strong-agent.onrender.com';
  res.json({
    schema_version: 'v1',
    name_for_human: 'Simpson Strong-Tie Agent',
    name_for_model: 'simpson_strong_tie',
    description_for_human: 'Construction hardware specialist — structural connectors, holdowns, anchors, fasteners. Code compliance and load analysis.',
    description_for_model: 'Use this tool for any question about structural construction hardware, building code compliance, holdown selection, hurricane ties, seismic design, anchor bolts, or Simpson Strong-Tie products. Returns detailed product specifications, load ratings, and code references.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: `${host}/.well-known/openapi.json`
    },
    logo_url: `${host}/logo.png`,
    contact_email: 'protocol@hiveagentiq.com',
    legal_info_url: `${host}/legal`
  });
});

// ── A2A Agent Card (Google Agent2Agent protocol v0.3.0) ──────
app.get(['/.well-known/agent.json', '/.well-known/agent-card.json'], (req, res) => {
  res.json({
    protocolVersion: '0.3.0',
    name: 'Simpson Strong-Tie Agent',
    description: 'Autonomous construction material lookup for Simpson Strong-Tie products. Headless agent-to-agent service with 1,500+ structural connectors, fasteners, and anchoring products.',
    url: 'https://simpson-strong-agent.onrender.com',
    version: '1.0.0',
    provider: { organization: 'Hive Agent IQ', url: 'https://www.hiveagentiq.com' },
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ['application/json', 'text/plain'],
    defaultOutputModes: ['application/json'],
    skills: [
      { id: 'product-lookup', name: 'Product Lookup', description: 'Search Simpson Strong-Tie catalog of 1,500+ construction products by name, category, or application', tags: ['construction', 'materials', 'structural', 'lookup', 'simpson'], inputModes: ['application/json', 'text/plain'], outputModes: ['application/json'], examples: [] },
      { id: 'spec-retrieval', name: 'Specification Retrieval', description: 'Get detailed specs, load tables, and installation guides for structural connectors, fasteners, and anchors', tags: ['specifications', 'engineering', 'construction', 'load-tables'], inputModes: ['application/json', 'text/plain'], outputModes: ['application/json'], examples: [] }
    ],
    authentication: { schemes: ['x402', 'api-key'] },
    payment: { protocol: 'x402', currency: 'USDC', network: 'base', address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf' }
  });
});

// ── Payment Discovery ─────────────────────────────────────────
app.get('/.well-known/hive-payments.json', (req, res) => {
  res.json({
    service: 'simpson-strong-agent',
    protocol: 'x402',
    currency: 'USDC',
    network: 'base',
    payment_address: process.env.PAYMENT_ADDRESS || '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf',
    pricing: PRICING,
    free_endpoints: ['/', '/health', '/.well-known/ai-plugin.json', '/.well-known/hive-payments.json', '/.well-known/simpson-agent.json', '/.well-known/agent.json', '/.well-known/agent-card.json', '/mcp', '/v1/api/stats', '/v1/api/applications'],
    auth_methods: ['x402-payment', 'x-api-key (hive internal)']
  });
});

// ── MCP Discovery (free, no auth) ─────────────────────────────
app.get('/mcp', (req, res) => {
  res.json({
    jsonrpc: '2.0',
    result: {
      tools: mcpRouter.MCP_TOOLS,
      protocol: 'JSON-RPC 2.0',
      transport: 'HTTP POST',
      endpoint: '/mcp',
      methods: ['tools/list', 'tools/call'],
      payment: 'x402 — tool calls require USDC payment; this listing is free'
    }
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
