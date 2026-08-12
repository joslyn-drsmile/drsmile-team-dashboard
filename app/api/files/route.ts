import { env } from "cloudflare:workers";
import { accessDenied, can, getAccessContext } from "../../access-control";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const section = String(form.get("section") || "");
  const action = form.get("action") === "edit" ? "edit" : "add";
  const context = await getAccessContext(request);
  if (!can(context, section, action)) return accessDenied();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5_000_000) {
    return Response.json({ error: "Use a PNG, JPG or WebP under 5 MB." }, { status: 400 });
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `${section}/workspace-images/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return Response.json({ url: `/api/files/${key.split("/").map(encodeURIComponent).join("/")}` });
}
