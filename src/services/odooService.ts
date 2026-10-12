import type { OdooConfig, OdooSyncSummary, OdooQualityAlert } from '../types/qms';
import { supabase } from './supabase';
import { fetchFullOdooQualitySummary } from './odooQualityService';

const ODOO_CONFIG_STORAGE_KEY = 'qc_odoo_config_v2';

// Clean default configuration without storing credentials in frontend
export const DEFAULT_ODOO_CONFIG: OdooConfig = {
  url: '',
  database: '',
  username: '',
  apiKey: '',
  autoSyncIntervalMinutes: 60,
  syncShopfloorScrap: true,
  syncQualityAlerts: true,
  syncMrbLots: true,
};

// No starter dummy alerts
export const INITIAL_ODOO_ALERTS: OdooQualityAlert[] = [];

export function getStoredOdooConfig(): OdooConfig {
  try {
    const raw = localStorage.getItem(ODOO_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ODOO_CONFIG;
  } catch {
    return DEFAULT_ODOO_CONFIG;
  }
}

export function saveStoredOdooConfig(config: OdooConfig): void {
  try {
    localStorage.setItem(ODOO_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore in private browsing mode
  }
}

/**
 * Fetch the latest execution log from the automated hourly GitHub Actions sync pipeline
 */
export async function fetchLatestSyncLog(): Promise<{
  timestamp: string;
  status: string;
  recordsSynced: number;
  durationSeconds: number;
  message: string;
} | null> {
  try {
    const db = supabase as any;
    const { data, error } = await db
      .from('odoo_quality_sync_logs')
      .select('*')
      .order('sync_timestamp', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      timestamp: row.sync_timestamp,
      status: row.status,
      recordsSynced: row.records_synced || 0,
      durationSeconds: row.duration_seconds || 0,
      message: row.message || '',
    };
  } catch {
    return null;
  }
}

/**
 * High-level coordinator fetching quality performance summary from Supabase
 */
export async function fetchOdooSummaryData(): Promise<OdooSyncSummary> {
  return await fetchFullOdooQualitySummary();
}
