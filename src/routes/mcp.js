/**
 * MCP (Model Context Protocol) Endpoint
 * JSON-RPC 2.0 over HTTP POST
 * Agent-to-agent interface — no human UI
 */

const express = require('express');
const router = express.Router();
const catalog = require('../services/catalog');

// ── Tool Definitions ──────────────────────────────────────────────
const MCP_TOOLS = [
  {
    name: 'simpson_product_lookup',
    description: 'Search the complete Simpson Strong-Tie catalog (35+ product families, 400+ models). Filter by query, category, application, SDC rating, finish, or minimum load capacity. Returns full product specs, load tables, fastener requirements, code references, and ESR reports.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search by model number, product name, description, lumber size, or code section' },
        category: { type: 'string', enum: ['joist_hangers','hurricane_ties','straps','post_bases','angles','holdowns','shearwalls','anchors','fasteners','truss_connectors','deck_connectors','ridge_connectors','concealed','outdoor'], description: 'Filter by product category' },
        application: { type: 'string', enum: ['roof','truss','wall','floor','foundation','deck','shearwall','seismic','beam','continuous_load_path','retrofit','commercial','hurricane','glulam'], description: 'Filter by construction application' },
        sdc_rating: { type: 'string', enum: ['A','B','C','D','E','F'], description: 'Minimum Seismic Design Category rating' },
        finish: { type: 'string', description: 'Filter by finish: G90, ZMAX, HDG, SS' },
        min_load: { type: 'number', description: 'Minimum load capacity in lbs' },
        load_type: { type: 'string', description: 'Load type to filter by: F_down, tension, shear, uplift, lateral, shear_seismic' }
      }
    }
  },
  {
    name: 'simpson_check_load',
    description: 'Verify a Simpson connector meets your required load. Returns demand/capacity ratio, pass/fail verdict, reserve capacity, and upgrade recommendations if undersized. All loads ASD per C-C-2024.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID (e.g. LUS, HUS, HDU, SSW, SSTB)' },
        model_variant: { type: 'string', description: 'Specific model (e.g. LUS28, HDU5, SSW18X7)' },
        required_load_lbs: { type: 'number', description: 'Your design load in lbs (ASD)' },
        load_type: { type: 'string', description: 'Load direction: F_down, F_up, tension, shear, uplift, lateral, shear_seismic' },
        load_duration: { type: 'string', enum: ['normal','snow','roof','wind_seismic'], description: 'Load duration for CD factor' }
      },
      required: ['product_id', 'required_load_lbs']
    }
  },
  {
    name: 'simpson_size_holdown',
    description: 'Size a Simpson holdown for your required uplift force. Returns ranked recommendations (HDU, HDUE, HHDQ, PHD, STHD) with capacity, D/C ratio, deflection, and fastener specs.',
    inputSchema: {
      type: 'object',
      properties: {
        required_uplift_lbs: { type: 'number', description: 'Required uplift force in lbs' },
        load_condition: { type: 'string', enum: ['normal','wind_seismic'], description: 'Loading condition' },
        stud_type: { type: 'string', enum: ['single','double'], description: 'Single or double stud' },
        sdc: { type: 'string', enum: ['A','B','C','D','E','F'], description: 'Seismic Design Category' }
      },
      required: ['required_uplift_lbs']
    }
  },
  {
    name: 'simpson_select_hurricane_tie',
    description: 'Select a Simpson hurricane tie based on uplift and lateral requirements. Returns matched ties (H1, H2.5A, H10) with capacities for DF/SP or SPF/HF lumber.',
    inputSchema: {
      type: 'object',
      properties: {
        required_uplift_lbs: { type: 'number', description: 'Required uplift resistance in lbs' },
        required_lateral_lbs: { type: 'number', description: 'Required lateral resistance in lbs' },
        lumber_species: { type: 'string', enum: ['df_sp','spf_hf'], description: 'Lumber species group', default: 'df_sp' }
      }
    }
  },
  {
    name: 'simpson_classify_sdc',
    description: 'Classify Seismic Design Category per ASCE 7-22 from site parameters. Returns SDC A-F, site coefficients Fa/Fv, SDS/SD1, and which Simpson products are rated for that category.',
    inputSchema: {
      type: 'object',
      properties: {
        site_class: { type: 'string', enum: ['A','B','C','D','E'], description: 'ASCE 7-22 site class (A=hard rock to E=soft clay)', default: 'D' },
        Ss: { type: 'number', description: 'Mapped spectral acceleration at short period (g) from USGS' },
        S1: { type: 'number', description: 'Mapped spectral acceleration at 1-sec period (g) from USGS' },
        risk_category: { type: 'string', enum: ['I','II','III','IV'], description: 'Risk category per ASCE 7-22', default: 'II' }
      },
      required: ['Ss', 'S1']
    }
  },
  {
    name: 'simpson_corrosion_advisor',
    description: 'Get coating/finish recommendation based on environment and lumber treatment. Returns required finish (G90/ZMAX/HDG/SS) with treated lumber compatibility rules.',
    inputSchema: {
      type: 'object',
      properties: {
        environment: { type: 'string', description: 'Exposure: interior, exterior, marine, coastal, industrial, severe' },
        lumber_treatment: { type: 'string', description: 'Preservative treatment: ACQ, CA-C, CCA, MCA, borate, fire-retardant, untreated' },
        exposure: { type: 'string', description: 'Additional exposure detail' }
      }
    }
  },
  {
    name: 'simpson_products_by_application',
    description: 'Get all Simpson products for a specific construction application (roof, truss, wall, floor, foundation, deck, shearwall, seismic, beam, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        application: { type: 'string', enum: ['roof','truss','wall','floor','foundation','deck','shearwall','seismic','beam','continuous_load_path','retrofit','commercial','hurricane','glulam'], description: 'Construction application' }
      },
      required: ['application']
    }
  },
  {
    name: 'simpson_code_reference',
    description: 'Look up which Simpson products are referenced by a specific building code section (IBC, IRC, ASCE 7, NDS, SDPWS, FBC, TPI).',
    inputSchema: {
      type: 'object',
      properties: {
        code_section: { type: 'string', description: 'Code section to look up (e.g. "R502.6", "2305.3", "R802.11")' }
      },
      required: ['code_section']
    }
  },
  {
    name: 'simpson_catalog_stats',
    description: 'Get summary statistics of the Simpson Strong-Tie catalog: product counts, categories, code coverage, ASD methodology, load duration factors, LRFD multipliers.',
    inputSchema: { type: 'object', properties: {} }
  }
];

