import crypto from "crypto";

const BILLPLZ_BASE_URL =
  process.env.BILLPLZ_SANDBOX === "true"
    ? "https://www.billplz-sandbox.com/api/v3"
    : "https://www.billplz.com/api/v3";

function authHeader() {
  // Billplz uses HTTP Basic Auth with the API key as the username and
  // an empty password.
  const token = Buffer.from(`${process.env.BILLPLZ_API_KEY}:`).toString(
    "base64"
  );
  return `Basic ${token}`;
}

interface CreateBillParams {
  email: string;
  name: string;
  amountCents: number; // smallest currency unit (sen) — RM10.00 = 1000
  description: string;
  redirectUrl: string;
  callbackUrl: string;
  reference?: string;
}

export async function createBillplzBill(params: CreateBillParams) {
  const res = await fetch(`${BILLPLZ_BASE_URL}/bills`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      collection_id: process.env.BILLPLZ_COLLECTION_ID!,
      email: params.email,
      name: params.name,
      amount: String(params.amountCents),
      description: params.description,
      redirect_url: params.redirectUrl,
      callback_url: params.callbackUrl,
      ...(params.reference && { reference_1: params.reference }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Billplz bill creation failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<{
    id: string;
    url: string;
    amount: number;
    state: string;
  }>;
}

/**
 * Verifies the X-Signature Billplz sends with callback (webhook) and
 * redirect requests. Algorithm: drop the signature field from the
 * payload, sort the remaining keys case-insensitively, concatenate as
 * "key1value1key2value2...", then HMAC-SHA256 with your X Signature Key
 * (from Billplz > Account Settings — this is NOT your API key).
 *
 * Billplz's form fields arrive with bracket notation, e.g. "billplz[id]"
 * and "billplz[x_signature]" — pass the full field names exactly as
 * received (including the "billplz[...]" wrapper) and the field name
 * that holds the signature.
 */
export function verifyBillplzSignature(
  allFields: Record<string, string>,
  signatureFieldKey: string
): boolean {
  const receivedSignature = allFields[signatureFieldKey];
  if (!receivedSignature) return false;

  const rest: Record<string, string> = {};
  for (const [key, value] of Object.entries(allFields)) {
    if (key !== signatureFieldKey) rest[key] = value;
  }

  const sortedKeys = Object.keys(rest).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const sourceString = sortedKeys.map((key) => `${key}${rest[key]}`).join("");

  const expected = crypto
    .createHmac("sha256", process.env.BILLPLZ_X_SIGNATURE_KEY!)
    .update(sourceString)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(receivedSignature);

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
