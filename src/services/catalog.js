/**
 * Simpson Strong-Tie Catalog Service
 * Core engine: product lookup, load checking, holdown sizing,
 * hurricane tie selection, SDC classification, corrosion advisor
 */

const { PRODUCTS, APPLICATIONS, COATINGS, LOAD_DURATION, LRFD } = require('../data/products');

// SDC range checker: "A-F" covers D, "A-C" does not cover D
function sdcCovers(range, target) {
  if (!range || !target) return false;
  const order = 'ABCDEF';
  const t = order.indexOf(target.toUpperCase());
  if (t === -1) return false;
  // Handle formats like "A-F", "A-D", "A-C"
  const match = range.match(/([A-F])\s*[-–]\s*([A-F])/i);
  if (match) {
    const lo = order.indexOf(match[1].toUpperCase());
    const hi = order.indexOf(match[2].toUpperCase());
    return t >= lo && t <= hi;
  }
  // Single letter
  return range.toUpperCase().includes(target.toUpperCase());
}

class CatalogService {

  // ── Product Lookup ──────────────────────────────────────────────
  lookupProduct({ query, category, application, sdc_rating, finish, min_load, load_type }) {
    let results = [...PRODUCTS];

    if (category) results = results.filter(p => p.category === category);
    if (application) results = results.filter(p => (p.applications || []).includes(application));
    if (sdc_rating) results = results.filter(p => p.sdc && sdcCovers(p.sdc, sdc_rating));
    if (finish) results = results.filter(p => (p.finish || []).some(f => f.toLowerCase().includes(finish.toLowerCase())));

    if (min_load && load_type) {
      results = results.filter(p => {
        return Object.values(p.loads || {}).some(ld => {
          const val = ld[load_type] || ld.F_down || ld.tension || ld.shear || ld.uplift || ld.shear_seismic || ld.down || ld.lateral || ld.seat || 0;
          return val >= min_load;
        });
      });
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.model.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.sizes || []).some(s => s.toLowerCase().includes(q)) ||
        (p.codes || []).some(c => c.toLowerCase().includes(q))
      );
    }

    return {
      count: results.length,
      products: results.map(p => ({
        id: p.id,
        model: p.model,
        name: p.name,
        category: p.category,
        description: p.desc,
        gauge: p.gauge,
        finishes: p.finish,
        sizes: p.sizes,
        fasteners: p.fasteners,
        loads: p.loads,
        load_basis: p.load_basis,
        sdc_rating: p.sdc,
        esr_report: p.esr,
        applications: p.applications,
        code_references: p.codes,
        strongtie_url: p.link
      }))
    };
  }

  // ── Load Capacity Check ─────────────────────────────────────────
  checkLoadCapacity({ product_id, model_variant, required_load_lbs, load_type, load_duration }) {
    const product = PRODUCTS.find(p => p.id === product_id || p.model.toLowerCase() === (product_id || '').toLowerCase());
    if (!product) return { error: `Product '${product_id}' not found`, available_ids: PRODUCTS.map(p => p.id) };

    // Find the specific model variant or best match
    let loadData = null;
    let modelKey = null;
    if (model_variant && product.loads[model_variant]) {
      loadData = product.loads[model_variant];
      modelKey = model_variant;
    } else {
      // Find best match
      const entries = Object.entries(product.loads);
      if (entries.length === 0) return { error: `No load data available for ${product.model}. Refer to catalog.` };
      // If model_variant given, fuzzy match
      if (model_variant) {
        const mv = model_variant.toLowerCase();
        const match = entries.find(([k]) => k.toLowerCase().includes(mv));
        if (match) { modelKey = match[0]; loadData = match[1]; }
      }
      if (!loadData) { modelKey = entries[0][0]; loadData = entries[0][1]; }
    }

    // Determine capacity from load data
    const lt = (load_type || '').toLowerCase();
    let capacity = 0;
    if (lt && loadData[lt]) {
      capacity = loadData[lt];
    } else {
      // Auto-detect: try common fields
      capacity = loadData.F_down || loadData.tension || loadData.shear || loadData.uplift
        || loadData.shear_seismic || loadData.down || loadData.lateral || loadData.seat || 0;
    }

    if (!capacity) return { error: `No load value found for '${lt || 'auto'}' in ${modelKey}`, available_load_types: Object.keys(loadData).filter(k => k !== 'note' && k !== 'deflection') };

    const cd = LOAD_DURATION[load_duration]?.cd || 1.60;
    const ratio = required_load_lbs / capacity;
    const pass = ratio <= 1.0;

    return {
      product: product.model,
      model_variant: modelKey,
      catalog_capacity_lbs: capacity,
      load_basis: product.load_basis,
      required_load_lbs,
      demand_capacity_ratio: parseFloat(ratio.toFixed(4)),
      reserve_pct: parseFloat(((1 - ratio) * 100).toFixed(1)),
      verdict: pass ? 'ADEQUATE' : 'UNDERSIZED',
      pass,
      notes: loadData.note || null,
      deflection_in: loadData.deflection || null,
      recommendations: pass
        ? [`Reserve capacity: ${((1-ratio)*100).toFixed(1)}%`, 'Install all specified fasteners in all holes', product.load_basis]
        : [`Select higher-capacity model from ${product.category}`, 'Consider multi-ply or heavy-duty alternatives', 'Verify load path with structural engineer'],
      esr_report: product.esr,
      strongtie_url: product.link
    };
  }

  // ── Holdown Sizing ──────────────────────────────────────────────
  sizeHoldown({ required_uplift_lbs, load_condition, stud_type, sdc }) {
    if (!required_uplift_lbs) return { error: 'required_uplift_lbs is required' };

    const holdowns = PRODUCTS.filter(p => p.category === 'holdowns');
    const candidates = [];

    holdowns.forEach(p => {
      Object.entries(p.loads).forEach(([model, ld]) => {
        if (ld.tension && ld.tension >= required_uplift_lbs) {
          candidates.push({
            product_id: p.id,
            product: p.model,
            model,
            tension_capacity_lbs: ld.tension,
            demand_capacity_ratio: parseFloat((required_uplift_lbs / ld.tension).toFixed(4)),
            reserve_pct: parseFloat(((1 - required_uplift_lbs / ld.tension) * 100).toFixed(1)),
            deflection_in: ld.deflection || null,
            esr_report: p.esr,
            fasteners: p.fasteners,
            sdc_rating: p.sdc,
            anchor_info: p.fasteners,
            strongtie_url: p.link
          });
        }
      });
    });

    candidates.sort((a, b) => b.demand_capacity_ratio - a.demand_capacity_ratio);

    return {
      required_uplift_lbs,
      load_condition: load_condition || 'wind_seismic',
      candidates_found: candidates.length,
      recommendation: candidates[0] || null,
      alternatives: candidates.slice(1, 5),
      notes: candidates.length === 0
        ? 'No standard holdown meets this demand. Consider Strong-Rod Systems or contact Simpson engineering.'
        : `${candidates.length} options found. Top recommendation has ${candidates[0].reserve_pct}% reserve.`
    };
  }

  // ── Hurricane Tie Selection ─────────────────────────────────────
  selectHurricaneTie({ required_uplift_lbs, required_lateral_lbs, lumber_species }) {
    const species = (lumber_species || 'df_sp').toLowerCase();
    const ties = PRODUCTS.filter(p => p.category === 'hurricane_ties');
    const results = [];

    ties.forEach(p => {
      Object.entries(p.loads).forEach(([model, ld]) => {
        const uplift = ld.uplift || 0;
        const lateral = ld.lat_F1 || ld.lateral || 0;
        const speciesMatch = species.includes('spf') || species.includes('hf')
          ? model.toLowerCase().includes('spf')
          : !model.toLowerCase().includes('spf');

        if (uplift >= (required_uplift_lbs || 0) && lateral >= (required_lateral_lbs || 0)) {
          results.push({
            product_id: p.id,
            product: p.model,
            model_variant: model,
            uplift_capacity_lbs: uplift,
            lateral_F1_lbs: ld.lat_F1 || lateral,
            lateral_F2_lbs: ld.lat_F2 || null,
            species_match: speciesMatch,
            gauge: p.gauge,
            esr_report: p.esr,
            fasteners: p.fasteners,
            sdc_rating: p.sdc,
            strongtie_url: p.link
          });
        }
      });
    });

    // Prefer species-matched, then sort by closest fit
    results.sort((a, b) => {
      if (a.species_match !== b.species_match) return b.species_match - a.species_match;
      return a.uplift_capacity_lbs - b.uplift_capacity_lbs;
    });

    return {
      required_uplift_lbs: required_uplift_lbs || 0,
      required_lateral_lbs: required_lateral_lbs || 0,
      lumber_species: lumber_species || 'DF/SP',
      candidates_found: results.length,
      recommendation: results[0] || null,
      alternatives: results.slice(1, 4),
      notes: results.length === 0
        ? 'No single tie meets both requirements. Consider paired connectors or engineered solutions.'
        : `${results.length} options. Best: ${results[0].model_variant} (${results[0].uplift_capacity_lbs} lbs uplift).`
    };
  }

  // ── SDC Classification ──────────────────────────────────────────
  classifySDC({ site_class, Ss, S1, risk_category }) {
    if (!Ss || !S1) return { error: 'Ss and S1 values required (from USGS Seismic Design Maps)' };
    const sc = (site_class || 'D').toUpperCase();
    const rc = (risk_category || 'II').toUpperCase();

    // Site coefficients (ASCE 7-22 Tables 11.4-1/2 simplified + interpolation)
    const FaTable = {A:{0.25:0.8,0.50:0.8,0.75:0.8,1.00:0.8,1.25:0.8,1.50:0.8},B:{0.25:0.9,0.50:0.9,0.75:0.9,1.00:0.9,1.25:0.9,1.50:0.9},C:{0.25:1.3,0.50:1.3,0.75:1.2,1.00:1.2,1.25:1.2,1.50:1.2},D:{0.25:1.6,0.50:1.4,0.75:1.2,1.00:1.1,1.25:1.0,1.50:1.0},E:{0.25:2.4,0.50:1.7,0.75:1.3,1.00:1.1,1.25:0.9,1.50:0.9}};
    const FvTable = {A:{0.1:0.8,0.2:0.8,0.3:0.8,0.4:0.8,0.5:0.8,0.6:0.8},B:{0.1:0.8,0.2:0.8,0.3:0.8,0.4:0.8,0.5:0.8,0.6:0.8},C:{0.1:1.5,0.2:1.5,0.3:1.5,0.4:1.5,0.5:1.5,0.6:1.4},D:{0.1:2.4,0.2:2.2,0.3:2.0,0.4:1.9,0.5:1.8,0.6:1.7},E:{0.1:4.2,0.2:3.3,0.3:2.8,0.4:2.4,0.5:2.2,0.6:2.0}};

    function interp(table, siteClass, val) {
      const row = table[siteClass]; if (!row) return 1.0;
      const keys = Object.keys(row).map(Number).sort((a,b)=>a-b);
      if (val <= keys[0]) return row[keys[0]];
      if (val >= keys[keys.length-1]) return row[keys[keys.length-1]];
      for (let i=0; i<keys.length-1; i++) {
        if (val >= keys[i] && val <= keys[i+1]) {
          const r = (val-keys[i])/(keys[i+1]-keys[i]);
          return row[keys[i]] + r*(row[keys[i+1]]-row[keys[i]]);
        }
      }
      return 1.0;
    }

    const Fa = parseFloat(interp(FaTable, sc, Ss).toFixed(4));
    const Fv = parseFloat(interp(FvTable, sc, S1).toFixed(4));
    const SMS = parseFloat((Fa * Ss).toFixed(4));
    const SM1 = parseFloat((Fv * S1).toFixed(4));
    const SDS = parseFloat(((2/3) * SMS).toFixed(4));
    const SD1 = parseFloat(((2/3) * SM1).toFixed(4));
    const Ie = {I:1.0,II:1.0,III:1.25,IV:1.5}[rc] || 1.0;

    function sdcFrom(val, thresholds, rc) {
      const isIV = rc === 'IV';
      if (val < thresholds[0]) return 'A';
      if (val < thresholds[1]) return isIV ? 'C' : 'B';
      if (val < thresholds[2]) return isIV ? 'D' : 'C';
      return 'D';
    }
    let sdc1 = sdcFrom(SDS, [0.167, 0.33, 0.50], rc);
    let sdc2 = sdcFrom(SD1, [0.067, 0.133, 0.20], rc);
    if (S1 >= 0.75) { sdc1 = rc === 'IV' ? 'F' : 'E'; sdc2 = sdc1; }
    const sdc = sdc1 > sdc2 ? sdc1 : sdc2;

    // Products rated for this SDC
    const rated = PRODUCTS.filter(p => p.sdc && sdcCovers(p.sdc, sdc)).map(p => ({ id:p.id, model:p.model, name:p.name, sdc_rating:p.sdc }));

    return {
      classification: sdc,
      site_class: sc,
      risk_category: rc,
      Ss, S1, Fa, Fv, SMS, SM1, SDS, SD1, Ie,
      sdc_from_SDS: sdc1,
      sdc_from_SD1: sdc2,
      governing: sdc1 > sdc2 ? 'SDS' : 'SD1',
      special_inspection_required: ['D','E','F'].includes(sdc),
      holdowns_required_at_shearwalls: ['D','E','F'].includes(sdc),
      products_rated_for_sdc: rated.length,
      sample_products: rated.slice(0, 10),
      reference: "ASCE 7-22 Tables 11.4-1, 11.4-2, 11.6-1, 11.6-2"
    };
  }

  // ── Corrosion/Coating Advisor ───────────────────────────────────
  adviseCorrision({ environment, lumber_treatment, exposure }) {
    const env = (environment || '').toLowerCase();
    const treatment = (lumber_treatment || '').toLowerCase();

    let recommended = 'G90';
    let reason = 'Standard interior/dry exterior';

    if (treatment.includes('acq') || treatment.includes('ca-c') || treatment.includes('mca') || treatment.includes('treated')) {
      recommended = 'ZMAX';
      reason = 'Required for preservative-treated lumber contact (ACQ/CA-C/MCA)';
    }
    if (env.includes('marine') || env.includes('coastal') || env.includes('salt')) {
      recommended = 'SS';
      reason = 'Marine/coastal environment requires stainless steel';
    }
    if (env.includes('industrial') || env.includes('severe')) {
      recommended = 'HDG';
      reason = 'Severe industrial environment — maximum zinc protection';
    }
    if (treatment.includes('cca') && env.includes('marine')) {
      recommended = 'SS';
      reason = 'CCA + marine = stainless steel required';
    }

    return {
      recommended_finish: recommended,
      finish_details: COATINGS[recommended],
      reason,
      all_finishes: COATINGS,
      treated_lumber_rules: {
        'ACQ/CA-C/MCA': 'ZMAX, HDG, or SS connectors + hot-dip galvanized nails (ASTM A153)',
        'CCA': 'G90 acceptable at low preservative levels; verify with treater',
        'Fire-retardant': 'Contact Simpson or lumber treater',
        'Borate': 'G90 acceptable (interior only, low-corrosion)',
        'Untreated': 'G90 standard'
      },
      nail_requirement: recommended !== 'G90' ? 'Hot-dip galvanized nails per ASTM A153' : 'Standard nails per ASTM F1667'
    };
  }

  // ── Application Product Filter ──────────────────────────────────
  getProductsByApplication({ application }) {
    if (!application) return { error: 'application required', available: Object.keys(APPLICATIONS) };
    const app = APPLICATIONS[application];
    if (!app) return { error: `Unknown application '${application}'`, available: Object.keys(APPLICATIONS) };

    const products = PRODUCTS.filter(p => (p.applications || []).includes(application));
    return {
      application,
      application_name: app.name,
      description: app.desc,
      product_count: products.length,
      products: products.map(p => ({
        id: p.id, model: p.model, name: p.name, category: p.category,
        sdc_rating: p.sdc, esr: p.esr, top_load: Object.entries(p.loads)[0] || null
      }))
    };
  }

  // ── Code Reference Lookup ───────────────────────────────────────
  lookupCode({ code_section }) {
    const section = (code_section || '').toLowerCase();
    const refs = [];
    PRODUCTS.forEach(p => {
      (p.codes || []).forEach(c => {
        if (c.toLowerCase().includes(section)) {
          refs.push({ code_section: c, product: p.model, product_id: p.id, category: p.category });
        }
      });
    });
    return {
      query: code_section,
      references_found: refs.length,
      references: refs,
      supported_codes: ['IBC 2021','IRC 2021','ASCE 7-22','NDS 2024','SDPWS 2021','FBC 2023','TPI 1-2014']
    };
  }

  // ── Full Catalog Stats ──────────────────────────────────────────
  getCatalogStats() {
    const categories = [...new Set(PRODUCTS.map(p => p.category))];
    let totalModels = 0;
    PRODUCTS.forEach(p => { totalModels += Math.max(Object.keys(p.loads).length, 1); });
    return {
      catalog: 'Simpson Strong-Tie C-C-2024',
      methodology: 'ASD (Allowable Stress Design)',
      safety_factor: 3,
      deflection_limit: '1/8 inch',
      product_families: PRODUCTS.length,
      categories: categories.length,
      total_models: totalModels,
      esr_reports: '60+',
      code_editions: { IBC:['2012-2024'], IRC:['2012-2024'], ASCE_7:['7-16','7-22'], NDS:['2018','2024'], SDPWS:['2015','2021'] },
      sdc_coverage: 'A through F',
      load_duration_factors: LOAD_DURATION,
      lrfd_multipliers: LRFD,
      applications: Object.keys(APPLICATIONS),
      categories_list: categories
    };
  }
}

module.exports = new CatalogService();
