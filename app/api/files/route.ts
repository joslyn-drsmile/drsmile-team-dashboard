import { env } from "cloudflare:workers";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 5_000_000) {
    return Response.json({ error: "Use a PNG, JPG or WebP under 5 MB." }, { status: 400 });
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `payment-qr/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return Response.json({ url: `/api/files/${encodeURIComponent(key)}` });
}
