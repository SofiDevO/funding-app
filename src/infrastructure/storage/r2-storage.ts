import type { R2Bucket } from "@cloudflare/workers-types";

export class r2Storage{
    constructor(private bucket: R2Bucket){};

}