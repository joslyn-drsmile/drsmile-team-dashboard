import { supabase } from "./supabase";
import sheetData from "../../app/sheet-data.json";

type Permission = { view: boolean; add: boolean; edit: boolean; delete: boolean };
type MemberRow = { id: string; name: string; role: string; email: string | null; active: boolean; is_owner: boolean; updated_at: string };
type PermissionRow = { member_id: string; menu: string; can_view: boolean; can_add: boolean; can_edit: boolean; can_delete: boolean; updated_at: string };

const menuKeys = ["products", "promotions", "points", "pharmacies", "payments", "faq", "calendar", "broadcasts"];
const previewMode = import.meta.env.VITE_PREVIEW_MODE === "true";
const previewRecordsKey = "drsmile-preview-records-v1";
const previewCategoriesKey = "drsmile-preview-categories-v1";
const previewMembersKey = "drsmile-preview-members-v1";
const defaultCategories = ["牙粉", "完整美白疗程", "漱口水", "加购产品", "包包"];
const defaultPayments = [
  { section: "payments", title: "Bank Transfer", subtitle: "Manual payment", data: { details: "Add bank name and account number", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Touch ’n Go", subtitle: "QR payment", data: { details: "Upload TNG QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Credit Card", subtitle: "Payex", data: { details: "Create a secure card payment link in Payex", link: "", qrUrl: "", portal: "https://portal.payex.io/AutoPayments", status: "Available" } },
  { section: "payments", title: "Atome Pay", subtitle: "Buy now, pay later", data: { details: "Create an Atome payment link", link: "", qrUrl: "", portal: "https://portal.atome.my/main/dashboard", status: "Available" } },
  { section: "payments", title: "Shopee Pay", subtitle: "QR payment", data: { details: "Upload ShopeePay QR", link: "", qrUrl: "", status: "Available" } },
  { section: "payments", title: "Cash on Delivery", subtitle: "COD", data: { details: "Confirm delivery area and fee before order", link: "", qrUrl: "", status: "Available" } },
];
const originalFetch = window.fetch.bind(window);

function fullPermissions() {
  return Object.fromEntries(menuKeys.map((menu) => [menu, { view: true, add: true, edit: true, delete: true }])) as Record<string, Permission>;
}

function previewOwner() {
  return {
    id: "admin-joslyn",
    name: "Joslyn",
    role: "Main Account",
    email: "joslyn.drsmile@gmail.com",
    active: true,
    isOwner: true,
    updatedAt: new Date().toISOString(),
    permissions: fullPermissions(),
  };
}

function readPreviewRecords() {
  const saved = window.localStorage.getItem(previewRecordsKey);
  if (saved) return JSON.parse(saved) as Array<Record<string, unknown>>;
  const records = [...(sheetData.records as Array<Record<string, unknown>>), ...defaultPayments]
    .map((item, index) => ({ ...item, id: Number(item.id) || index + 1 }));
  window.localStorage.setItem(previewRecordsKey, JSON.stringify(records));
  return records;
}

function savePreviewRecords(records: Array<Record<string, unknown>>) {
  window.localStorage.setItem(previewRecordsKey, JSON.stringify(records));
}

async function previewRecordsRequest(request: Request, url: URL) {
  let records = readPreviewRecords();
  if (request.method === "GET") return json({ records });
  if (request.method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    records = records.filter((item) => Number(item.id) !== id);
    savePreviewRecords(records);
    return json({ ok: true });
  }
  const payload = await request.json();
  if (request.method === "POST" && payload.mode === "replace") {
    const replacement = (payload.records as Array<Record<string, unknown>>).map((item, index) => ({ ...item, id: Date.now() + index }));
    records = [...records.filter((item) => item.section !== payload.section), ...replacement];
    savePreviewRecords(records);
    return json({ records: replacement });
  }
  const record = {
    id: request.method === "POST" ? Date.now() : Number(payload.id),
    section: payload.section,
    title: String(payload.title || "").trim(),
    subtitle: payload.subtitle || "",
    data: payload.data || {},
  };
  records = request.method === "POST"
    ? [...records, record]
    : records.map((item) => Number(item.id) === Number(record.id) ? record : item);
  savePreviewRecords(records);
  return json({ record });
}

async function previewCategoriesRequest(request: Request, url: URL) {
  let categories = JSON.parse(window.localStorage.getItem(previewCategoriesKey) || JSON.stringify(defaultCategories)) as string[];
  if (request.method === "POST") {
    const payload = await request.json();
    const name = String(payload.name || "").trim();
    if (name && !categories.some((value) => value.toLowerCase() === name.toLowerCase())) categories.push(name);
  } else if (request.method === "DELETE") {
    categories = categories.filter((value) => value !== (url.searchParams.get("name") || ""));
  }
  window.localStorage.setItem(previewCategoriesKey, JSON.stringify(categories));
  return json({ categories });
}

async function previewAccessRequest(request: Request) {
  if (request.method !== "GET") {
    const payload = await request.json();
    window.localStorage.setItem(previewMembersKey, JSON.stringify(payload.members || []));
  }
  const owner = previewOwner();
  const members = JSON.parse(window.localStorage.getItem(previewMembersKey) || "null") || [owner];
  return json({ members, sync: { status: "preview", message: "Preview data saved in this browser", lastSync: new Date().toISOString() } });
}

async function previewUploadRequest(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse("Choose an image", 400);
  if (!/image\/(png|jpeg|webp)/.test(file.type)) return errorResponse("Use PNG, JPEG or WebP", 400);
  if (file.size > 5 * 1024 * 1024) return errorResponse("Image must be 5 MB or smaller", 400);
  return json({ url: URL.createObjectURL(file) });
}

async function previewRoute(request: Request, url: URL) {
  const owner = previewOwner();
  if (url.pathname === "/api/me") return json({ authenticated: true, authorized: true, member: owner, permissions: owner.permissions });
  if (url.pathname === "/api/records") return previewRecordsRequest(request, url);
  if (url.pathname === "/api/categories") return previewCategoriesRequest(request, url);
  if (url.pathname === "/api/access") return previewAccessRequest(request);
  if (url.pathname === "/api/access/sync") return json({ synced: true, status: "preview", message: "Preview data saved in this browser" });
  if (url.pathname === "/api/files") return previewUploadRequest(request);
  return errorResponse("Not found", 404);
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}

function permissionMap(rows: PermissionRow[], owner: boolean) {
  return Object.fromEntries(menuKeys.map((menu) => {
    const row = rows.find((item) => item.menu === menu);
    const permission: Permission = owner
      ? { view: true, add: true, edit: true, delete: true }
      : { view: !!row?.can_view, add: !!row?.can_add, edit: !!row?.can_edit, delete: !!row?.can_delete };
    return [menu, permission];
  }));
}

function memberOutput(member: MemberRow, permissions: PermissionRow[]) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email || "",
    active: member.active,
    isOwner: member.is_owner,
    updatedAt: member.updated_at,
    permissions: permissionMap(permissions.filter((item) => item.member_id === member.id), member.is_owner),
  };
}

