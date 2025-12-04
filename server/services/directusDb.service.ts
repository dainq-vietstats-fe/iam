import { Directus } from '@directus/sdk';
import { envConfig } from '../config/env.config';

/**
 * Directus Database Service
 *
 * Singleton service để quản lý connection đến Directus CMS.
 * Directus được dùng làm:
 * - User database (users, roles, permissions)
 * - OIDC data store (sessions, codes, tokens)
 * - Configuration store
 */
class DirectusDbService {
  private static instance: Directus<any> | null = null;
  private static isInitialized = false;

  /**
   * Get Directus client instance (singleton)
   */
  static getInstance(): Directus<any> {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance!;
  }

  /**
   * Initialize Directus connection
   */
  private static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log('📦 Initializing Directus connection...');

    const config = envConfig.get();

    try {
      this.instance = new Directus(config.directusUrl, {
        auth: {
          staticToken: config.directusToken,
        },
      });

      console.log(`   ✅ Connected to: ${config.directusUrl}`);
      console.log('✅ Directus connection initialized\n');

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Directus:', error);
      throw new Error('Failed to connect to Directus');
    }
  }

  /**
   * Test connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getInstance();
      await client.server.ping();
      console.log('✅ Directus connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Directus connection test failed:', error);
      return false;
    }
  }

  /**
   * Reset instance (for testing)
   */
  static reset(): void {
    this.instance = null;
    this.isInitialized = false;
  }
}

/**
 * Helper function để get Directus client
 * Sử dụng trong các services khác
 */
export function getDirectusClient(): Directus<any> {
  return DirectusDbService.getInstance();
}

export { DirectusDbService };
