import { getAccessContext } from "../../access-control";
import { pullAccessFromSheetIfDue } from "../../access-sync";

export async function GET(request: Request) {
  await pullAccessFromSheetIfDue();
  const context = await getAccessContext(request);
  if (!context) return Response.json({ authenticated: true, authorized: false }, { status: 403 });
  return Response.json({ authenticated: true, authorized: true, ...context });
}
