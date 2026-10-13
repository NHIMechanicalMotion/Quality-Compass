#!/usr/bin/env python3
"""
Odoo Quality Telemetry to Supabase Sync Pipeline
NHI Mechanical Motion LLC (NHIMM)

Runs hourly via GitHub Actions (.github/workflows/odoo_quality_sync.yml)
to synchronize quality checks, quality alerts, scrap records, and work center
telemetry from Odoo ERP into the Quality Compass Supabase database.

Zero credentials are stored in the frontend app. Authentication relies strictly
on GitHub Secrets:
  - ODOO_URL
  - ODOO_DB
  - ODOO_USER (or ODOO_USERNAME)
  - ODOO_API_KEY (or ODOO_PASSWORD)
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import time
import xmlrpc.client
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, urlunparse

try:
    from supabase import create_client, Client
except ImportError:
    print("Warning: supabase library not installed. Install via: pip install supabase")
    create_client = None

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ============================================================================
# 1. SECRET LOADING & CONNECTION HELPERS
# ============================================================================

def load_dotenv():
    """Look for .env in current dir, script dir, parent dir, or /opt/quality-compass/.env"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(script_dir, ".env"),
        os.path.join(script_dir, "..", ".env"),
        "/opt/quality-compass/.env",
        "/opt/quality-compass/scripts/.env",
    ]
    for env_path in candidates:
        if os.path.isfile(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip()
                        if len(val) >= 2 and val[0] == val[-1] and val[0] in {'"', "'"}:
                            val = val[1:-1]
                        if key and key not in os.environ:
                            os.environ[key] = val
                print(f"[config] Loaded environment credentials from: {env_path}")
                break
            except Exception as e:
                print(f"[config] Warning: Failed to read {env_path}: {e}")

load_dotenv()


def _env(name: str) -> str:
    """Read an environment variable, stripping surrounding quotes and whitespace."""
    value = (os.environ.get(name) or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1].strip()
    return value


def _env_any(*names: str) -> str:
    for name in names:
        val = _env(name)
        if val:
            return val
    return ""


def db_from_odoo_url(url: str) -> str:
    """Infer database name from subdomain if hosted on odoo.com."""
    try:
        host = (urlparse(url).hostname or "").lower()
        first = host.split(".")[0] if host else ""
        if first and first not in {"www", "www2", "odoo"}:
            return first
    except Exception:
        pass
    return ""


def normalize_odoo_url(url: str) -> str:
    """Fix common hostname typos and strip trailing slashes."""
    text = (url or "").strip().rstrip("/")
    if not text:
        return ""
    parsed = urlparse(text if "://" in text else f"https://{text}")
    host = (parsed.hostname or "").lower()
    aliases = {"odoo.nhi.mfg.com": "odoo.nhi-mfg.com"}
    if host in aliases:
        netloc = aliases[host]
        if parsed.port:
            netloc = f"{netloc}:{parsed.port}"
        parsed = parsed._replace(netloc=netloc)
        text = urlunparse(parsed).rstrip("/")
    return text


def load_odoo_secrets():
    """Load Odoo XML-RPC secrets matching the odoo-ops-dashboard format."""
    url = normalize_odoo_url(_env("ODOO_URL"))
    user = _env_any("ODOO_USER", "ODOO_USERNAME", "ODOO_LOGIN")
    password = _env_any("ODOO_API_KEY", "ODOO_PASSWORD")
    db = _env("ODOO_DB") or db_from_odoo_url(url)
    missing = [
        name
        for name, value in (
            ("ODOO_URL", url),
            ("ODOO_DB", db),
            ("ODOO_USER / ODOO_USERNAME", user),
            ("ODOO_API_KEY / ODOO_PASSWORD", password),
        )
        if not value
    ]
    return url, db, user, password, missing


def connect_odoo(url: str, db: str, user: str, password: str):
    """Authenticate with Odoo XML-RPC and return (uid, models, version, db)."""
    url = url.rstrip("/")
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
    try:
        version = common.version()
    except Exception as exc:
        raise RuntimeError(f"Cannot reach Odoo XML-RPC at {url}: {exc}") from exc

    series = version.get("server_serie") or version.get("server_version") or "?"
    db_candidates = [db]
    inferred = db_from_odoo_url(url)
    if inferred and inferred not in db_candidates:
        db_candidates.append(inferred)

    uid = False
    used_db = db
    for candidate in db_candidates:
        if not candidate:
            continue
        try:
            uid = common.authenticate(candidate, user, password, {})
            if not uid:
                uid = common.login(candidate, user, password)
            if uid:
                used_db = candidate
                break
        except Exception:
            uid = False

    if not uid:
        raise PermissionError(
            f"Odoo XML-RPC authentication failed for user '{user}' on database '{db}'. "
            "Please verify ODOO_URL, ODOO_DB, ODOO_USER, and ODOO_API_KEY secrets in GitHub."
        )

    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
    return uid, models, series, used_db


def normalize_supabase_url(url: str) -> str:
    """Ensure Supabase URL is strictly scheme://host without trailing slashes or subpaths."""
    text = (url or "").strip().strip('"').strip("'").strip().rstrip("/")
    if not text:
        return ""
    if "://" not in text:
        text = f"https://{text}"
    parsed = urlparse(text)
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def connect_supabase():
    """Connect to Supabase using the Service Role Key for writing sync tables."""
    raw_url = _env("SUPABASE_URL") or _env("VITE_SUPABASE_URL")
    service_key = _env("SUPABASE_SERVICE_ROLE_KEY")

    if not raw_url or not service_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
        return None

    supabase_url = normalize_supabase_url(raw_url)
    print(f"Connecting to Supabase at {supabase_url}...")

    if not create_client:
        print("supabase-py package not available.")
        return None

    try:
        return create_client(supabase_url, service_key)
    except Exception as exc:
        print(f"Failed to initialize Supabase client: {exc}")
        return None


# ============================================================================
# 2. ODOO MODEL EXTRACTION
# ============================================================================

def model_exists(models, db: str, uid: int, password: str, model_name: str) -> bool:
    """Check if an Odoo model is installed."""
    try:
        count = models.execute_kw(
            db, uid, password,
            "ir.model", "search_count",
            [[("model", "=", model_name)]]
        )
        return count > 0
    except Exception:
        return False


def safe_model_fields(models, db: str, uid: int, password: str, model_name: str, desired_fields: list) -> list:
    """Filter desired_fields to only those present in the Odoo model schema."""
    try:
        model_fields = models.execute_kw(
            db, uid, password, model_name, "fields_get", [], {"attributes": ["type"]}
        )
        return [f for f in desired_fields if f in model_fields]
    except Exception:
        # Fallback if fields_get fails: exclude commonly non-existent related fields
        return [f for f in desired_fields if f not in {"product_tmpl_id"}]


def fetch_quality_alerts(models, db: str, uid: int, password: str, limit: int = 500):
    """Fetch records from quality.alert if available."""
    if not model_exists(models, db, uid, password, "quality.alert"):
        print("Model 'quality.alert' not found in this Odoo database.")
        return []

    desired = [
        "id", "name", "title", "stage_id", "product_id", "product_tmpl_id",
        "lot_id", "workcenter_id", "workorder_id", "production_id", "reason_id",
        "description", "create_date", "write_date", "partner_id", "company_id"
    ]
    fields = safe_model_fields(models, db, uid, password, "quality.alert", desired)
    try:
        records = models.execute_kw(
            db, uid, password,
            "quality.alert", "search_read",
            [[]],
            {"fields": fields, "limit": limit, "order": "create_date desc"}
        )
        return records or []
    except Exception as exc:
        print(f"Error reading quality.alert: {exc}")
        return []


def fetch_quality_checks(models, db: str, uid: int, password: str, limit: int = 1000):
    """Fetch inspection results from quality.check if available."""
    if not model_exists(models, db, uid, password, "quality.check"):
        print("Model 'quality.check' not found in this Odoo database.")
        return []

    desired = [
        "id", "name", "point_id", "quality_state", "product_id",
        "lot_id", "workcenter_id", "workorder_id", "picking_id",
        "create_date", "write_date", "company_id"
    ]
    fields = safe_model_fields(models, db, uid, password, "quality.check", desired)
    try:
        records = models.execute_kw(
            db, uid, password,
            "quality.check", "search_read",
            [[]],
            {"fields": fields, "limit": limit, "order": "create_date desc"}
        )
        return records or []
    except Exception as exc:
        print(f"Error reading quality.check: {exc}")
        return []


def fetch_scrap_records(models, db: str, uid: int, password: str, limit: int = 10000):
    """Fetch shopfloor scrap entries from stock.scrap."""
    if not model_exists(models, db, uid, password, "stock.scrap"):
        print("Model 'stock.scrap' not found in this Odoo database.")
        return []

    desired = [
        "id", "name", "product_id", "scrap_qty", "lot_id",
        "workorder_id", "production_id", "state", "date_done",
        "company_id", "create_date", "origin"
    ]
    fields = safe_model_fields(models, db, uid, password, "stock.scrap", desired)
    try:
        records = models.execute_kw(
            db, uid, password,
            "stock.scrap", "search_read",
            [[("state", "=", "done")]],
            {"fields": fields, "limit": limit, "order": "create_date desc"}
        )
        return records or []
    except Exception as exc:
        print(f"Error reading stock.scrap: {exc}")
        return []


def fetch_mo_production(models, db: str, uid: int, password: str, limit: int = 15000):
    """Fetch completed manufacturing orders from mrp.production to track pieces produced."""
    if not model_exists(models, db, uid, password, "mrp.production"):
        print("Model 'mrp.production' not found in this Odoo database.")
        return []

    desired = [
        "id", "name", "product_id", "product_tmpl_id", "qty_produced", "product_qty",
        "state", "date_finished", "company_id", "create_date"
    ]
    fields = safe_model_fields(models, db, uid, password, "mrp.production", desired)
    try:
        records = models.execute_kw(
            db, uid, password,
            "mrp.production", "search_read",
            [[("state", "in", ["done", "to_close", "progress"])]],
            {"fields": fields, "limit": limit, "order": "id desc"}
        )
        return records or []
    except Exception as exc:
        print(f"Error reading mrp.production: {exc}")
        return []


def fetch_make_bom_product_ids(models, db: str, uid: int, password: str):
    """Identify manufactured (Make) products via active bills of material in mrp.bom."""
    if not model_exists(models, db, uid, password, "mrp.bom"):
        print("Model 'mrp.bom' not found in this Odoo database.")
        return set(), set()

    desired = ["id", "product_tmpl_id", "product_id", "active"]
    fields = safe_model_fields(models, db, uid, password, "mrp.bom", desired)
    try:
        boms = models.execute_kw(
            db, uid, password,
            "mrp.bom", "search_read",
            [[("active", "=", True)]],
            {"fields": fields, "limit": 10000}
        )
        bom_prod_ids = set()
        bom_tmpl_ids = set()
        for b in (boms or []):
            p = b.get("product_id")
            if p and isinstance(p, (list, tuple)):
                bom_prod_ids.add(p[0])
            pt = b.get("product_tmpl_id")
            if pt and isinstance(pt, (list, tuple)):
                bom_tmpl_ids.add(pt[0])
        return bom_prod_ids, bom_tmpl_ids
    except Exception as exc:
        print(f"Error reading mrp.bom: {exc}")
        return set(), set()


def fetch_customer_sales_and_returns_12m(models, db: str, uid: int, password: str, limit: int = 25000):
    """
    Fetch customer outgoing deliveries (Sold) and incoming returns (Returns)
    over the rolling 12 months from stock.move.
    """
    if not model_exists(models, db, uid, password, "stock.move"):
        print("Model 'stock.move' not found in this Odoo database.")
        return [], []

    # 1. Identify customer locations
    customer_loc_ids = set()
    if model_exists(models, db, uid, password, "stock.location"):
        try:
            c_ids = models.execute_kw(
                db, uid, password,
                "stock.location", "search",
                [[("usage", "=", "customer")]]
            )
            if c_ids:
                customer_loc_ids = set(c_ids)
        except Exception as e:
            print(f"Notice querying customer locations: {e}")

    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=365)
    cutoff_str = cutoff_dt.strftime("%Y-%m-%d 00:00:00")

    desired = [
        "id", "name", "product_id", "product_tmpl_id",
        "location_id", "location_dest_id", "state", "date", "company_id",
        "quantity", "quantity_done", "product_uom_qty"
    ]
    fields = safe_model_fields(models, db, uid, password, "stock.move", desired)

    try:
        moves = models.execute_kw(
            db, uid, password,
            "stock.move", "search_read",
            [[("state", "=", "done"), ("date", ">=", cutoff_str)]],
            {"fields": fields, "limit": limit, "order": "date desc"}
        )
    except Exception as exc:
        print(f"Error reading stock.move: {exc}")
        return [], []

    customer_shipments = []
    customer_returns = []

    for m in (moves or []):
        loc_src = m.get("location_id")
        loc_dst = m.get("location_dest_id")
        src_id = loc_src[0] if loc_src and isinstance(loc_src, (list, tuple)) else None
        dst_id = loc_dst[0] if loc_dst and isinstance(loc_dst, (list, tuple)) else None
        src_name = (loc_src[1] if loc_src and isinstance(loc_src, (list, tuple)) else "").lower()
        dst_name = (loc_dst[1] if loc_dst and isinstance(loc_dst, (list, tuple)) else "").lower()

        is_src_customer = (src_id in customer_loc_ids) or ("customer" in src_name)
        is_dst_customer = (dst_id in customer_loc_ids) or ("customer" in dst_name)

        qty = float(m.get("quantity") or m.get("quantity_done") or m.get("product_uom_qty") or 0.0)
        if qty <= 0:
            continue

        item = {
            "id": m.get("id"),
            "product_id": m.get("product_id"),
            "product_tmpl_id": m.get("product_tmpl_id"),
            "quantity": qty,
            "date": (m.get("date") or "")[:10],
        }

        if is_dst_customer and not is_src_customer:
            customer_shipments.append(item)
        elif is_src_customer and not is_dst_customer:
            customer_returns.append(item)

    return customer_shipments, customer_returns


