import type { OdooConfig, OdooSyncSummary, OdooQualityAlert } from '../types/qms';

const ODOO_CONFIG_STORAGE_KEY = 'qc_odoo_config';

export const DEFAULT_ODOO_CONFIG: OdooConfig = {
  url: 'https://odoo.qualitycompass-enterprise.com',
  database: 'qc_production_v18',
  username: 'admin@qualitycompass.internal',
  apiKey: 'odoo_sec_99a8b72c4e019f8a84',
  autoSyncIntervalMinutes: 15,
  syncShopfloorScrap: true,
  syncQualityAlerts: true,
  syncMrbLots: true,
};

export const INITIAL_ODOO_ALERTS: OdooQualityAlert[] = [
  {
    id: 'odoo-qa-1',
    alert_code: 'QA-ALERT-4091',
    product_name: 'Single V-Pulley 6061-T6 (DWG-2026-002)',
    lot_number: 'LOT-2026-03-PL98',
    work_order: 'WH/MO/2026/00481',
    reason: 'Bore diameter runout > 0.015mm on CNC Lathe #2',
    stage: 'Action Proposed',
    cost_impact: 3450.00,
    date: '2026-03-02',
  },
  {
    id: 'odoo-qa-2',
    alert_code: 'QA-ALERT-4088',
    product_name: 'Mounting Flange Anodized (DWG-2026-001)',
    lot_number: 'LOT-2026-02-FL12',
    work_order: 'WH/MO/2026/00412',
    reason: 'Surface finish roughness Ra 3.8um (Max Ra 3.2um allowable)',
    stage: 'Confirmed',
    cost_impact: 1820.00,
    date: '2026-02-28',
  },
  {
    id: 'odoo-qa-3',
    alert_code: 'QA-ALERT-4074',
    product_name: 'Custom Hex Standoff M8 Stainless 304',
    lot_number: 'LOT-2026-02-HEX04',
    work_order: 'WH/MO/2026/00389',
    reason: 'Thread pitch diameter out of tolerance on first 100 pcs',
    stage: 'Resolved',
    cost_impact: 640.00,
    date: '2026-02-14',
  },
  {
    id: 'odoo-qa-4',
    alert_code: 'QA-ALERT-4062',
    product_name: 'Bearing Housing Extrusion 7075-T6',
    lot_number: 'LOT-2026-01-BH90',
    work_order: 'WH/MO/2026/00311',
    reason: 'Supplier raw bar stock hardness HRC 28 (Spec requires HRC 32-36)',
    stage: 'Resolved',
    cost_impact: 6540.00,
    date: '2026-01-28',
  },
];

export function getStoredOdooConfig(): OdooConfig {
  try {
    const raw = localStorage.getItem(ODOO_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ODOO_CONFIG;
  } catch {
    return DEFAULT_ODOO_CONFIG;
  }
}

export function saveStoredOdooConfig(config: OdooConfig): void {
  localStorage.setItem(ODOO_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export async function testOdooConnection(config: OdooConfig): Promise<{ success: boolean; message: string; version?: string }> {
  // Simulate network round-trip to Odoo JSON-RPC endpoint
  await new Promise((res) => setTimeout(res, 900));
  
  if (!config.url || !config.database || !config.apiKey) {
    return {
      success: false,
      message: 'Odoo endpoint, database name, and API Key are required.',
    };
  }

  return {
    success: true,
    message: `Connected successfully to Odoo Server [${config.database}] at ${config.url}`,
    version: 'Odoo Enterprise 18.0+e (Manufacturing & Quality Suite)',
  };
}

export async function fetchOdooSummaryData(): Promise<OdooSyncSummary> {
  // Simulate real-time fetch from Odoo inventory.scrap, quality.alert, and stock.production.lot
  await new Promise((res) => setTimeout(res, 400));

  return {
    scrap_ytd: 12450.00,
    scrap_target: 20000.00,
    open_quality_alerts: 2,
    mrb_quarantined_lots: 3,
    supplier_rma_cost: 6540.00,
    last_synced_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    connection_status: 'CONNECTED',
    recent_alerts: INITIAL_ODOO_ALERTS,
  };
}
