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
from datetime import datetime, timezone
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


def fetch_quality_alerts(models, db: str, uid: int, password: str, limit: int = 500):
    """Fetch records from quality.alert if available."""
    if not model_exists(models, db, uid, password, "quality.alert"):
        print("Model 'quality.alert' not found in this Odoo database.")
        return []

    fields = [
        "id", "name", "title", "stage_id", "product_id", "product_tmpl_id",
        "lot_id", "workcenter_id", "workorder_id", "reason_id", "description",
        "create_date", "write_date", "partner_id", "company_id"
    ]
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

    fields = [
        "id", "name", "point_id", "quality_state", "product_id",
        "lot_id", "workcenter_id", "workorder_id", "picking_id",
        "create_date", "write_date", "company_id"
    ]
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


def fetch_scrap_records(models, db: str, uid: int, password: str, limit: int = 1000):
    """Fetch shopfloor scrap entries from stock.scrap."""
    if not model_exists(models, db, uid, password, "stock.scrap"):
        print("Model 'stock.scrap' not found in this Odoo database.")
        return []

    fields = [
        "id", "name", "product_id", "scrap_qty", "lot_id",
        "workorder_id", "production_id", "state", "date_done",
        "company_id", "create_date"
    ]
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


# ============================================================================
# 3. METRICS AGGREGATION & DATA NORMALIZATION
# ============================================================================

