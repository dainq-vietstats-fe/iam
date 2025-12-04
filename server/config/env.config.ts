import type { EnvironmentConfig } from '../types';
import type { JWK } from 'jose';

/**
 * Environment Configuration Service
 *
 * Centralized service để load và validate environment variables
 * Sử dụng Singleton pattern để ensure chỉ load một lần
 */
class EnvironmentConfigService {
  private config: EnvironmentConfig | null = null;

  /**
   * Load và validate environment variables
   */
  load(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    console.log('🔧 Loading environment configuration...');

    // Required variables
    const requiredVars = [
      'DIRECTUS_URL',
      'DIRECTUS_TOKEN',
      'JWT_PRIMARY_PRIVATE_KEY',
      'JWT_PRIMARY_PUBLIC_KEY',
    ];

    // Check required variables
    const missing: string[] = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please copy .env.example to .env and fill in the values.'
      );
    }

    // Parse JWT keys
    let primaryPrivateKey: JWK;
    let primaryPublicKey: JWK;
    let secondaryPrivateKey: JWK | undefined;
    let secondaryPublicKey: JWK | undefined;

    try {
      primaryPrivateKey = JSON.parse(process.env.JWT_PRIMARY_PRIVATE_KEY!);
      primaryPublicKey = JSON.parse(process.env.JWT_PRIMARY_PUBLIC_KEY!);
    } catch (error) {
      throw new Error(
        'Failed to parse JWT keys. Make sure they are valid JSON.\n' +
        'Run "npm run generate:keys" to generate new keys.'
      );
    }

    // Parse secondary keys (optional)
    if (process.env.JWT_SECONDARY_PRIVATE_KEY && process.env.JWT_SECONDARY_PUBLIC_KEY) {
      try {
        secondaryPrivateKey = JSON.parse(process.env.JWT_SECONDARY_PRIVATE_KEY);
        secondaryPublicKey = JSON.parse(process.env.JWT_SECONDARY_PUBLIC_KEY);
        console.log('✅ Secondary JWT keys loaded (key rotation enabled)');
      } catch (error) {
        console.warn('⚠️  Failed to parse secondary JWT keys, key rotation disabled');
      }
    }

    // Validate JWT keys
    this.validateJWK(primaryPrivateKey, 'primary private');
    this.validateJWK(primaryPublicKey, 'primary public');

    if (secondaryPrivateKey && secondaryPublicKey) {
      this.validateJWK(secondaryPrivateKey, 'secondary private');
      this.validateJWK(secondaryPublicKey, 'secondary public');
    }

    // Build config object
    this.config = {
      // Server
      port: parseInt(process.env.PORT || '3000'),
      publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',

      // Directus
      directusUrl: process.env.DIRECTUS_URL!,
      directusToken: process.env.DIRECTUS_TOKEN!,

      // JWT Keys
      jwtPrimaryPrivateKey: primaryPrivateKey,
      jwtPrimaryPublicKey: primaryPublicKey,
      jwtSecondaryPrivateKey: secondaryPrivateKey,
      jwtSecondaryPublicKey: secondaryPublicKey,

      // OIDC
      oidcClientId: process.env.OIDC_CLIENT_ID || 'app',
      oidcClientSecret: process.env.OIDC_CLIENT_SECRET || 'app-secret',

      // Token TTL (parse to numbers)
      accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL || '3600'),
      refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL || '2592000'),
      idTokenTtl: parseInt(process.env.ID_TOKEN_TTL || '3600'),
      tokenPrefix: process.env.TOKEN_PREFIX || 'fidt_',
    };

    console.log('✅ Environment configuration loaded');
    console.log(`   - Public URL: ${this.config.publicUrl}`);
    console.log(`   - Directus: ${this.config.directusUrl}`);
    console.log(`   - OIDC Client: ${this.config.oidcClientId}`);
    console.log(`   - Access Token TTL: ${this.config.accessTokenTtl}s`);

    return this.config;
  }

  /**
   * Get config (must call load() first)
   */
  get(): EnvironmentConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Validate JWK format
   */
  private validateJWK(jwk: JWK, name: string): void {
    if (!jwk.kty) {
      throw new Error(`Invalid ${name} JWK: missing "kty" field`);
    }

    if (!jwk.kid) {
      throw new Error(`Invalid ${name} JWK: missing "kid" field`);
    }

    if (!jwk.alg) {
      throw new Error(`Invalid ${name} JWK: missing "alg" field`);
    }

    // Validate RSA keys
    if (jwk.kty === 'RSA') {
      if (!jwk.n || !jwk.e) {
        throw new Error(`Invalid ${name} RSA JWK: missing "n" or "e" fields`);
      }
    }

    // Validate EC keys
    if (jwk.kty === 'EC') {
      if (!jwk.crv || !jwk.x || !jwk.y) {
        throw new Error(`Invalid ${name} EC JWK: missing "crv", "x" or "y" fields`);
      }
    }
  }
}

// Export singleton instance
export const envConfig = new EnvironmentConfigService();