# ============================================================================
# 3. METRICS AGGREGATION & DATA NORMALIZATION
# ============================================================================

def normalize_detail_records(alerts, checks, scraps, odoo_base_url="https://odoo.nhi-mfg.com"):
    """
    Normalize raw Odoo records into standard Quality Compass detail rows.
    STRICT OPERATIONAL RULE:
      Only Quality Alerts are entered into odoo_quality_records.
      Raw shopfloor scraps are NOT added as standalone quality alert rows.
      If a scrap transaction is linked to a Quality Alert, that link is preserved
      on the alert row with direct URLs to Odoo.
    """
    normalized = []
    clean_base = (odoo_base_url or "https://odoo.nhi-mfg.com").rstrip("/")

    # Build index of scraps by lot, by MO, and by workorder for fast cross-referencing
    scraps_by_lot = {}
    scraps_by_mo = {}
    scraps_by_wo = {}
    for s in scraps:
        lot = s.get("lot_id")
        if lot and isinstance(lot, (list, tuple)):
            scraps_by_lot.setdefault(lot[0], []).append(s)
        prod = s.get("production_id")
        if prod and isinstance(prod, (list, tuple)):
            scraps_by_mo.setdefault(prod[0], []).append(s)
        wo = s.get("workorder_id")
        if wo and isinstance(wo, (list, tuple)):
            scraps_by_wo.setdefault(wo[0], []).append(s)

    for a in alerts:
        a_id = a["id"]
        product_info = a.get("product_id") or []
        product_name = product_info[1] if len(product_info) > 1 else ""
        product_sku = product_name.split(" ")[0].strip("[]") if "[" in product_name else "SKU-ALERT"

        partner_info = a.get("partner_id") or []
        partner_name = partner_info[1] if len(partner_info) > 1 else "NHIMM Customer"

        wc_info = a.get("workcenter_id") or []
        workcenter = wc_info[1] if len(wc_info) > 1 else "SHOPFLOOR"

        lot_info = a.get("lot_id") or []
        lot_id_val = lot_info[0] if len(lot_info) > 0 and isinstance(lot_info, (list, tuple)) else None
        lot_number = lot_info[1] if len(lot_info) > 1 else "LOT-UNKNOWN"

        wo_info = a.get("workorder_id") or []
        wo_id_val = wo_info[0] if len(wo_info) > 0 and isinstance(wo_info, (list, tuple)) else None
        work_order = wo_info[1] if len(wo_info) > 1 else "WO-GENERAL"

        prod_info = a.get("production_id") or []
        mo_id_val = prod_info[0] if len(prod_info) > 0 and isinstance(prod_info, (list, tuple)) else None
        mo_name = prod_info[1] if len(prod_info) > 1 else ""

        stage_info = a.get("stage_id") or []
        stage_name = stage_info[1] if len(stage_info) > 1 else "New"
        stage_mapped = "New"
        if "Confirm" in stage_name:
            stage_mapped = "Confirmed"
        elif "Action" in stage_name or "Progress" in stage_name:
            stage_mapped = "Action Proposed"
        elif "Done" in stage_name or "Resolved" in stage_name:
            stage_mapped = "Resolved"

        reason_info = a.get("reason_id") or []
        defect_type = reason_info[1] if len(reason_info) > 1 else (a.get("title") or "Quality Nonconformance")

        date_val = (a.get("create_date") or datetime.now(timezone.utc).isoformat())[:10]

        # Cross-reference matching scrap transactions
        linked_scraps = []
        if lot_id_val and lot_id_val in scraps_by_lot:
            linked_scraps.extend(scraps_by_lot[lot_id_val])
        if mo_id_val and mo_id_val in scraps_by_mo:
            for s in scraps_by_mo[mo_id_val]:
                if s not in linked_scraps:
                    linked_scraps.append(s)
        if wo_id_val and wo_id_val in scraps_by_wo:
            for s in scraps_by_wo[wo_id_val]:
                if s not in linked_scraps:
                    linked_scraps.append(s)

        linked_scrap_id = linked_scraps[0]["id"] if linked_scraps else None
        linked_scrap_url = f"{clean_base}/web#id={linked_scrap_id}&model=stock.scrap&view_type=form" if linked_scrap_id else None
        linked_scrap_qty = sum(float(s.get("scrap_qty") or 0.0) for s in linked_scraps) if linked_scraps else 0.0

        linked_mo_id = mo_id_val
        linked_mo_url = f"{clean_base}/web#id={mo_id_val}&model=mrp.production&view_type=form" if mo_id_val else None

        company_info = a.get("company_id") or []
        company_id_val = company_info[0] if len(company_info) > 0 and isinstance(company_info, (list, tuple)) else None
        company_name_val = company_info[1] if len(company_info) > 1 else ""

        normalized.append({
            "id": f"odoo-alert-{a_id}",
            "alert_code": a.get("name") or f"QA-{a_id}",
            "product_sku": product_sku,
            "product_name": product_name or "Component",
            "customer_name": partner_name,
            "workcenter": workcenter,
            "lot_number": lot_number,
            "work_order": mo_name or work_order,
            "defect_type": defect_type,
            "quantity_inspected": 0,
            "quantity_rejected": 1,
            "calculated_ppm": 0,
            "scrap_cost": 0.00,
            "date": date_val,
            "stage": stage_mapped,
            "is_quarantined_mrb": True if stage_mapped in ["New", "Confirmed", "Action Proposed"] else False,
            "notes": a.get("description") or "",
            "odoo_id": a_id,
            "odoo_url": f"{clean_base}/web#id={a_id}&model=quality.alert&view_type=form",
            "linked_scrap_id": linked_scrap_id,
            "linked_scrap_url": linked_scrap_url,
            "linked_scrap_qty": linked_scrap_qty,
            "linked_mo_id": linked_mo_id,
            "linked_mo_url": linked_mo_url,
            "company_id": company_id_val,
            "company_name": company_name_val,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    return normalized


def compute_rollups(mo_records, scrap_records, shipments_12m, returns_12m, make_pids, make_tids, records):
    """
    Calculate:
      1. In-Process MO Scrap PPM: (MO Scrap Qty / Pieces Produced on MOs) * 1,000,000
      2. First Pass Yield (FPY %): (1 - MO Scrap Qty / Pieces Produced on MOs) * 100
      3. Finished Goods Customer Return PPM (Rolling 12M: Make vs Buy):
         - Make items returned / Make items sold * 1,000,000
         - Buy items returned / Buy items sold * 1,000,000
         - Total items returned / Total items sold * 1,000,000
      4. Monthly Trend Buckets, Defect Pareto, and Work Center performance.
    """
    def is_make_product(prod_info, tmpl_info):
        pid = prod_info[0] if prod_info and isinstance(prod_info, (list, tuple)) else None
        tid = tmpl_info[0] if tmpl_info and isinstance(tmpl_info, (list, tuple)) else None
        return (pid in make_pids) or (tid in make_tids)

    # -------------------------------------------------------------------------
    # A. In-Process Manufacturing Order (MO) Scrap & Production
    # -------------------------------------------------------------------------
    mo_by_month = {}
    total_mo_pieces_produced = 0.0
    for mo in mo_records:
        qty = float(mo.get("qty_produced") or (mo.get("product_qty") if mo.get("state") in ["done", "to_close"] else 0.0) or 0.0)
        total_mo_pieces_produced += qty
        dt = mo.get("date_finished") or mo.get("create_date") or ""
        ym = dt[:7] if len(dt) >= 7 else datetime.now(timezone.utc).strftime("%Y-%m")
        mo_by_month[ym] = mo_by_month.get(ym, 0.0) + qty

    mo_scrap_by_month = {}
    total_mo_scrap_qty = 0.0
    for s in scrap_records:
        origin = str(s.get("origin") or "")
        is_mo_scrap = bool(s.get("production_id") or s.get("workorder_id") or ("MO" in origin) or ("WH/MO" in origin))
        if is_mo_scrap:
            qty = float(s.get("scrap_qty") or 0.0)
            total_mo_scrap_qty += qty
            dt = s.get("date_done") or s.get("create_date") or ""
            ym = dt[:7] if len(dt) >= 7 else datetime.now(timezone.utc).strftime("%Y-%m")
            mo_scrap_by_month[ym] = mo_scrap_by_month.get(ym, 0.0) + qty

    if total_mo_pieces_produced > 0:
        overall_mo_ppm = round((total_mo_scrap_qty / total_mo_pieces_produced) * 1_000_000)
        fpy = round(max(0.0, ((total_mo_pieces_produced - total_mo_scrap_qty) / total_mo_pieces_produced) * 100), 2)
    else:
        overall_mo_ppm = 0
        fpy = 100.0

    # -------------------------------------------------------------------------
    # B. Finished Goods Customer Deliveries vs Returns (Rolling 12M: Make vs Buy)
    # -------------------------------------------------------------------------
    make_sold_12m = 0.0
    buy_sold_12m = 0.0
    for s in shipments_12m:
        qty = float(s.get("quantity") or 0.0)
        if is_make_product(s.get("product_id"), s.get("product_tmpl_id")):
            make_sold_12m += qty
        else:
            buy_sold_12m += qty
    total_sold_12m = make_sold_12m + buy_sold_12m

    make_ret_12m = 0.0
    buy_ret_12m = 0.0
    for r in returns_12m:
        qty = float(r.get("quantity") or 0.0)
        if is_make_product(r.get("product_id"), r.get("product_tmpl_id")):
            make_ret_12m += qty
        else:
            buy_ret_12m += qty
    total_ret_12m = make_ret_12m + buy_ret_12m

    fg_make_ppm = round((make_ret_12m / make_sold_12m) * 1_000_000) if make_sold_12m > 0 else 0
    fg_buy_ppm = round((buy_ret_12m / buy_sold_12m) * 1_000_000) if buy_sold_12m > 0 else 0
    fg_total_ppm = round((total_ret_12m / total_sold_12m) * 1_000_000) if total_sold_12m > 0 else 0

    # -------------------------------------------------------------------------
    # C. Monthly Trend Buckets
    # -------------------------------------------------------------------------
    all_months = sorted(set(list(mo_by_month.keys()) + list(mo_scrap_by_month.keys())))
    if not all_months:
        all_months = [datetime.now(timezone.utc).strftime("%Y-%m")]
    all_months = all_months[-12:]

    ppm_trends = []
    for ym in all_months:
        prod = mo_by_month.get(ym, 0.0)
        scrp = mo_scrap_by_month.get(ym, 0.0)
        mo_ppm_val = round((scrp / prod) * 1_000_000) if prod > 0 else 0
        fpy_val = round(max(0.0, ((prod - scrp) / prod) * 100), 2) if prod > 0 else 100.0

        ppm_trends.append({
            "period": ym,
            "total_units": int(round(prod)),
            "defective_units": int(round(scrp)),
            "ppm": mo_ppm_val,
            "target_ppm": 150,
            "fpy_percentage": fpy_val,
            "scrap_dollars": 0.00,
            "scrap_percentage": round((scrp / prod) * 100, 2) if prod > 0 else 0.0,
            "mo_pieces_produced": int(round(prod)),
            "mo_scrap_qty": int(round(scrp)),
            "mo_scrap_ppm": mo_ppm_val,
            "fg_make_sold_12m": int(round(make_sold_12m)),
            "fg_make_returned_12m": int(round(make_ret_12m)),
            "fg_make_ppm": fg_make_ppm,
            "fg_buy_sold_12m": int(round(buy_sold_12m)),
            "fg_buy_returned_12m": int(round(buy_ret_12m)),
            "fg_buy_ppm": fg_buy_ppm,
            "fg_total_sold_12m": int(round(total_sold_12m)),
            "fg_total_returned_12m": int(round(total_ret_12m)),
            "fg_total_ppm": fg_total_ppm,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    # -------------------------------------------------------------------------
    # D. Defect Pareto Distribution (Strictly from Quality Alerts)
    # -------------------------------------------------------------------------
    pareto_map = {}
    for r in records:
        reason = r["defect_type"]
        p = pareto_map.setdefault(reason, {"count": 0, "cost": 0.0})
        p["count"] += 1
        p["cost"] += float(r.get("scrap_cost") or 0.0)

    sorted_pareto = sorted(pareto_map.items(), key=lambda x: x[1]["count"], reverse=True)
    total_p_counts = sum(x[1]["count"] for x in sorted_pareto) or 1

    pareto_list = []
    cum_pct = 0.0
    for reason, data in sorted_pareto:
        pct = round((data["count"] / total_p_counts) * 100, 1)
        cum_pct = round(cum_pct + pct, 1)
        pareto_list.append({
            "reason": reason,
            "count": data["count"],
            "cost_impact": round(data["cost"], 2),
            "percentage": pct,
            "cumulative_percentage": min(cum_pct, 100.0),
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    # -------------------------------------------------------------------------
    # E. Work Center Performance
    # -------------------------------------------------------------------------
    wc_map = {}
    for r in records:
        wc = r["workcenter"]
        w = wc_map.setdefault(wc, {"total": 0, "defects": 0, "scrap": 0.0, "defects_dict": {}})
        w["total"] += 1
        w["defects"] += 1
        w["scrap"] += float(r.get("scrap_cost") or 0.0)
        d_type = r["defect_type"]
        w["defects_dict"][d_type] = w["defects_dict"].get(d_type, 0) + 1

    workcenter_list = []
    for wc, data in sorted(wc_map.items()):
        insp = data["total"] or 1
        defc = data["defects"]
        top_defect = max(data["defects_dict"].items(), key=lambda x: x[1])[0] if data["defects_dict"] else "None"
        workcenter_list.append({
            "workcenter_name": wc,
            "total_units": insp,
            "defective_units": defc,
            "ppm": round((defc / insp) * 1_000_000),
            "scrap_cost": round(data["scrap"], 2),
            "primary_defect": top_defect,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "overall_ppm": overall_mo_ppm,
        "fpy_percentage": fpy,
        "mo_pieces_produced": int(round(total_mo_pieces_produced)),
        "mo_scrap_qty": int(round(total_mo_scrap_qty)),
        "mo_scrap_ppm": overall_mo_ppm,
        "fg_make_sold_12m": int(round(make_sold_12m)),
        "fg_make_returned_12m": int(round(make_ret_12m)),
        "fg_make_ppm": fg_make_ppm,
        "fg_buy_sold_12m": int(round(buy_sold_12m)),
        "fg_buy_returned_12m": int(round(buy_ret_12m)),
        "fg_buy_ppm": fg_buy_ppm,
        "fg_total_sold_12m": int(round(total_sold_12m)),
        "fg_total_returned_12m": int(round(total_ret_12m)),
        "fg_total_ppm": fg_total_ppm,
        "ppm_trends": ppm_trends,
        "pareto": pareto_list,
        "workcenters": workcenter_list,
    }


# ============================================================================
# 4. SUPABASE UPSERT
# ============================================================================

def upsert_to_supabase(sb_client: Client, records, rollups):
    """Write normalized quality records and rollups into Supabase."""
    if not sb_client:
        print("Skipping Supabase upsert: client is not configured.")
        return 0

    written = 0

    # 1. Upsert detail records (clean Quality Alerts with Odoo URLs & linked scrap)
    if records:
        try:
            res = sb_client.table("odoo_quality_records").upsert(records, on_conflict="id").execute()
            written += len(records)
            print(f"Upserted {len(records)} Quality Alert records into 'odoo_quality_records'.")
        except Exception as exc:
            # If extra columns don't exist yet, fallback to base columns
            print(f"Notice (odoo_quality_records full upsert): {exc}")
            base_cols = [
                "id", "alert_code", "product_sku", "product_name", "customer_name",
                "workcenter", "lot_number", "work_order", "defect_type",
                "quantity_inspected", "quantity_rejected", "calculated_ppm",
                "scrap_cost", "date", "stage", "is_quarantined_mrb", "notes", "synced_at"
            ]
            trimmed = [{k: r[k] for k in base_cols if k in r} for r in records]
            try:
                res = sb_client.table("odoo_quality_records").upsert(trimmed, on_conflict="id").execute()
                written += len(trimmed)
                print(f"Upserted {len(trimmed)} records using base columns into 'odoo_quality_records'.")
            except Exception as exc2:
                print(f"Notice (odoo_quality_records base upsert): {exc2}")

    # 2. Upsert PPM monthly metrics (resilient with core-column fallback)
    if rollups.get("ppm_trends"):
        try:
            res = sb_client.table("odoo_quality_ppm_metrics").upsert(rollups["ppm_trends"], on_conflict="period").execute()
            print(f"Upserted {len(rollups['ppm_trends'])} periods into 'odoo_quality_ppm_metrics'.")
        except Exception as exc:
            print(f"Notice (odoo_quality_ppm_metrics full upsert): {exc}")
            core_columns = ["period", "total_units", "defective_units", "ppm", "target_ppm", "fpy_percentage", "scrap_dollars", "scrap_percentage", "synced_at"]
            trimmed = [{k: row[k] for k in core_columns if k in row} for row in rollups["ppm_trends"]]
            try:
                res = sb_client.table("odoo_quality_ppm_metrics").upsert(trimmed, on_conflict="period").execute()
                print(f"Upserted {len(trimmed)} periods using base columns into 'odoo_quality_ppm_metrics'.")
            except Exception as exc2:
                print(f"Notice (odoo_quality_ppm_metrics base upsert): {exc2}")

    # 3. Upsert Defect Pareto
    if rollups.get("pareto"):
        try:
            res = sb_client.table("odoo_quality_defect_pareto").upsert(rollups["pareto"], on_conflict="reason").execute()
            print(f"Upserted {len(rollups['pareto'])} items into 'odoo_quality_defect_pareto'.")
        except Exception as exc:
            print(f"Notice (odoo_quality_defect_pareto): {exc}")

    # 4. Upsert Work Center Performance
    if rollups.get("workcenters"):
        try:
            res = sb_client.table("odoo_quality_workcenters").upsert(rollups["workcenters"], on_conflict="workcenter_name").execute()
            print(f"Upserted {len(rollups['workcenters'])} work centers into 'odoo_quality_workcenters'.")
        except Exception as exc:
            print(f"Notice (odoo_quality_workcenters): {exc}")

    return written


def log_sync_result(sb_client: Client, status: str, count: int, duration_sec: float, message: str):
    """Write an audit entry into odoo_quality_sync_logs."""
    if not sb_client:
        return

    payload = {
        "sync_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "records_synced": count,
        "duration_seconds": round(duration_sec, 2),
        "message": message,
    }
    try:
        sb_client.table("odoo_quality_sync_logs").insert([payload]).execute()
        print(f"Logged sync execution to 'odoo_quality_sync_logs' with status '{status}'.")
    except Exception as exc:
        print(f"Notice (odoo_quality_sync_logs): {exc}")


# ============================================================================
# 5. MAIN ENTRY POINT
# ============================================================================

def main():
    print(f"=== Odoo Quality Telemetry Sync (Started {datetime.now(timezone.utc).isoformat()}) ===")
    start_time = time.time()

    url, db, user, password, missing = load_odoo_secrets()
    if missing:
        print(f"Cannot run sync: missing required secrets: {', '.join(missing)}")
        print("Please configure GitHub repository secrets: ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.")
        sys.exit(0)

    # Connect to Supabase
    sb = connect_supabase()

    try:
        # Connect to Odoo
        print(f"Connecting to Odoo at {url} (DB: {db}, User: {user})...")
        uid, models, version, used_db = connect_odoo(url, db, user, password)
        print(f"Authenticated successfully with Odoo {version} (UID: {uid}, DB: {used_db}).")

        # Fetch records
        print("Querying Odoo Quality & Manufacturing models...")
        alerts = fetch_quality_alerts(models, used_db, uid, password)
        print(f"Retrieved {len(alerts)} quality alert records.")

        checks = fetch_quality_checks(models, used_db, uid, password)
        print(f"Retrieved {len(checks)} quality check records.")

        scraps = fetch_scrap_records(models, used_db, uid, password)
        print(f"Retrieved {len(scraps)} completed scrap records.")

        mos = fetch_mo_production(models, used_db, uid, password)
        print(f"Retrieved {len(mos)} completed manufacturing orders.")

        make_pids, make_tids = fetch_make_bom_product_ids(models, used_db, uid, password)
        # Also any product in completed MOs is a Make product
        for m in mos:
            p = m.get("product_id")
            if p and isinstance(p, (list, tuple)):
                make_pids.add(p[0])
            pt = m.get("product_tmpl_id")
            if pt and isinstance(pt, (list, tuple)):
                make_tids.add(pt[0])
        print(f"Identified {len(make_pids)} Make products with active BOMs / MOs.")

        shipments_12m, returns_12m = fetch_customer_sales_and_returns_12m(models, used_db, uid, password)
        print(f"Retrieved {len(shipments_12m)} customer shipments and {len(returns_12m)} customer returns (Rolling 12M).")

        # Normalize Quality Alerts (linking any matching scrap, and generating direct Odoo URLs)
        records = normalize_detail_records(alerts, checks, scraps, url)
        print(f"Compiled {len(records)} normalized Quality Alert detail records.")

        rollups = compute_rollups(mos, scraps, shipments_12m, returns_12m, make_pids, make_tids, records)
        print(f"Calculated In-Process MO Scrap PPM: {rollups['overall_ppm']} | First Pass Yield: {rollups['fpy_percentage']}% (Pieces Produced: {rollups['mo_pieces_produced']}, MO Scrap: {rollups['mo_scrap_qty']})")
        print(f"Calculated Rolling 12M FG Return PPM: Make={rollups['fg_make_ppm']} (Sold: {rollups['fg_make_sold_12m']}, Ret: {rollups['fg_make_returned_12m']}) | Buy={rollups['fg_buy_ppm']} (Sold: {rollups['fg_buy_sold_12m']}, Ret: {rollups['fg_buy_returned_12m']}) | Total={rollups['fg_total_ppm']} (Sold: {rollups['fg_total_sold_12m']}, Ret: {rollups['fg_total_returned_12m']})")

        # Upsert into Supabase
        written_count = upsert_to_supabase(sb, records, rollups)

        duration = time.time() - start_time
        summary_msg = f"Synced {len(records)} Quality Alerts. In-Process MO Scrap PPM: {rollups['overall_ppm']}, FG Return PPM: {rollups['fg_total_ppm']}."
        log_sync_result(sb, "SUCCESS", written_count, duration, summary_msg)

        print(f"=== Sync Complete in {duration:.2f}s ===")

    except Exception as exc:
        duration = time.time() - start_time
        print(f"Error during Odoo quality sync: {exc}")
        log_sync_result(sb, "ERROR", 0, duration, str(exc))
        sys.exit(1)


if __name__ == "__main__":
    main()

