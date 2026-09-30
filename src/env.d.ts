/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    db: D1Database;
    r2: R2Storage;
  }
}