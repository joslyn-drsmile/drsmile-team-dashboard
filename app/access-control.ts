import { env } from "cloudflare:workers";

export const MENU_KEYS = ["products", "promotions", "points", "pharmacies", "payments", "faq", "calendar"] as const;
export type MenuKey = (typeof MENU_KEYS)[number];
export type PermissionAction = "view" | "add" | "edit" | "delete";
export type PermissionSet = { view: boolean; add: boolean; edit: boolean; delete: boolean };

export type AccessMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
  isOwner: boolean;
  updatedAt: string;
};

export type AccessContext = {
  member: AccessMember;
  permissions: Record<MenuKey, PermissionSet>;
};

const OWNER_EMAIL = "joslyn.drsmile@gmail.com";
const FULL_ACCESS: PermissionSet = { view: true, add: true, edit: true, delete: true };
const READ_ONLY: PermissionSet = { view: true, add: false, edit: false, delete: false };
const seeds = [
  ["admin-oscar", "Oscar", "Boss", "", 1],
  ["admin-elaine", "Elaine", "Boss", "", 1],
  ["admin-wen-yi", "Wen Yi", "Marketer", "", 0],
  ["admin-joey", "Joey", "Marketer", "", 0],
  ["admin-zi-hui", "Zi Hui", "Marketer", "", 0],
  ["admin-jae-wye", "Jae Wye", "Marketer", "", 0],
  ["admin-joslyn", "Joslyn", "CS", OWNER_EMAIL, 1],
  ["admin-shina", "Shina", "CS & Admin", "", 0],
  ["admin-corrine", "Corrine", "After Sales", "", 0],
] as const;

function emptyPermissions() {
  return Object.fromEntries(MENU_KEYS.map((menu) => [menu, { view: false, add: false, edit: false, delete: false }])) as Record<MenuKey, PermissionSet>;
}

export async function ensureAccessSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      email TEXT UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      is_owner INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS menu_permissions (
      member_id TEXT NOT NULL,
      menu TEXT NOT NULL,
      can_view INTEGER NOT NULL DEFAULT 1,
      can_add INTEGER NOT NULL DEFAULT 0,
      can_edit INTEGER NOT NULL DEFAULT 0,
      can_delete INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (member_id, menu)
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON members(email) WHERE email IS NOT NULL AND email != ''"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_permissions_member ON menu_permissions(member_id)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS dashboard_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`),
  ]);

  const now = new Date().toISOString();
  await env.DB.batch(seeds.map(([id, name, role, email, owner]) =>
    env.DB.prepare(`INSERT INTO members (id, name, role, email, active, is_owner, updated_at)
      VALUES (?, ?, ?, NULLIF(?, ''), 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_owner = excluded.is_owner,
        email = CASE WHEN members.id = 'admin-joslyn' THEN ? ELSE members.email END`)
      .bind(id, name, role, email, owner, now, id === "admin-joslyn" ? OWNER_EMAIL : email),
  ));

  const permissionStatements = seeds.flatMap(([memberId]) => MENU_KEYS.map((menu) =>
    env.DB.prepare(`INSERT OR IGNORE INTO menu_permissions
      (member_id, menu, can_view, can_add, can_edit, can_delete, updated_at)
      VALUES (?, ?, 1, 0, 0, 0, ?)`)
      .bind(memberId, menu, now),
  ));
  for (let index = 0; index < permissionStatements.length; index += 50) {
    await env.DB.batch(permissionStatements.slice(index, index + 50));
  }
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function requestEmail(request: Request) {
  const headerEmail = normalizeEmail(request.headers.get("oai-authenticated-user-email"));
  if (headerEmail) return headerEmail;
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" ? OWNER_EMAIL : "";
}

function memberFromRow(row: Record<string, unknown>): AccessMember {
  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role || ""),
    email: String(row.email || ""),
    active: Boolean(row.active),
    isOwner: Boolean(row.is_owner),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function getAccessContext(request: Request): Promise<AccessContext | null> {
  await ensureAccessSchema();
  const email = requestEmail(request);
  if (!email) return null;
  const row = await env.DB.prepare("SELECT * FROM members WHERE lower(email) = ? AND active = 1")
    .bind(email)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const member = memberFromRow(row);
  if (member.isOwner) {
    return { member, permissions: Object.fromEntries(MENU_KEYS.map((menu) => [menu, { ...FULL_ACCESS }])) as Record<MenuKey, PermissionSet> };
  }
  const permissions = emptyPermissions();
  const result = await env.DB.prepare("SELECT * FROM menu_permissions WHERE member_id = ?").bind(member.id).all<Record<string, unknown>>();
  for (const permission of result.results) {
    const menu = String(permission.menu) as MenuKey;
    if (!MENU_KEYS.includes(menu)) continue;
    permissions[menu] = {
      view: Boolean(permission.can_view),
      add: Boolean(permission.can_add),
      edit: Boolean(permission.can_edit),
      delete: Boolean(permission.can_delete),
    };
  }
  return { member, permissions };
}

