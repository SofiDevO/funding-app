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

  //   async verifyWebhook(
  //     body: string,
  //     signature: string,
  //   ): Promise<{
  //     goalId: string;
  //     userName: string;
  //     userEmail: string;
  //     amount: number;
  //     paymentId: string;
  //   } | null> {

  //   }
}
