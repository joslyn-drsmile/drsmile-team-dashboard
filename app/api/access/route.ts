import { accessDenied, getAccessContext, getSyncStatus, listAccessSettings, saveAccessSettings, type AccessSettingsInput } from "../../access-control";

export async function GET(request: Request) {
  const context = await getAccessContext(request);
  if (!context?.member.isOwner) return accessDenied();
  return Response.json({ members: await listAccessSettings(), sync: await getSyncStatus() });
}

export async function PUT(request: Request) {
  const context = await getAccessContext(request);
  if (!context?.member.isOwner) return accessDenied();
  const payload = await request.json() as { members?: AccessSettingsInput[] };
  if (!Array.isArray(payload.members) || payload.members.length > 100) return Response.json({ error: "Invalid member list" }, { status: 400 });
  try {
    return Response.json({ members: await saveAccessSettings(payload.members), sync: await getSyncStatus() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Settings could not be saved" }, { status: 400 });
  }
}