export function can(context: AccessContext | null, menu: string, action: PermissionAction) {
  return !!context && MENU_KEYS.includes(menu as MenuKey) && context.permissions[menu as MenuKey][action];
}

export function accessDenied(status = 403) {
  return Response.json({ error: status === 401 ? "Sign in required" : "You do not have permission for this action" }, { status });
}

export async function requireMenuPermission(request: Request, menu: string, action: PermissionAction) {
  const context = await getAccessContext(request);
  return can(context, menu, action) ? context : null;
}

export async function listAccessSettings() {
  await ensureAccessSchema();
  const memberRows = await env.DB.prepare("SELECT * FROM members ORDER BY is_owner DESC, name ASC").all<Record<string, unknown>>();
  const permissionRows = await env.DB.prepare("SELECT * FROM menu_permissions ORDER BY member_id, menu").all<Record<string, unknown>>();
  const permissions = new Map<string, Record<MenuKey, PermissionSet>>();
  for (const member of memberRows.results) permissions.set(String(member.id), emptyPermissions());
  for (const row of permissionRows.results) {
    const menu = String(row.menu) as MenuKey;
    if (!MENU_KEYS.includes(menu)) continue;
    const memberPermissions = permissions.get(String(row.member_id));
    if (!memberPermissions) continue;
    memberPermissions[menu] = { view: Boolean(row.can_view), add: Boolean(row.can_add), edit: Boolean(row.can_edit), delete: Boolean(row.can_delete) };
  }
  return memberRows.results.map((row) => {
    const member = memberFromRow(row);
    return {
      ...member,
      permissions: member.isOwner
        ? Object.fromEntries(MENU_KEYS.map((menu) => [menu, { ...FULL_ACCESS }])) as Record<MenuKey, PermissionSet>
        : permissions.get(member.id) || Object.fromEntries(MENU_KEYS.map((menu) => [menu, { ...READ_ONLY }])) as Record<MenuKey, PermissionSet>,
    };
  });
}

export type AccessSettingsInput = {
  id: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
  permissions: Record<MenuKey, PermissionSet>;
};

export async function saveAccessSettings(input: AccessSettingsInput[]) {
  await ensureAccessSchema();
  const existing = await env.DB.prepare("SELECT id, is_owner, email FROM members").all<{ id: string; is_owner: number; email: string | null }>();
  const byId = new Map(existing.results.map((member) => [member.id, member]));
  const seenEmails = new Set<string>();
  const now = new Date().toISOString();
  const statements: ReturnType<typeof env.DB.prepare>[] = [];

  for (const member of input) {
    if (!member.id || !member.name?.trim()) throw new Error("Every member needs a name");
    const previous = byId.get(member.id);
    const isOwner = Boolean(previous?.is_owner);
    const email = member.id === "admin-joslyn" ? OWNER_EMAIL : normalizeEmail(member.email);
    if (email && seenEmails.has(email)) throw new Error(`Duplicate email: ${email}`);
    if (email) seenEmails.add(email);
    statements.push(env.DB.prepare(`INSERT INTO members (id, name, role, email, active, is_owner, updated_at)
      VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, email = excluded.email,
        active = excluded.active, is_owner = excluded.is_owner, updated_at = excluded.updated_at`)
      .bind(member.id, member.name.trim(), member.role?.trim() || "", email, isOwner ? 1 : member.active ? 1 : 0, isOwner ? 1 : 0, now));
    for (const menu of MENU_KEYS) {
      const permission = isOwner ? FULL_ACCESS : member.permissions?.[menu] || READ_ONLY;
      statements.push(env.DB.prepare(`INSERT INTO menu_permissions
        (member_id, menu, can_view, can_add, can_edit, can_delete, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(member_id, menu) DO UPDATE SET can_view = excluded.can_view, can_add = excluded.can_add,
          can_edit = excluded.can_edit, can_delete = excluded.can_delete, updated_at = excluded.updated_at`)
        .bind(member.id, menu, permission.view ? 1 : 0, permission.add ? 1 : 0, permission.edit ? 1 : 0, permission.delete ? 1 : 0, now));
    }
  }
  for (let index = 0; index < statements.length; index += 50) await env.DB.batch(statements.slice(index, index + 50));
  await setSyncStatus("pending", "Waiting to sync with Google Sheet");
  return listAccessSettings();
}

export async function getSyncStatus() {
  await ensureAccessSchema();
  const result = await env.DB.prepare("SELECT key, value FROM dashboard_settings WHERE key IN ('access_sync_status', 'access_sync_message', 'access_last_sync')").all<{ key: string; value: string }>();
  const values = Object.fromEntries(result.results.map((row) => [row.key, row.value]));
  return { status: values.access_sync_status || "not_configured", message: values.access_sync_message || "Google Sheet sync is not configured", lastSync: values.access_last_sync || "" };
}

export async function setSyncStatus(status: string, message: string) {
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES ('access_sync_status', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(status),
    env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES ('access_sync_message', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(message),
    env.DB.prepare("INSERT INTO dashboard_settings (key, value) VALUES ('access_last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(now),
  ]);
}
