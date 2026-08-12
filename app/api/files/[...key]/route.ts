import { env } from "cloudflare:workers";
import { accessDenied, can, getAccessContext } from "../../../access-control";

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const section = key[0];
  if (!can(await getAccessContext(request), section, "view")) return accessDenied();
  const object = await env.FILES.get(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
