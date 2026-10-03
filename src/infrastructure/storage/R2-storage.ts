import type { R2Bucket } from "@cloudflare/workers-types";

export class R2Storage {
  constructor(
    private bucket: R2Bucket,
    private baseUrl: string,
  ) {}


  async upload(imageKey: string, arrayBuffer: ArrayBuffer): Promise<void> {
    if (!imageKey.trim()) {
      throw new Error("imageKey is required");
    };
    await this.bucket.put(imageKey, arrayBuffer);
  };

  getUrl(imageKey:string):string {
    const base = this.baseUrl.endsWith("/")
    ? this.baseUrl
    : `${this.baseUrl}/`;

    return new URL(this.buildKey(imageKey), base).toString();
  }

  private buildKey(imageKey: string): string {
    return `images/${imageKey}`
  }



};
