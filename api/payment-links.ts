const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://zdgkaablciltvvatfrju.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const ATOME_API = "https://drsmile-expo-dashboard.vercel.app/api/atome/payment-links";
const PAYEX_API = "https://api.payex.io";

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function bearer(request: ApiRequest) {
  const value = request.headers.authorization;
  const header = Array.isArray(value) ? value[0] : value || "";
  return header.startsWith("Bearer ") ? header : "";
}

function providerFrom(request: ApiRequest) {
  const value = request.query?.provider;
  return String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
}

function bodyFrom(request: ApiRequest) {
  if (typeof request.body === "string") {
    try { return JSON.parse(request.body) as Record<string, unknown>; } catch { return {}; }
  }
  return (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
}

async function readJson(response: Response) {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

async function approvedUser(authorization: string) {
  if (!authorization || !SUPABASE_KEY) throw new Error("Please sign in to create payment links.");
  const headers = { apikey: SUPABASE_KEY, Authorization: authorization };
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers, cache: "no-store" });
  const user = await readJson(userResponse);
  const email = String(user?.email || "").toLowerCase();
  const id = String(user?.id || "");
  if (!userResponse.ok || !email || !id) throw new Error("Your session has expired. Please sign in again.");

  const accessResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/expo_allowed_users?email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,display_name&limit=1`,
    { headers, cache: "no-store" },
  );
  const access = await accessResponse.json().catch(() => []) as Array<Record<string, unknown>>;
  if (!accessResponse.ok || !access.length) throw new Error("This account is not approved to create payment links.");
  return { id, email, name: String(access[0].display_name || email.split("@")[0]), headers };
}

async function proxyAtome(request: ApiRequest, response: ApiResponse, authorization: string) {
  const upstream = await fetch(ATOME_API, {
    method: request.method,
    headers: {
      Authorization: authorization,
      ...(request.method === "POST" ? { "content-type": "application/json" } : {}),
    },
    body: request.method === "POST" ? JSON.stringify(bodyFrom(request)) : undefined,
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({ error: "Atome did not return a valid response." }));
  return response.status(upstream.status).json(payload);
}

async function payexHistory(response: ApiResponse, authorization: string) {
  const user = await approvedUser(authorization);
  const query = "provider=eq.payex&select=*&order=created_at.desc&limit=100";
  const result = await fetch(`${SUPABASE_URL}/rest/v1/team_payment_links?${query}`, {
    headers: user.headers,
    cache: "no-store",
  });
  const rows = await result.json().catch(() => []);
  if (!result.ok) return response.status(502).json({ error: "Unable to load saved Payex links." });
  return response.status(200).json({ payments: rows });
}

async function createPayex(request: ApiRequest, response: ApiResponse, authorization: string) {
  const user = await approvedUser(authorization);
  const merchantEmail = process.env.PAYEX_MERCHANT_EMAIL?.trim();
  const apiSecret = process.env.PAYEX_API_SECRET?.trim();
  if (!merchantEmail || !apiSecret) {
    return response.status(503).json({
      error: "Payex direct link is ready, but the Payex API email and Secret still need to be connected once in the server settings.",
      setupRequired: true,
    });
  }

  const body = bodyFrom(request);
  const amount = Number(body.amount);
  const reference = String(body.orderId || body.reference || "").trim();
  const customerName = String(body.customerName || "").trim();
  const description = String(body.description || "").trim();
  if (!Number.isFinite(amount) || amount < 1 || amount > 30000) {
    return response.status(400).json({ error: "Payex amount must be between RM1 and RM30,000." });
  }
  if (!customerName) return response.status(400).json({ error: "Enter the customer name for Payex." });
  if (reference.length > 40) return response.status(400).json({ error: "Order reference must be 40 characters or fewer." });

  const tokenResponse = await fetch(`${PAYEX_API}/api/Auth/Token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${merchantEmail}:${apiSecret}`).toString("base64")}` },
    cache: "no-store",
  });
  const tokenPayload = await readJson(tokenResponse);
  const accessToken = String(tokenPayload?.token || "");
  if (!tokenResponse.ok || !accessToken) {
    return response.status(502).json({ error: "Payex sign-in failed. Please check the Payex API email and Secret." });
  }

  const intentResponse = await fetch(`${PAYEX_API}/api/v1/PaymentIntents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify([{
      amount: Math.round(amount * 100),
      currency: "MYR",
      customer_name: customerName.slice(0, 50),
      description: description.slice(0, 200),
      reference_number: reference.slice(0, 40),
      send_email: false,
      single_attempt: false,
      source: "DrSmile Team Dashboard",
    }]),
    cache: "no-store",
  });
  const intentPayload = await readJson(intentResponse);
  const first = Array.isArray(intentPayload?.result) ? intentPayload.result[0] as Record<string, unknown> : null;
  const paymentLink = String(first?.url || "");
  const externalId = String(first?.key || "");
  if (!intentResponse.ok || String(first?.status || intentPayload?.status || "") !== "00" || !paymentLink || !externalId) {
    return response.status(502).json({ error: String(first?.error || intentPayload?.message || "Payex could not create this payment link.") });
  }

  const record = {
    provider: "payex", external_id: externalId, payment_link: paymentLink, amount,
    currency: "MYR", reference, customer_name: customerName, description,
    status: "PENDING", created_by: user.id, created_by_email: user.email,
  };
  const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/team_payment_links`, {
    method: "POST",
    headers: { ...user.headers, "content-type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(record),
  });
  const saved = await saveResponse.json().catch(() => []);
  if (!saveResponse.ok) {
    return response.status(502).json({ error: "Payex created the link, but the Dashboard could not save it. Copy it now before leaving.", payment: { ...record, paymentLink } });
  }
  const row = Array.isArray(saved) ? saved[0] : saved;
  return response.status(200).json({ payment: row });
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");
  const authorization = bearer(request);
  const provider = providerFrom(request) || String(bodyFrom(request).gateway || "atome").toLowerCase();
  if (!authorization) return response.status(401).json({ error: "Please sign in to create payment links." });
  if (provider !== "atome" && provider !== "payex") return response.status(400).json({ error: "Choose Atome or Payex." });

  try {
    if (provider === "atome") return await proxyAtome(request, response, authorization);
    if (request.method === "GET") return await payexHistory(response, authorization);
    if (request.method === "POST") return await createPayex(request, response, authorization);
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : "Payment link request failed." });
  }
}
