import type { PaymentProvider } from "@/domain/interfaces/payment-provider";

export interface LemonSqueezyConfig {
  apiKey: string;
  webhookSecret: string;
  storeId: string;
  variantId: string;
}

export interface VerifiedOrder {
  goalId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paymentId: string;
}

const LEMON_SQUEEZY_API = "https://api.lemonsqueezy.com/v1";

export class LemonSqueezyProvider implements PaymentProvider {
  constructor(private readonly config: LemonSqueezyConfig) {}

  async createCheckout(params: {
    goalId: string;
    amount: number;
    userName: string;
    userEmail: string;
    origin: string;
  }): Promise<{ sessionId: string; url: string }> {
    const res = await fetch(`${LEMON_SQUEEZY_API}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            custom_price: Math.round(params.amount * 100),
            checkout_data: {
              name: params.userName,
              email: params.userEmail,
              custom: { goalId: params.goalId },
            },
            product_options: {
              redirect_url: `${params.origin}/thank-you?order_id=[order_id]&email=[email]`,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: this.config.storeId } },
            variant: { data: { type: "variants", id: this.config.variantId } },
          },
        },
      }),
    });

    const checkout = (await res.json()) as {
      data?: { id: string; attributes?: { url?: string } };
      errors?: unknown;
    };

    if (!res.ok || !checkout.data?.attributes?.url) {
      throw new Error(
        `Lemon Squeezy checkout failed (${res.status}): ${JSON.stringify(checkout.errors ?? checkout)}`,
      );
    }

    return { sessionId: checkout.data.id, url: checkout.data.attributes.url };
  }

  // Verifica la firma y extrae la orden. Devuelve null si la firma no
  // coincide, el payload es invalido o el evento no es un pago confirmado.
  async verifyWebhook(
    body: string,
    signature: string,
  ): Promise<VerifiedOrder | null> {
    // Sin firma no hay nada que verificar: se rechaza antes de parsear JSON.
    if (!signature) return null;

    const valid = await verifyHmacSha256(
      body,
      signature,
      this.config.webhookSecret,
    );
    if (!valid) return null;

    let payload: {
      meta?: { custom_data?: { goalId?: string } };
      data?: {
        id?: string;
        attributes?: {
          status?: string;
          total?: number;
          user_name?: string;
          user_email?: string;
        };
      };
    };

    try {
      payload = JSON.parse(body);
    } catch {
      return null;
    }

    const order = payload.data?.attributes;
    const goalId = payload.meta?.custom_data?.goalId;
    const paymentId = payload.data?.id;

    // Solo ordenes pagadas: LS reenvia eventos (created, refunded...).
    if (order?.status !== "paid") return null;
    if (!goalId || !paymentId || typeof order.total !== "number") return null;

    return {
      goalId,
      userName: String(order.user_name ?? ""),
      userEmail: String(order.user_email ?? ""),
      amount: order.total, // unidades de moneda ($25.00), NO centavos
      paymentId,
    };
  }
}

// HMAC-SHA256 con Web Crypto + comparacion en tiempo constante.
async function verifyHmacSha256(
  body: string,
  headerSignature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Un === cortocircuita al primer byte distinto y filtra informacion por
  // tiempo. El OR acumulado recorre siempre todos los bytes.
  const a = expected.toLowerCase();
  const b = headerSignature.toLowerCase();
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