async function currentAccess() {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: member, error } = await supabase.from("members").select("*").eq("email", email).eq("active", true).maybeSingle();
  if (error || !member) return null;
  const { data: permissions } = await supabase.from("menu_permissions").select("*").eq("member_id", member.id);
  return memberOutput(member as MemberRow, (permissions || []) as PermissionRow[]);
}

async function recordsRequest(request: Request, url: URL) {
  if (request.method === "GET") {
    let { data, error } = await supabase.from("records").select("id,section,title,subtitle,data").order("id");
    if (!error && !data?.length) {
      const initial = [...(sheetData.records as Array<Record<string, unknown>>), ...defaultPayments].map((item) => ({ section: item.section, title: item.title, subtitle: item.subtitle || "", data: item.data || {} }));
      const seeded = await supabase.from("records").insert(initial).select("id,section,title,subtitle,data");
      data = seeded.data;
      error = seeded.error;
    }
    return error ? errorResponse(error.message, 403) : json({ records: data || [] });
  }
  if (request.method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    const { error } = await supabase.from("records").delete().eq("id", id);
    return error ? errorResponse(error.message, 403) : json({ ok: true });
  }
  const payload = await request.json();
  if (request.method === "POST" && payload.mode === "replace") {
    const { error: deleteError } = await supabase.from("records").delete().eq("section", payload.section);
    if (deleteError) return errorResponse(deleteError.message, 403);
    const rows = payload.records.map((item: Record<string, unknown>) => ({
      section: item.section,
      title: item.title,
      subtitle: item.subtitle || "",
      data: item.data || {},
    }));
    const { data, error } = await supabase.from("records").insert(rows).select("id,section,title,subtitle,data");
    return error ? errorResponse(error.message, 403) : json({ records: data || [] });
  }
  const row = { section: payload.section, title: payload.title?.trim(), subtitle: payload.subtitle || "", data: payload.data || {} };
  if (request.method === "POST") {
    const { data, error } = await supabase.from("records").insert(row).select("id,section,title,subtitle,data").single();
    return error ? errorResponse(error.message, 403) : json({ record: data });
  }
  const { data, error } = await supabase.from("records").update(row).eq("id", payload.id).select("id,section,title,subtitle,data").single();
  return error ? errorResponse(error.message, 403) : json({ record: data });
}

