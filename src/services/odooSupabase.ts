import { createClient } from '@supabase/supabase-js';

// Configuration for NHIMM_Pulse (Odoo Production Database sync project)
const ODOO_SUPABASE_URL =
  import.meta.env.VITE_ODOO_SUPABASE_URL || 'https://vrsbfjiafjrbwbyullkh.supabase.co';
const ODOO_SUPABASE_ANON_KEY =
  import.meta.env.VITE_ODOO_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc2JmamlhZmpyYndieXVsbGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjE3MDIsImV4cCI6MjEwMjYzNzcwMn0.IKtsme_0Xz9BiWhG3yUfHLo8JWz7txlq-fwTnq3VTOs';

export const odooSupabase = createClient(ODOO_SUPABASE_URL, ODOO_SUPABASE_ANON_KEY);

export interface OdooCustomer {
  name: string;
  orderCount?: number;
  partCount?: number;
}

export interface OdooPartProduct {
  sku: string;
  name: string;
  description?: string;
  partnerName?: string;
  companyName?: string;
}

export interface OdooBomOperation {
  id: number;
  productSku: string;
  productName: string;
  operationName: string;
  workcenterName: string;
  sequence: number;
  timeCycleMinutes: number;
}

// In-memory caching for snappy autocomplete responsiveness
let cachedCustomers: OdooCustomer[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the Odoo Supabase connection is healthy
 */
export async function checkOdooConnection(): Promise<{ connected: boolean; message?: string }> {
  try {
    const { count, error } = await odooSupabase
      .from('odoo_sale_orders')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { connected: false, message: error.message };
    }
    return { connected: true, message: `Connected to Odoo (${count || 0} active orders)` };
  } catch (err) {
    return { connected: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch distinct B2B customers from Odoo sale order lines
 */
export async function fetchOdooCustomers(forceRefresh = false): Promise<OdooCustomer[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCustomers && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedCustomers;
  }

  try {
    const { data, error } = await odooSupabase
      .from('odoo_sale_order_lines')
      .select('partner_name, product_sku')
      .not('partner_name', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Error fetching Odoo customers:', error);
      return cachedCustomers || [];
    }

    const map = new Map<string, { orderCount: number; partSkus: Set<string> }>();

    for (const row of data || []) {
      const pName = row.partner_name?.trim();
      if (!pName) continue;

      const existing = map.get(pName) || { orderCount: 0, partSkus: new Set() };
      existing.orderCount++;
      if (row.product_sku) {
        existing.partSkus.add(row.product_sku);
      }
      map.set(pName, existing);
    }

    const customers: OdooCustomer[] = Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        orderCount: stats.orderCount,
        partCount: stats.partSkus.size,
      }))
      .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));

    cachedCustomers = customers;
    lastCacheTime = now;
    return customers;
  } catch (err) {
    console.error('Exception fetching Odoo customers:', err);
    return cachedCustomers || [];
  }
}

/**
 * Fetch parts from Odoo, optionally filtered by customer
 */
export async function fetchOdooParts(customerFilter?: string): Promise<OdooPartProduct[]> {
  try {
    let query = odooSupabase
      .from('odoo_sale_order_lines')
      .select('product_sku, product_name, description, partner_name, company_name')
      .not('product_sku', 'is', null);

    if (customerFilter && customerFilter.trim()) {
      query = query.ilike('partner_name', `%${customerFilter.trim()}%`);
    }

    const { data, error } = await query.limit(2000);

    if (error) {
      console.error('Error fetching Odoo parts:', error);
      return [];
    }

    // Deduplicate by SKU
    const skuMap = new Map<string, OdooPartProduct>();
    for (const r of data || []) {
      const sku = r.product_sku?.trim();
      if (!sku) continue;

      if (!skuMap.has(sku)) {
        skuMap.set(sku, {
          sku,
          name: r.product_name || sku,
          description: r.description || '',
          partnerName: r.partner_name || '',
          companyName: r.company_name || 'NHI',
        });
      }
    }

    return Array.from(skuMap.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  } catch (err) {
    console.error('Exception fetching Odoo parts:', err);
    return [];
  }
}

/**
 * Search parts by keyword across SKU, name, or description
 */
export async function searchOdooParts(queryText: string, customerFilter?: string): Promise<OdooPartProduct[]> {
  const parts = await fetchOdooParts(customerFilter);
  if (!queryText.trim()) return parts.slice(0, 50);

  const q = queryText.toLowerCase().trim();
  return parts
    .filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    )
    .slice(0, 50);
}

/**
 * Fetch manufacturing operations from odoo_bom_operations for a given part SKU
 */
export async function fetchOdooBomOperations(productSku: string): Promise<OdooBomOperation[]> {
  try {
    const cleanSku = productSku.trim();
    const { data, error } = await odooSupabase
      .from('odoo_bom_operations')
      .select('id, product_sku, product_name, operation_name, workcenter_name, sequence, time_cycle_minutes')
      .ilike('product_sku', cleanSku)
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error fetching Odoo BOM operations:', error);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      productSku: b.product_sku,
      productName: b.product_name,
      operationName: b.operation_name,
      workcenterName: b.workcenter_name,
      sequence: b.sequence,
      timeCycleMinutes: Number(b.time_cycle_minutes) || 0,
    }));
  } catch (err) {
    console.error('Exception fetching Odoo BOM operations:', err);
    return [];
  }
}
