import { accessDenied, getAccessContext } from "../../../access-control";
import { pullAccessFromSheet, pushAccessToSheet } from "../../../access-sync";

export async function POST(request: Request) {
  const context = await getAccessContext(request);
  if (!context?.member.isOwner) return accessDenied();
  const payload = await request.json().catch(() => ({})) as { direction?: string };
  const result = payload.direction === "pull" ? await pullAccessFromSheet() : await pushAccessToSheet();
  return Response.json(result, { status: result.synced ? 200 : 202 });
}
