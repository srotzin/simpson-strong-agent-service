/**
 * x402 Payment Middleware — Agent-to-Agent Payments
 * Matches HiveForge reference implementation with replay protection
 * Agents pay per query in USDC
 */

const spentPaymentsCache = new Set();

// Pricing per tool call
const PRICING = {
  simpson_product_lookup: 0.01,
  simpson_check_load: 0.02,
  simpson_size_holdown: 0.03,
  simpson_select_hurricane_tie: 0.02,
  simpson_classify_sdc: 0.03,
  simpson_corrosion_advisor: 0.01,
  simpson_products_by_application: 0.01,
  simpson_code_reference: 0.01,
  simpson_catalog_stats: 0.00, // free
  // REST endpoints
  'GET /v1/api/products': 0.01,
  'POST /v1/api/check-load': 0.02,
  'POST /v1/api/size-holdown': 0.03,
  'POST /v1/api/select-hurricane-tie': 0.02,
  'POST /v1/api/classify-sdc': 0.03,
  'POST /v1/api/corrosion-advisor': 0.01,
  'GET /v1/api/applications': 0.00,
  'GET /v1/api/codes': 0.01,
  'GET /v1/api/stats': 0.00
};

function isPaymentSpent(txHash) {
  return spentPaymentsCache.has(txHash);
}

function recordSpentPayment(txHash) {
  spentPaymentsCache.add(txHash);
}

function requirePayment(req, res, next) {
  // Free endpoints
  const freeEndpoints = ['/', '/health', '/.well-known/ai-plugin.json', '/.well-known/simpson-agent.json', '/.well-known/hive-payments.json', '/mcp', '/v1/api/stats', '/v1/api/applications'];
  if (req.method === 'GET' && freeEndpoints.some(ep => req.path === ep || req.path.startsWith('/.well-known/'))) return next();

  // API key auth (internal hive services bypass payment)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && (
    apiKey === process.env.HIVE_INTERNAL_KEY ||
    apiKey === process.env.SERVICE_API_KEY ||
    apiKey.startsWith('hive_')
  )) {
    return next();
  }

  // x402 payment verification
  const paymentHash = req.headers['x-payment-hash'] || req.headers['x-402-payment'];
  if (!paymentHash) {
    const tool = req.body?.params?.name || `${req.method} ${req.path}`;
    const price = PRICING[tool] || 0.01;
    return res.status(402).json({
      status: '402 Payment Required',
      message: 'This endpoint requires USDC payment via x402 protocol.',
      pricing: {
        tool,
        cost_usdc: price,
        currency: 'USDC',
        network: 'base',
        payment_address: process.env.PAYMENT_ADDRESS || '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf'
      },
      protocol: 'x402',
      instructions: 'Send USDC to payment_address on Base L2, then include tx hash in X-Payment-Hash header.'
    });
  }

  // Replay check
  if (isPaymentSpent(paymentHash)) {
    return res.status(409).json({
      status: '409 Conflict',
      reason: 'tx_already_spent',
      message: 'This payment hash has already been used.'
    });
  }

  // Record and proceed (in production, verify on-chain before this)
  recordSpentPayment(paymentHash);
  req.paymentHash = paymentHash;
  next();
}

module.exports = { requirePayment, PRICING };
