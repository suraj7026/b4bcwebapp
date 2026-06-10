import "server-only";
import mysql from "mysql2/promise";

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
};

declare global {
  var __mysqlPool: mysql.Pool | undefined;
}

function makePool(): mysql.Pool {
  return mysql.createPool({
    host: required("LEGACY_MYSQL_HOST"),
    port: Number(process.env.LEGACY_MYSQL_PORT ?? 3306),
    user: required("LEGACY_MYSQL_USER"),
    password: required("LEGACY_MYSQL_PASSWORD"),
    database: required("LEGACY_MYSQL_DB"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    ssl: { rejectUnauthorized: false },
    dateStrings: true,
  });
}

export function getPool(): mysql.Pool {
  if (!globalThis.__mysqlPool) {
    globalThis.__mysqlPool = makePool();
  }
  return globalThis.__mysqlPool;
}

export type QueryParam = string | number | boolean | Date | null;

/**
 * Predicate identifying an active b4b_members row.
 *
 * Legacy data uses three encodings for "still a member":
 *  - date_of_exit IS NULL (415 rows)
 *  - date_of_exit = '0000-00-00' (94 rows, MySQL "zero date")
 *  - date_of_exit is a real past date (0 rows today)
 *
 * Inline this fragment in every WHERE that should scope to active members
 * so we don't silently drop the ~94 zero-date rows.
 */
export const ACTIVE_MEMBER_SQL =
  "(m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')";

/**
 * Derive an industry segment_id for a b4b_members row.
 *
 * Why: 501 of 509 active members have `b4b_members.industry` NULL even though
 * their `business_area` / `service_provided` describes a clear segment. Without
 * this derivation the industry filter is broken and every card reads
 * "B4BC Member".
 *
 * Rules (first match wins per row):
 *   1. Raw m.industry if set
 *   2. Construction & Building Materials (1)
 *   3. Packaged Food (2)
 *   4. Software (5)
 *   5. ITES (6)
 *   6. Consultancy (280) — only if business_area STARTS with that label
 *   7. Education (7) — only specific schools/institutes, not bare "training"
 *   8. Finance (3)
 *   9. Manufacture of Industrial Products (4)
 *  10. Consultancy (280) — generic catchall for any "consult"/"advisor"
 *  11. 0 "General" — synthetic sentinel for rows that don't fit any real
 *      segment (Retail, Logistics, Health, Agriculture, "Others", etc.).
 *      0 is safe because `b4b_industry_segments.segment_id` is always > 0.
 *
 * Aliased to alias `m` for b4b_members. Inline everywhere we need an industry
 * id that respects this derivation (projections, filters, joins).
 */
export const DERIVED_INDUSTRY_SQL = `
  CASE
    WHEN m.industry IS NOT NULL THEN m.industry
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'construct|real[ ]?estate|builder|building material' THEN 1
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'food|beverage|catering|bakery|restaurant|cafe|grocer|snack|fnb|f&b|fmcg' THEN 2
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'software|saas|iot|digital marketing|cctv|automation|app development|web development' THEN 5
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'ites|bpo|outsourcing|it service|it consulting|it hardware|computer sales|office automation' THEN 6
    WHEN LOWER(IFNULL(m.business_area,'')) REGEXP 'consultancy' THEN 280
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'education|institute|academy|college|university|tutor|coaching centre|training centre|music training' THEN 7
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'insur|financ|chartered accountant|icwa|mutual fund|banking|wealth|money exchange' THEN 3
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'manufactur|engineering|electrical|electronics|chemical|fabricat|industrial product|hvac|mfg|packaging' THEN 4
    WHEN LOWER(CONCAT_WS(' ', m.business_area, m.service_provided))
      REGEXP 'consult|advisor' THEN 280
    ELSE 0
  END
`;

/** Synthetic segment for members who don't fit any real b4b_industry_segments row. */
export const GENERAL_SEGMENT = {
  id: 0,
  name: "General",
  description: "Members whose business area doesn't fit a specific segment",
} as const;

export async function query<T = unknown>(
  sql: string,
  params: readonly QueryParam[] = []
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params as QueryParam[]);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: readonly QueryParam[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
