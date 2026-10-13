import { supabase } from './supabase';
import { odooSupabase } from './odooSupabase';
import type { 
  OdooSyncSummary, 
  OdooQualityAlert, 
  OdooQualityPpmMetric, 
  OdooWorkCenterQuality, 
  OdooDefectPareto, 
  OdooQualityDetailRecord 
} from '../types/qms';

const ODOO_QUALITY_STORAGE_KEY = 'qc_odoo_quality_records_v3';

// Purge any legacy starter mock records from previous sessions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('qc_odoo_quality_records_v1');
    localStorage.removeItem('qc_odoo_quality_records_v2');
    localStorage.removeItem('qc_odoo_config');
  }
} catch {
  // Ignore in SSR / non-browser environments
}

export function getStoredQualityRecords(): OdooQualityDetailRecord[] {
  try {
    const raw = localStorage.getItem(ODOO_QUALITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredQualityRecords(records: OdooQualityDetailRecord[]): void {
  try {
    localStorage.setItem(ODOO_QUALITY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save quality records to localStorage:', err);
  }
}

/**
 * Calculate Monthly PPM Trends dynamically from records
 */
export function calculatePpmMonthlyTrends(records: OdooQualityDetailRecord[]): OdooQualityPpmMetric[] {
  if (!records || records.length === 0) {
    return [];
  }

  const monthlyBuckets: { [month: string]: { units: number; defective: number; scrap: number; targetPpm: number } } = {};

  records.forEach((r) => {
    const ym = (r.date || new Date().toISOString()).slice(0, 7);
    if (!monthlyBuckets[ym]) {
      monthlyBuckets[ym] = { units: 0, defective: 0, scrap: 0, targetPpm: 150 };
    }
    monthlyBuckets[ym].units += (r.quantity_inspected || 0);
    monthlyBuckets[ym].defective += (r.quantity_rejected || 0);
    monthlyBuckets[ym].scrap += (r.scrap_cost || 0);
  });

  return Object.entries(monthlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => {
      const units = data.units;
      const ppm = units > 0 ? Math.round((data.defective / units) * 1000000) : 0;
      const fpy = units > 0 ? Number((((units - data.defective) / units) * 100).toFixed(2)) : 100.0;
      const scrapPct = units > 0 ? Number(((data.scrap / (units * 14.50)) * 100).toFixed(2)) : 0;

      return {
        period,
        total_units: data.units,
        defective_units: data.defective,
        ppm,
        target_ppm: data.targetPpm,
        fpy_percentage: fpy,
        scrap_dollars: data.scrap,
        scrap_percentage: scrapPct,
      };
    });
}

/**
 * Calculate Pareto Distribution of Defect Types from real records
 */
export function calculateDefectPareto(records: OdooQualityDetailRecord[]): OdooDefectPareto[] {
  if (!records || records.length === 0) {
    return [];
  }

  const reasonMap = new Map<string, { count: number; cost: number }>();

  records.forEach((r) => {
    const key = (r.defect_type || 'Unspecified Defect').split('>')[0].split('(')[0].trim();
    const curr = reasonMap.get(key) || { count: 0, cost: 0 };
    curr.count += (r.quantity_rejected || 1);
    curr.cost += (r.scrap_cost || 0);
    reasonMap.set(key, curr);
  });

  const totalDefects = Array.from(reasonMap.values()).reduce((sum, item) => sum + item.count, 0);
  if (totalDefects === 0) return [];

  const sorted = Array.from(reasonMap.entries())
    .map(([reason, stats]) => ({
      reason,
      count: stats.count,
      cost_impact: stats.cost,
      percentage: Number(((stats.count / totalDefects) * 100).toFixed(1)),
      cumulative_percentage: 0,
    }))
    .sort((a, b) => b.count - a.count);

  let runSum = 0;
  sorted.forEach((item) => {
    runSum += item.percentage;
    item.cumulative_percentage = Number(Math.min(100, runSum).toFixed(1));
  });

  return sorted;
}

/**
 * Calculate Work Center Quality Performance from real records
 */
export function calculateWorkCenterQuality(records: OdooQualityDetailRecord[]): OdooWorkCenterQuality[] {
  if (!records || records.length === 0) {
    return [];
  }

  const centers: Record<string, { total: number; def: number; cost: number; defectsMap: Record<string, number> }> = {};

  records.forEach((r) => {
    const wc = r.workcenter || 'GENERAL';
    if (!centers[wc]) {
      centers[wc] = { total: 0, def: 0, cost: 0, defectsMap: {} };
    }
    centers[wc].total += (r.quantity_inspected || 0);
    centers[wc].def += (r.quantity_rejected || 0);
    centers[wc].cost += (r.scrap_cost || 0);

    const d = r.defect_type || 'General';
    centers[wc].defectsMap[d] = (centers[wc].defectsMap[d] || 0) + (r.quantity_rejected || 1);
  });

  return Object.entries(centers).map(([name, data]) => {
    const topDefect = Object.entries(data.defectsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    const total = data.total || 1;
    return {
      workcenter_name: name,
      total_units: data.total,
      defective_units: data.def,
      ppm: Math.round((data.def / total) * 1000000),
      scrap_cost: data.cost,
      primary_defect: topDefect,
    };
  }).sort((a, b) => b.ppm - a.ppm);
}

/**
 * Fetch Full Odoo Quality & PPM Performance Summary from Supabase
 * Directly queries tables populated by the hourly GitHub Actions sync pipeline.
 */
export async function fetchFullOdooQualitySummary(): Promise<OdooSyncSummary> {
  const db = supabase as any;
  let records: OdooQualityDetailRecord[] = [];
  let ppmMonthlyTrends: OdooQualityPpmMetric[] = [];
  let pareto: OdooDefectPareto[] = [];
  let workcenters: OdooWorkCenterQuality[] = [];
  let lastSyncTimeStr = 'Hourly via GitHub Actions (Awaiting first run)';
  let isLiveConnected = false;

  // 1. Check connection to Supabase and query synced tables
  try {
    const { data: dbRecords, error: recError } = await db
      .from('odoo_quality_records')
      .select('*')
      .order('date', { ascending: false })
      .limit(500);

    if (!recError && dbRecords && dbRecords.length > 0) {
      records = dbRecords.map((r: any) => ({
        id: r.id,
        alert_code: r.alert_code,
        product_sku: r.product_sku,
        product_name: r.product_name,
        customer_name: r.customer_name || 'NHIMM Customer',
        workcenter: r.workcenter || 'SHOPFLOOR',
        lot_number: r.lot_number || 'LOT-SYNCED',
        work_order: r.work_order || 'WO-SYNCED',
        defect_type: r.defect_type,
        quantity_inspected: Number(r.quantity_inspected || 0),
        quantity_rejected: Number(r.quantity_rejected || 0),
        calculated_ppm: Number(r.calculated_ppm || 0),
        scrap_cost: Number(r.scrap_cost || 0),
        date: r.date,
        stage: r.stage || 'New',
        is_quarantined_mrb: Boolean(r.is_quarantined_mrb),
        notes: r.notes || '',
      }));
    }

    // Query pre-aggregated monthly metrics if present
    const { data: dbPpm } = await db
      .from('odoo_quality_ppm_metrics')
      .select('*')
      .order('period', { ascending: true });
    
    if (dbPpm && dbPpm.length > 0) {
      ppmMonthlyTrends = dbPpm;
    }

    // Query pre-aggregated pareto if present
    const { data: dbPareto } = await db
      .from('odoo_quality_defect_pareto')
      .select('*')
      .order('count', { ascending: false });

    if (dbPareto && dbPareto.length > 0) {
      pareto = dbPareto;
    }

    // Query pre-aggregated workcenters if present
    const { data: dbWc } = await db
      .from('odoo_quality_workcenters')
      .select('*')
      .order('ppm', { ascending: false });

    if (dbWc && dbWc.length > 0) {
      workcenters = dbWc;
    }

    // Query latest sync log
    const { data: logData } = await db
      .from('odoo_quality_sync_logs')
      .select('*')
      .order('sync_timestamp', { ascending: false })
      .limit(1);

    if (logData && logData.length > 0) {
      const latest = logData[0];
      const dt = new Date(latest.sync_timestamp);
      lastSyncTimeStr = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${latest.status})`;
      isLiveConnected = latest.status === 'SUCCESS';
    }
  } catch (err) {
    console.warn('Notice querying odoo_quality_* tables from Supabase:', err);
  }

  // 2. Also check if local storage has any user-entered records (if user manually logged a discrepancy)
  const localRecords = getStoredQualityRecords();
  if (localRecords.length > 0) {
    const existingIds = new Set(records.map(r => r.id));
    localRecords.forEach(lr => {
      if (!existingIds.has(lr.id)) {
        records.push(lr);
      }
    });
  }

  // 3. Fallback calculation if pre-aggregated tables were empty but records exist
  if (ppmMonthlyTrends.length === 0 && records.length > 0) {
    ppmMonthlyTrends = calculatePpmMonthlyTrends(records);
  }
  if (pareto.length === 0 && records.length > 0) {
    pareto = calculateDefectPareto(records);
  }
  if (workcenters.length === 0 && records.length > 0) {
    workcenters = calculateWorkCenterQuality(records);
  }

  // Calculate top-line metrics from actual data
  const currentMonthMetric = ppmMonthlyTrends[ppmMonthlyTrends.length - 1];
  const overallPpm = currentMonthMetric?.ppm ?? 0;
  const targetPpm = currentMonthMetric?.target_ppm ?? 150;
  const fpy = currentMonthMetric?.fpy_percentage ?? 100.0;

  const openAlerts = records.filter(r => r.stage !== 'Resolved');
  const mrbLots = records.filter(r => r.is_quarantined_mrb);
  const scrapYtd = ppmMonthlyTrends.reduce((sum, m) => sum + (m.scrap_dollars || 0), 0);

  const alerts: OdooQualityAlert[] = records.map(r => ({
    id: r.id,
    alert_code: r.alert_code,
    product_name: r.product_name,
    lot_number: r.lot_number,
    work_order: r.work_order,
    reason: r.defect_type,
    stage: r.stage,
    cost_impact: r.scrap_cost,
    date: r.date,
  }));

  // Also check if Odoo Pulse connection is alive
  if (!isLiveConnected) {
    try {
      const { count } = await odooSupabase
        .from('odoo_sale_orders')
        .select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        isLiveConnected = true;
      }
    } catch {
      // Ignored
    }
  }

  return {
    scrap_ytd: scrapYtd,
    scrap_target: 35000.00,
    open_quality_alerts: openAlerts.length,
    mrb_quarantined_lots: mrbLots.length,
    supplier_rma_cost: 0,
    last_synced_at: lastSyncTimeStr,
    connection_status: isLiveConnected ? 'CONNECTED' : 'DISCONNECTED',
    overall_ppm: overallPpm,
    target_ppm: targetPpm,
    fpy_percentage: fpy,
    mo_pieces_produced: currentMonthMetric?.mo_pieces_produced ?? 0,
    mo_scrap_qty: currentMonthMetric?.mo_scrap_qty ?? 0,
    mo_scrap_ppm: currentMonthMetric?.mo_scrap_ppm ?? 0,
    fg_make_sold_12m: currentMonthMetric?.fg_make_sold_12m ?? 0,
    fg_make_returned_12m: currentMonthMetric?.fg_make_returned_12m ?? 0,
    fg_make_ppm: currentMonthMetric?.fg_make_ppm ?? 0,
    fg_buy_sold_12m: currentMonthMetric?.fg_buy_sold_12m ?? 0,
    fg_buy_returned_12m: currentMonthMetric?.fg_buy_returned_12m ?? 0,
    fg_buy_ppm: currentMonthMetric?.fg_buy_ppm ?? 0,
    fg_total_sold_12m: currentMonthMetric?.fg_total_sold_12m ?? 0,
    fg_total_returned_12m: currentMonthMetric?.fg_total_returned_12m ?? 0,
    fg_total_ppm: currentMonthMetric?.fg_total_ppm ?? 0,
    recent_alerts: alerts,
    ppm_monthly_trends: ppmMonthlyTrends,
    defect_pareto: pareto,
    workcenter_performance: workcenters,
    quality_records: records,
  };
}

/**
 * Add or Log a new Odoo Quality Record (persists to local storage & Supabase)
 */
export async function addOdooQualityRecord(record: Partial<OdooQualityDetailRecord>): Promise<OdooQualityDetailRecord> {
  const current = getStoredQualityRecords();
  const newRec: OdooQualityDetailRecord = {
    id: `rec-${Date.now()}`,
    alert_code: record.alert_code || `QA-ALERT-${Math.floor(4100 + Math.random() * 900)}`,
    product_sku: record.product_sku || 'SKU-NEW',
    product_name: record.product_name || 'Machined Component',
    customer_name: record.customer_name || 'NHIMM Customer',
    workcenter: record.workcenter || 'CNC_LATHE_01',
    lot_number: record.lot_number || `LOT-${Date.now().toString().slice(-4)}`,
    work_order: record.work_order || `WO-${Date.now().toString().slice(-5)}`,
    defect_type: record.defect_type || 'Dimensional Non-Conformance',
    quantity_inspected: Number(record.quantity_inspected) || 1000,
    quantity_rejected: Number(record.quantity_rejected) || 1,
    calculated_ppm: Math.round(((Number(record.quantity_rejected) || 1) / (Number(record.quantity_inspected) || 1000)) * 1000000),
    scrap_cost: Number(record.scrap_cost) || 0,
    date: record.date || new Date().toISOString().slice(0, 10),
    stage: record.stage || 'New',
    is_quarantined_mrb: Boolean(record.is_quarantined_mrb),
    notes: record.notes || '',
  };

  const updated = [newRec, ...current];
  saveStoredQualityRecords(updated);

  // Attempt to write to Supabase table if accessible
  try {
    const db = supabase as any;
    await db.from('odoo_quality_records').insert([newRec]);
  } catch (err) {
    console.warn('Notice saving record to Supabase:', err);
  }

  return newRec;
}

/**
 * Update stage of a quality record
 */
export async function updateQualityRecordStage(
  recordId: string, 
  stage: 'New' | 'Confirmed' | 'Action Proposed' | 'Resolved',
  isQuarantined?: boolean
): Promise<void> {
  const current = getStoredQualityRecords();
  const updated = current.map(r => r.id === recordId ? { 
    ...r, 
    stage, 
    ...(isQuarantined !== undefined ? { is_quarantined_mrb: isQuarantined } : {}) 
  } : r);
  saveStoredQualityRecords(updated);

  try {
    const db = supabase as any;
    const payload: any = { stage };
    if (isQuarantined !== undefined) payload.is_quarantined_mrb = isQuarantined;
    await db.from('odoo_quality_records').update(payload).eq('id', recordId);
  } catch (err) {
    console.warn('Notice updating stage in Supabase:', err);
  }
}