// ── MCP JSON-RPC Handler ──────────────────────────────────────────
router.post('/', (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  if (jsonrpc !== '2.0') {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC version' } });
  }

  // tools/list
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS }
    });
  }

  // tools/call
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    let result;

    try {
      switch (name) {
        case 'simpson_product_lookup':
          result = catalog.lookupProduct(args || {}); break;
        case 'simpson_check_load':
          result = catalog.checkLoadCapacity(args || {}); break;
        case 'simpson_size_holdown':
          result = catalog.sizeHoldown(args || {}); break;
        case 'simpson_select_hurricane_tie':
          result = catalog.selectHurricaneTie(args || {}); break;
        case 'simpson_classify_sdc':
          result = catalog.classifySDC(args || {}); break;
        case 'simpson_corrosion_advisor':
          result = catalog.adviseCorrision(args || {}); break;
        case 'simpson_products_by_application':
          result = catalog.getProductsByApplication(args || {}); break;
        case 'simpson_code_reference':
          result = catalog.lookupCode(args || {}); break;
        case 'simpson_catalog_stats':
          result = catalog.getCatalogStats(); break;
        default:
          return res.json({ jsonrpc:'2.0', id, error: { code:-32601, message:`Unknown tool: ${name}`, available:MCP_TOOLS.map(t=>t.name) } });
      }

      return res.json({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      });
    } catch (err) {
      return res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err.message }
      });
    }
  }

  // Unknown method
  res.json({ jsonrpc:'2.0', id, error: { code:-32601, message:`Unknown method: ${method}` } });
});

module.exports = router;
