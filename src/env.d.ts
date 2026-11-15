/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    db: D1Database;
    r2: import("./domain/interfaces/storage-service").StorageService;
  }
}
