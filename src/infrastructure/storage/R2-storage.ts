import type { R2Bucket } from "@cloudflare/workers-types";

export class R2Storage {
    constructor(
        private bucket:R2Bucket,
        private baseUrl:string
    ){}
}