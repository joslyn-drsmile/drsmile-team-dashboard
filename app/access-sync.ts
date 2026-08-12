import { env } from "cloudflare:workers";
import { getSyncStatus, listAccessSettings, saveAccessSettings, setSyncStatus, type AccessSettingsInput } from "./access-control";

function config() {
  const values = env as unknown as Record<string, string | undefined>;
  return { url: values.GOOGLE_APPS_SCRIPT_URL || "", secret: values.GOOGLE_APPS_SCRIPT_SECRET || "" };
}

async function callSheet(action: "push" | "pull", members?: Awaited<ReturnType<typeof listAccessSettings>>) {
  const settings = config();
  if (!settings.url || !settings.secret) throw new Error("Google Apps Script connection is not configured yet");
  const response = await fetch(settings.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, secret: settings.secret, members }),
  });
  if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
  const payload = await response.json() as { ok?: boolean; error?: string; members?: AccessSettingsInput[] };
  if (!payload.ok) throw new Error(payload.error || "Google Sheet sync failed");
  return payload;
}

export async function pushAccessToSheet() {
  try {
    await callSheet("push", await listAccessSettings());
    await setSyncStatus("synced", "Admin and Permissions sheets are up to date");
    return { synced: true, status: "synced", message: "Admin and Permissions sheets are up to date" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Sheet sync failed";
    await setSyncStatus("pending", message);
    return { synced: false, status: "pending", message };
  }
}

export async function pullAccessFromSheet() {
  try {
    const payload = await callSheet("pull");
    if (!Array.isArray(payload.members)) throw new Error("Google Sheet did not return a member list");
    await saveAccessSettings(payload.members);
    await setSyncStatus("synced", "Latest Admin and Permissions data loaded from Google Sheet");
    return { synced: true, status: "synced", message: "Latest Admin and Permissions data loaded from Google Sheet" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Sheet sync failed";
    await setSyncStatus("pending", message);
    return { synced: false, status: "pending", message };
  }
}

export async function pullAccessFromSheetIfDue() {
  try {
    const status = await getSyncStatus();
    if (status.status !== "synced") return;
    const last = Date.parse(status.lastSync || "");
    if (Number.isFinite(last) && Date.now() - last < 60_000) return;
    await pullAccessFromSheet();
  } catch {
    // Access continues from the last known D1 data when Google Sheet is unavailable.
  }
}
