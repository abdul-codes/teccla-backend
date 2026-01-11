import { StorageProvider } from './storage.interface';
import { LocalStorage } from './localStorage';
import { R2Storage } from './r2Storage';
import Logger from '../utils/logger';

/**
 * Factory function to get the configured storage provider
 * Returns the appropriate storage implementation based on environment
 */
export const getStorageProvider = (): StorageProvider => {
  const provider = process.env.STORAGE_PROVIDER || 'r2';

  switch (provider.toLowerCase()) {
    case 'local':
      return new LocalStorage();

    case 'r2':
      return new R2Storage();

    case 's3':
      // Could add S3Storage class here for direct AWS S3
      // For now, R2 covers S3-compatible API
      return new R2Storage();

    default:
      Logger.warn(`Unknown storage provider "${provider}", defaulting to r2`);
      return new R2Storage();
  }
};

// Export types
export type { StorageProvider, StorageResult } from './storage.interface';
