
export interface StorageService {
  upload(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}