async function categoriesRequest(request: Request, url: URL) {
  const { data } = await supabase.from("dashboard_settings").select("value").eq("key", "product_categories").maybeSingle();
  let categories = Array.isArray(data?.value) ? data.value as string[] : [...defaultCategories];
  if (request.method === "GET") return json({ categories });
  if (request.method === "POST") {
    const payload = await request.json();
    const name = String(payload.name || "").trim();
    if (name && !categories.some((value) => value.toLowerCase() === name.toLowerCase())) categories.push(name);
  } else if (request.method === "DELETE") {
    const name = url.searchParams.get("name") || "";
    categories = categories.filter((value) => value !== name);
  }
  const { error } = await supabase.from("dashboard_settings").upsert({ key: "product_categories", value: categories });
  return error ? errorResponse(error.message, 403) : json({ categories });
}

async function accessRequest(request: Request) {
  const current = await currentAccess();
  if (!current?.isOwner) return errorResponse("You do not have permission for this action", 403);
  if (request.method === "GET") {
    const [{ data: members, error }, { data: permissions }] = await Promise.all([
      supabase.from("members").select("*").order("is_owner", { ascending: false }).order("name"),
      supabase.from("menu_permissions").select("*"),
    ]);
    if (error) return errorResponse(error.message, 403);
    return json({ members: (members as MemberRow[]).map((member) => memberOutput(member, (permissions || []) as PermissionRow[])), sync: { status: "supabase", message: "Live Supabase database", lastSync: new Date().toISOString() } });
  }
  const payload = await request.json();
  const now = new Date().toISOString();
  const members = payload.members as Array<Record<string, unknown>>;
  const memberRows = members.map((member) => ({
    id: member.id,
    name: member.id === "admin-joslyn" ? "Joslyn" : member.name,
    role: member.id === "admin-joslyn" ? "Main Account" : member.role || "",
    email: member.id === "admin-joslyn" ? "joslyn.drsmile@gmail.com" : (String(member.email || "").trim().toLowerCase() || null),
    active: member.id === "admin-joslyn" ? true : !!member.active,
    is_owner: member.id === "admin-joslyn" ? true : !!member.isOwner,
    updated_at: now,
  }));
  const { error: memberError } = await supabase.from("members").upsert(memberRows);
  if (memberError) return errorResponse(memberError.message, 400);
  const permissionRows = members.flatMap((member) => menuKeys.map((menu) => {
    const owner = member.id === "admin-joslyn" || !!member.isOwner;
    const selected = (member.permissions as Record<string, Permission>)?.[menu];
    return { member_id: member.id, menu, can_view: owner || !!selected?.view, can_add: owner || !!selected?.add, can_edit: owner || !!selected?.edit, can_delete: owner || !!selected?.delete, updated_at: now };
  }));
  const { error: permissionError } = await supabase.from("menu_permissions").upsert(permissionRows);
  if (permissionError) return errorResponse(permissionError.message, 400);
  return accessRequest(new Request("https://local/api/access", { method: "GET" }));
}

async function uploadRequest(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse("Choose an image", 400);
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `shared/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("dashboard-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return errorResponse(error.message, 403);
  const { data } = supabase.storage.from("dashboard-images").getPublicUrl(path);
  return json({ url: data.publicUrl });
}

async function route(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : new Request(new URL(String(input), window.location.origin), init);
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
  try {
    if (previewMode) return previewRoute(request, url);
    if (url.pathname === "/api/me") {
      const access = await currentAccess();
      return access ? json({ authenticated: true, authorized: true, member: access, permissions: access.permissions }) : json({ authenticated: true, authorized: false }, 403);
    }
    if (url.pathname === "/api/records") return recordsRequest(request, url);
    if (url.pathname === "/api/categories") return categoriesRequest(request, url);
    if (url.pathname === "/api/access") return accessRequest(request);
    if (url.pathname === "/api/access/sync") return json({ synced: true, status: "supabase", message: "Live Supabase database" });
    if (url.pathname === "/api/files") return uploadRequest(request);
    return errorResponse("Not found", 404);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Request failed", 500);
  }
}

export function installSupabaseApiAdapter() {
  window.fetch = route as typeof window.fetch;
}
