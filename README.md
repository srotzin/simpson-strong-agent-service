# Simpson Strong-Tie Strong Agent

**Agent-to-Agent MCP + REST Service — No Human UI**

Complete Simpson Strong-Tie structural connector catalog (C-C-2024) exposed as a headless service. Agents call it, agents pay for it, agents get engineering answers.

## Endpoints

| Endpoint | Protocol | Description |
|---|---|---|
| `POST /mcp` | JSON-RPC 2.0 | MCP tool interface (9 tools) |
| `/v1/api/*` | REST | Direct HTTP endpoints |
| `/health` | GET | Service health (free) |
| `/.well-known/simpson-agent.json` | GET | Agent discovery (free) |
| `/.well-known/hive-payments.json` | GET | Payment pricing (free) |

## MCP Tools

| Tool | Description | Price |
|---|---|---|
| `simpson_product_lookup` | Search 35+ families, 400+ models | $0.01 |
| `simpson_check_load` | Verify connector meets required load (ASD) | $0.02 |
| `simpson_size_holdown` | Size holdown for uplift requirements | $0.03 |
| `simpson_select_hurricane_tie` | Match hurricane tie to uplift/lateral | $0.02 |
| `simpson_classify_sdc` | ASCE 7-22 Seismic Design Category classifier | $0.03 |
| `simpson_corrosion_advisor` | Coating selection for environment/lumber | $0.01 |
| `simpson_products_by_application` | Filter by construction application | $0.01 |
| `simpson_code_reference` | Code section → product mapping | $0.01 |
| `simpson_catalog_stats` | Catalog summary statistics | Free |

## Payment

x402 protocol — USDC on Base L2. Include `X-Payment-Hash` header with transaction hash after sending payment.

Internal Hive services: use `X-API-Key` header.

## Catalog Coverage

- **Source**: Simpson Strong-Tie C-C-2024
- **Methodology**: ASD (Allowable Stress Design), Safety Factor 3
- **Codes**: IBC 2012-2024, IRC 2012-2024, ASCE 7-16/7-22, NDS 2018/2024, SDPWS 2015/2021
- **SDC**: A through F
- **ESR Reports**: 60+
- **Categories**: Joist Hangers, Hurricane Ties, Straps, Post Bases, Angles, Holdowns, Shearwalls, Anchors, Fasteners, Truss, Deck, Ridge, Concealed

## Hive Ecosystem

- **Agent**: Atlas-Construction-Pro (engineering species)
- **Genome**: gen_1a46aebe0037
- **DID**: did:hive:1463515c-e7b9-46cc-8079-46df92a6a241
- **Forge**: HiveForge
