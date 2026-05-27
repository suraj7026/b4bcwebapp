#!/usr/bin/env python3
"""
Extract every table from the legacy Hostinger MySQL database to JSON.

Usage:
    pip install pymysql
    python scripts/extract_legacy_mysql.py            # full dump
    python scripts/extract_legacy_mysql.py --tables b4b_members b4b_industry_segments
    python scripts/extract_legacy_mysql.py --out scripts/output/legacy

Connection details are read from the constants below or environment variables
(LEGACY_MYSQL_HOST, LEGACY_MYSQL_PORT, LEGACY_MYSQL_USER, LEGACY_MYSQL_PASSWORD,
LEGACY_MYSQL_DB). Override on the command line with the matching --flag.

Output:
    <out>/<table>.json        — array of row dicts (datetimes ISO-8601, bytes
                                 hex-encoded, NULLs preserved)
    <out>/_manifest.json      — counts per table + extraction metadata

The script paginates each table in chunks to keep memory bounded.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import decimal
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

try:
    import pymysql
    import pymysql.cursors
except ImportError:
    sys.stderr.write(
        "pymysql is not installed. Run:  pip install pymysql\n"
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Defaults (override via env vars or CLI flags)
# ---------------------------------------------------------------------------
DEFAULT_HOST = os.environ.get("LEGACY_MYSQL_HOST", "193.203.184.149")
DEFAULT_PORT = int(os.environ.get("LEGACY_MYSQL_PORT", "3306"))
DEFAULT_USER = os.environ.get("LEGACY_MYSQL_USER", "u482963442_events_db_mgr")
DEFAULT_PASSWORD = os.environ.get("LEGACY_MYSQL_PASSWORD", "@Chennai2026")
DEFAULT_DB = os.environ.get("LEGACY_MYSQL_DB", "u482963442_events_mgmt")

CHUNK = 500  # rows per fetch


def _json_default(value: Any) -> Any:
    if isinstance(value, (_dt.datetime, _dt.date, _dt.time)):
        return value.isoformat()
    if isinstance(value, _dt.timedelta):
        return value.total_seconds()
    if isinstance(value, decimal.Decimal):
        # Keep precision but serialize as string so JSON consumers don't lose
        # cents due to float rounding.
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        return value.hex()
    if isinstance(value, set):
        return list(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serialisable")


def fetch_tables(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute("SHOW TABLES")
        return [row[0] for row in cur.fetchall()]


def fetch_table(
    conn, table: str, out_dir: Path, chunk: int = CHUNK
) -> tuple[int, list[str]]:
    """Stream a single table to <out_dir>/<table>.json. Returns (row count, columns)."""
    safe = "".join(c if c.isalnum() or c in ("_",) else "_" for c in table)
    out_path = out_dir / f"{safe}.json"

    with conn.cursor(pymysql.cursors.SSDictCursor) as cur:
        cur.execute(f"SELECT * FROM `{table}`")
        columns = [d[0] for d in cur.description] if cur.description else []

        count = 0
        # Manual JSON streaming — write a `[` then comma-separated rows then `]`.
        with out_path.open("w", encoding="utf-8") as fh:
            fh.write("[")
            first = True
            while True:
                rows = cur.fetchmany(chunk)
                if not rows:
                    break
                for row in rows:
                    if not first:
                        fh.write(",\n")
                    first = False
                    fh.write(
                        json.dumps(
                            row,
                            ensure_ascii=False,
                            default=_json_default,
                        )
                    )
                    count += 1
            fh.write("\n]\n")
    return count, columns


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--user", default=DEFAULT_USER)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--db", default=DEFAULT_DB)
    parser.add_argument(
        "--out",
        default="scripts/output/legacy",
        help="output directory (default: scripts/output/legacy)",
    )
    parser.add_argument(
        "--tables",
        nargs="*",
        help="extract only the listed tables (default: all)",
    )
    parser.add_argument("--chunk", type=int, default=CHUNK, help="rows per fetch")
    parser.add_argument(
        "--no-ssl",
        action="store_true",
        help="don't try SSL on connect (Hostinger sometimes needs this)",
    )
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    connect_kwargs = dict(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.db,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.Cursor,
        connect_timeout=20,
        read_timeout=600,
        write_timeout=60,
        autocommit=True,
    )
    if not args.no_ssl:
        # Hostinger accepts SSL but doesn't require a cert.
        connect_kwargs["ssl"] = {"ssl": {}}

    print(
        f"Connecting to {args.user}@{args.host}:{args.port}/{args.db} "
        f"(ssl={'off' if args.no_ssl else 'on'})…"
    )
    t0 = time.time()
    try:
        conn = pymysql.connect(**connect_kwargs)
    except Exception as exc:
        if not args.no_ssl:
            print(f"  SSL connect failed ({exc!s}); retrying without SSL…")
            connect_kwargs.pop("ssl", None)
            conn = pymysql.connect(**connect_kwargs)
        else:
            raise

    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION()")
            (version,) = cur.fetchone()
        print(f"  connected — MySQL {version}")

        tables = args.tables or fetch_tables(conn)
        print(f"  {len(tables)} tables to extract")

        manifest: dict[str, Any] = {
            "extracted_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
            "host": args.host,
            "database": args.db,
            "tables": {},
        }

        for table in tables:
            t = time.time()
            try:
                count, columns = fetch_table(conn, table, out_dir, args.chunk)
            except Exception as exc:
                print(f"  ✗ {table}: {exc!s}")
                manifest["tables"][table] = {"error": str(exc)}
                continue
            dt = time.time() - t
            print(f"  ✓ {table:<40} {count:>7,} rows  ({dt:.1f}s)")
            manifest["tables"][table] = {
                "rows": count,
                "columns": columns,
                "file": f"{table}.json",
                "seconds": round(dt, 2),
            }

        (out_dir / "_manifest.json").write_text(
            json.dumps(manifest, indent=2, default=_json_default)
        )
        print(f"\nDone in {time.time() - t0:.1f}s. Output: {out_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