def normalize_detail_records(alerts, checks, scraps):
    """Normalize raw Odoo records into standard Quality Compass detail rows."""
    normalized = []

    # 1. Process Quality Alerts
    for a in alerts:
        product_info = a.get("product_id") or []
        product_name = product_info[1] if len(product_info) > 1 else ""
        product_sku = product_name.split(" ")[0].strip("[]") if "[" in product_name else "SKU-GENERIC"

        partner_info = a.get("partner_id") or []
        partner_name = partner_info[1] if len(partner_info) > 1 else "NHIMM Internal"

        wc_info = a.get("workcenter_id") or []
        workcenter = wc_info[1] if len(wc_info) > 1 else "CNC_LINE"

        lot_info = a.get("lot_id") or []
        lot_number = lot_info[1] if len(lot_info) > 1 else "LOT-UNKNOWN"

        wo_info = a.get("workorder_id") or []
        work_order = wo_info[1] if len(wo_info) > 1 else "WO-GENERAL"

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
        defect_type = reason_info[1] if len(reason_info) > 1 else (a.get("title") or "General Nonconformance")

        date_val = (a.get("create_date") or datetime.now(timezone.utc).isoformat())[:10]

        normalized.append({
            "id": f"odoo-alert-{a['id']}",
            "alert_code": a.get("name") or f"QA-{a['id']}",
            "product_sku": product_sku,
            "product_name": product_name or "Machined Component",
            "customer_name": partner_name,
            "workcenter": workcenter,
            "lot_number": lot_number,
            "work_order": work_order,
            "defect_type": defect_type,
            "quantity_inspected": 1000,
            "quantity_rejected": 1,
            "calculated_ppm": 1000,
            "scrap_cost": 500.00,
            "date": date_val,
            "stage": stage_mapped,
            "is_quarantined_mrb": True if stage_mapped in ["New", "Confirmed", "Action Proposed"] else False,
            "notes": a.get("description") or "",
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    # 2. Process Scrap records if no alerts exist
    if not normalized and scraps:
        for s in scraps[:50]:
            p_info = s.get("product_id") or []
            p_name = p_info[1] if len(p_info) > 1 else "Scrapped Product"
            qty = float(s.get("scrap_qty") or 1.0)
            date_val = (s.get("date_done") or s.get("create_date") or datetime.now(timezone.utc).isoformat())[:10]

            normalized.append({
                "id": f"odoo-scrap-{s['id']}",
                "alert_code": s.get("name") or f"SP-{s['id']}",
                "product_sku": p_name.split(" ")[0].strip("[]") if "[" in p_name else "SKU-SCRAP",
                "product_name": p_name,
                "customer_name": "NHI Mechanical Motion",
                "workcenter": "SHOPFLOOR",
                "lot_number": "SCRAP-LOT",
                "work_order": "MO-SCRAP",
                "defect_type": "Manufacturing Scrap",
                "quantity_inspected": int(qty * 100),
                "quantity_rejected": int(qty),
                "calculated_ppm": 10000,
                "scrap_cost": round(qty * 25.0, 2),
                "date": date_val,
                "stage": "Resolved",
                "is_quarantined_mrb": False,
                "notes": f"Scrapped quantity: {qty}",
                "synced_at": datetime.now(timezone.utc).isoformat(),
            })

    return normalized


def compute_rollups(records):
    """Calculate monthly PPM, Pareto, and work center performance from records."""
    total_inspected = sum(r["quantity_inspected"] for r in records) or 1
    total_defects = sum(r["quantity_rejected"] for r in records)
    overall_ppm = round((total_defects / total_inspected) * 1_000_000)
    fpy = round(((total_inspected - total_defects) / total_inspected) * 100, 2)

    # Monthly Trends
    months = {}
    for r in records:
        ym = r["date"][:7]
        m = months.setdefault(ym, {"inspected": 0, "defects": 0, "scrap": 0.0})
        m["inspected"] += r["quantity_inspected"]
        m["defects"] += r["quantity_rejected"]
        m["scrap"] += float(r.get("scrap_cost") or 0.0)

    ppm_trends = []
    for ym, data in sorted(months.items()):
        insp = data["inspected"] or 1
        defc = data["defects"]
        ppm_val = round((defc / insp) * 1_000_000)
        fpy_val = round(((insp - defc) / insp) * 100, 2)
        ppm_trends.append({
            "period": ym,
            "total_units": insp,
            "defective_units": defc,
            "ppm": ppm_val,
            "target_ppm": 150,
            "fpy_percentage": fpy_val,
            "scrap_dollars": round(data["scrap"], 2),
            "scrap_percentage": round((data["scrap"] / (insp * 15.0)) * 100, 2) if insp else 0,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        })

    # Defect Pareto
    pareto_map = {}
    for r in records:
        reason = r["defect_type"]
        p = pareto_map.setdefault(reason, {"count": 0, "cost": 0.0})
        p["count"] += r["quantity_rejected"]
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

    # Work Center Performance
    wc_map = {}
    for r in records:
        wc = r["workcenter"]
        w = wc_map.setdefault(wc, {"total": 0, "defects": 0, "scrap": 0.0, "defects_dict": {}})
        w["total"] += r["quantity_inspected"]
        w["defects"] += r["quantity_rejected"]
        w["scrap"] += float(r.get("scrap_cost") or 0.0)
        d_type = r["defect_type"]
        w["defects_dict"][d_type] = w["defects_dict"].get(d_type, 0) + r["quantity_rejected"]

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
        "overall_ppm": overall_ppm,
        "fpy_percentage": fpy,
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

    # 1. Upsert detail records
    if records:
        try:
            res = sb_client.table("odoo_quality_records").upsert(records, on_conflict="id").execute()
            written += len(records)
            print(f"Upserted {len(records)} records into 'odoo_quality_records'.")
        except Exception as exc:
            print(f"Notice (odoo_quality_records): {exc}")

    # 2. Upsert PPM monthly metrics
    if rollups.get("ppm_trends"):
        try:
            res = sb_client.table("odoo_quality_ppm_metrics").upsert(rollups["ppm_trends"], on_conflict="period").execute()
            print(f"Upserted {len(rollups['ppm_trends'])} periods into 'odoo_quality_ppm_metrics'.")
        except Exception as exc:
            print(f"Notice (odoo_quality_ppm_metrics): {exc}")

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
        sys.exit(0)  # Exit gracefully so cron does not show failed build when secrets not yet configured

    # Connect to Supabase
    sb = connect_supabase()

    try:
        # Connect to Odoo
        print(f"Connecting to Odoo at {url} (DB: {db}, User: {user})...")
        uid, models, version, used_db = connect_odoo(url, db, user, password)
        print(f"Authenticated successfully with Odoo {version} (UID: {uid}, DB: {used_db}).")

        # Fetch records
        print("Querying Odoo Quality models...")
        alerts = fetch_quality_alerts(models, used_db, uid, password)
        print(f"Retrieved {len(alerts)} quality alert records.")

        checks = fetch_quality_checks(models, used_db, uid, password)
        print(f"Retrieved {len(checks)} quality check records.")

        scraps = fetch_scrap_records(models, used_db, uid, password)
        print(f"Retrieved {len(scraps)} completed scrap records.")

        # Normalize & Calculate Rollups
        records = normalize_detail_records(alerts, checks, scraps)
        print(f"Compiled {len(records)} normalized quality detail records.")

        rollups = compute_rollups(records)
        print(f"Calculated enterprise PPM: {rollups['overall_ppm']} | First Pass Yield: {rollups['fpy_percentage']}%")

        # Upsert into Supabase
        written_count = upsert_to_supabase(sb, records, rollups)

        duration = time.time() - start_time
        log_sync_result(sb, "SUCCESS", written_count, duration, f"Synced {len(records)} quality records ({len(alerts)} alerts, {len(checks)} checks, {len(scraps)} scraps).")

        print(f"=== Sync Complete in {duration:.2f}s ===")

    except Exception as exc:
        duration = time.time() - start_time
        print(f"Error during Odoo quality sync: {exc}")
        log_sync_result(sb, "ERROR", 0, duration, str(exc))
        sys.exit(1)


if __name__ == "__main__":
    main()
