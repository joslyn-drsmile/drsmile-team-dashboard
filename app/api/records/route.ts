import { env } from "cloudflare:workers";
import sheetData from "../../sheet-data.json";

type IncomingRecord = {
  id?: number;
  section: string;
  title: string;
  subtitle?: string;
  data?: Record<string, string>;
};

const seeds: IncomingRecord[] = [
  { section: "payments", title: "Bank Transfer", subtitle: "Manual payment", data: { details: "Add bank name and account number", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Touch ’n Go", subtitle: "QR payment", data: { details: "Upload TNG QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Credit Card", subtitle: "Payex", data: { details: "Create a secure card payment link in Payex", link: "", qrUrl: "", portal: "https://portal.payex.io/AutoPayments", status: "Available" } },
  { section: "payments", title: "Atome Pay", subtitle: "Buy now, pay later", data: { details: "Create an Atome payment link", link: "", qrUrl: "", portal: "https://portal.atome.my/main/dashboard", status: "Available" } },
  { section: "payments", title: "Shopee Pay", subtitle: "QR payment", data: { details: "Upload ShopeePay QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Cash on Delivery", subtitle: "COD", data: { details: "Confirm delivery area and fee before order", link: "", qrUrl: "", status: "Available" } },
];

async function ready() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS records_section_idx ON records(section)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS dashboard_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`),
  ]);
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM records").first<{ total: number }>();
  if (!count?.total) {
    const now = new Date().toISOString();
    await env.DB.batch(
      seeds.map((item) =>
        env.DB.prepare("INSERT INTO records (section, title, subtitle, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(item.section, item.title, item.subtitle ?? "", JSON.stringify(item.data ?? {}), now, now),
      ),
    );
  }

  const sourceVersion = "drsmile-sheet-2026-07-29-v1";
  const imported = await env.DB.prepare("SELECT value FROM dashboard_settings WHERE key = 'source_version'").first<{ value: string }>();
  if (imported?.value !== sourceVersion) {
    const now = new Date().toISOString();
    await env.DB.prepare("DELETE FROM records WHERE section IN ('products', 'points', 'pharmacies', 'faq')").run();
    const sourceRecords = sheetData.records as IncomingRecord[];
    for (let index = 0; index < sourceRecords.length; index += 50) {
      await env.DB.batch(sourceRecords.slice(index, index + 50).map((item) =>
        env.DB.prepare("INSERT INTO records (section, title, subtitle, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(item.section, item.title, item.subtitle ?? "", JSON.stringify(item.data ?? {}), now, now),
      ));
    }
    await env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES ('source_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(sourceVersion).run();
  }
}

function output(row: Record<string, unknown>) {
  return { ...row, data: JSON.parse(String(row.data || "{}")) };
}

export async function GET() {
  await ready();
  const result = await env.DB.prepare("SELECT id, section, title, subtitle, data FROM records ORDER BY id ASC").all();
  return Response.json({ records: result.results.map(output) });
}

export async function POST(request: Request) {
  await ready();
  const payload = (await request.json()) as IncomingRecord | { mode: "replace"; section: string; records: IncomingRecord[] };
  if ("records" in payload && payload.mode === "replace") {
    const allowed = new Set(["products", "points", "pharmacies", "faq"]);
    if (!allowed.has(payload.section) || !Array.isArray(payload.records) || payload.records.length > 1000) {
      return Response.json({ error: "Invalid import" }, { status: 400 });
    }
    const records = payload.records.filter((item) => item.section === payload.section && item.title?.trim());
    const now = new Date().toISOString();
    await env.DB.prepare("DELETE FROM records WHERE section = ?").bind(payload.section).run();
    for (let index = 0; index < records.length; index += 50) {
      await env.DB.batch(records.slice(index, index + 50).map((item) =>
        env.DB.prepare("INSERT INTO records (section, title, subtitle, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(payload.section, item.title.trim(), item.subtitle ?? "", JSON.stringify(item.data ?? {}), now, now),
      ));
    }
    const result = await env.DB.prepare("SELECT id, section, title, subtitle, data FROM records WHERE section = ? ORDER BY id ASC").bind(payload.section).all();
    return Response.json({ records: result.results.map(output) });
  }
  const item = payload as IncomingRecord;
  if (!item.title?.trim() || !item.section) return Response.json({ error: "Missing fields" }, { status: 400 });
  const now = new Date().toISOString();
  const result = await env.DB.prepare("INSERT INTO records (section, title, subtitle, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(item.section, item.title.trim(), item.subtitle ?? "", JSON.stringify(item.data ?? {}), now, now).run();
  return Response.json({ record: { ...item, id: Number(result.meta.last_row_id), title: item.title.trim(), subtitle: item.subtitle ?? "", data: item.data ?? {} } });
}

export async function PUT(request: Request) {
  await ready();
  const item = (await request.json()) as IncomingRecord;
  if (!item.id || !item.title?.trim()) return Response.json({ error: "Missing fields" }, { status: 400 });
  await env.DB.prepare("UPDATE records SET section = ?, title = ?, subtitle = ?, data = ?, updated_at = ? WHERE id = ?")
    .bind(item.section, item.title.trim(), item.subtitle ?? "", JSON.stringify(item.data ?? {}), new Date().toISOString(), item.id).run();
  return Response.json({ record: { ...item, title: item.title.trim(), subtitle: item.subtitle ?? "", data: item.data ?? {} } });
}

export async function DELETE(request: Request) {
  await ready();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await env.DB.prepare("DELETE FROM records WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
