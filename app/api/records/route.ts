import { env } from "cloudflare:workers";

type IncomingRecord = {
  id?: number;
  section: string;
  title: string;
  subtitle?: string;
  data?: Record<string, string>;
};

const seeds: IncomingRecord[] = [
  { section: "products", title: "DrSmile Oral Care Product", subtitle: "Website catalogue", data: { sku: "DRS-001", alacart: "RM 0.00", pwp: "RM 0.00", pharmacy: "—", shopee: "—", website: "—", facebook: "—", status: "Verify from website" } },
  { section: "points", title: "Welcome Reward", subtitle: "Customer redemption", data: { points: "100 pts", value: "RM 5", terms: "One redemption per receipt", status: "Active" } },
  { section: "pharmacies", title: "Add your first pharmacy", subtitle: "Malaysia", data: { phone: "—", address: "Edit this item with the full shop address", state: "—" } },
  { section: "payments", title: "Bank Transfer", subtitle: "Manual payment", data: { details: "Add bank name and account number", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Touch ’n Go", subtitle: "QR payment", data: { details: "Upload TNG QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Credit Card", subtitle: "Payex", data: { details: "Create a secure card payment link in Payex", link: "", qrUrl: "", portal: "https://portal.payex.io/AutoPayments", status: "Available" } },
  { section: "payments", title: "Atome Pay", subtitle: "Buy now, pay later", data: { details: "Create an Atome payment link", link: "", qrUrl: "", portal: "https://portal.atome.my/main/dashboard", status: "Available" } },
  { section: "payments", title: "Shopee Pay", subtitle: "QR payment", data: { details: "Upload ShopeePay QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Cash on Delivery", subtitle: "COD", data: { details: "Confirm delivery area and fee before order", link: "", qrUrl: "", status: "Available" } },
  { section: "faq", title: "How do I update an answer?", subtitle: "Dashboard", data: { answer: "Open this item, choose Edit, update the answer and save. Your team will see the latest version.", category: "General", source: "Google Sheet" } },
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
  const item = (await request.json()) as IncomingRecord;
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
