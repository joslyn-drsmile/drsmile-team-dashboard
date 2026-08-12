import { env } from "cloudflare:workers";
import { accessDenied, can, getAccessContext } from "../../access-control";

const SETTINGS_KEY = "product_categories";
const defaults = ["牙粉", "完整美白疗程", "漱口水", "加购产品", "包包"];

async function ready() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS dashboard_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`).run();
}

async function readCategories() {
  await ready();
  const stored = await env.DB.prepare("SELECT value FROM dashboard_settings WHERE key = ?")
    .bind(SETTINGS_KEY)
    .first<{ value: string }>();
  if (stored?.value) {
    try {
      const parsed = JSON.parse(stored.value);
      if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === "string");
    } catch {
      // Replace invalid settings with the defaults below.
    }
  }
  await writeCategories(defaults);
  return defaults;
}

async function writeCategories(categories: string[]) {
  await ready();
  await env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(SETTINGS_KEY, JSON.stringify(categories))
    .run();
}

export async function GET(request: Request) {
  const context = await getAccessContext(request);
  if (!can(context, "products", "view")) return accessDenied();
  return Response.json({ categories: await readCategories() });
}

export async function POST(request: Request) {
  const context = await getAccessContext(request);
  if (!can(context, "products", "add")) return accessDenied();
  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim();
  if (!name || name.length > 40 || name.toLowerCase() === "all item") {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  const categories = await readCategories();
  if (!categories.some((category) => category.toLowerCase() === name.toLowerCase())) categories.push(name);
  await writeCategories(categories);
  return Response.json({ categories });
}

export async function DELETE(request: Request) {
  const context = await getAccessContext(request);
  if (!can(context, "products", "delete")) return accessDenied();
  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) return Response.json({ error: "Missing category" }, { status: 400 });

  const categories = (await readCategories()).filter((category) => category !== name);
  const products = await env.DB.prepare("SELECT id, data FROM records WHERE section = 'products'").all<{ id: number; data: string }>();
  const updates = products.results.flatMap((row) => {
    try {
      const data = JSON.parse(row.data || "{}") as Record<string, string>;
      if (data.category !== name) return [];
      data.category = "";
      return [env.DB.prepare("UPDATE records SET data = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(data), new Date().toISOString(), row.id)];
    } catch {
      return [];
    }
  });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(SETTINGS_KEY, JSON.stringify(categories)),
    ...updates,
  ]);
  return Response.json({ categories });
}
