import { StorageService } from "@/domain/interfaces/storage-service";
import type { R2Bucket } from "@cloudflare/workers-types";

export class R2Storage implements StorageService {
  constructor(
    private bucket: R2Bucket,
    private baseUrl: string,
  ) {}

  async upload(
    imageKey: string,
    arrayBuffer: ArrayBuffer,
    contentType: string,
  ): Promise<void> {
    if (!imageKey.trim()) throw new Error("imageKey is required");

    await this.bucket.put(this.buildKey(imageKey), arrayBuffer, {
      httpMetadata: {
        contentType,
        cacheControl: "public, maz-age=21536000, inmutable",
      },
    });
  }

  async delete(imageKey: string): Promise<void> {
    if (!imageKey.trim()) throw new Error("imageKey is required");
    await this.bucket.delete(this.buildKey(imageKey));
  }

  getUrl(imageKey: string): string {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`;

    return new URL(this.buildKey(imageKey), base).toString();
  }

  private buildKey(imageKey: string): string {
    return `images/${imageKey}`;
  }
}
