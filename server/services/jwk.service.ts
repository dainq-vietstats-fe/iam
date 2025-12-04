import { importJWK, type JWK, type KeyLike } from 'jose';
import { envConfig } from '../config/env.config';

/**
 * JWK Service
 *
 * Quản lý JWT Web Keys cho signing và verification.
 * Hỗ trợ key rotation với primary và secondary keys.
 *
 * Key Rotation Strategy:
 * 1. Primary key: Active key để sign mọi tokens mới
 * 2. Secondary key: Old key vẫn valid để verify tokens cũ
 * 3. Khi rotate: Secondary -> Archive, Primary -> Secondary, New -> Primary
 */
export class JWKService {
  private primaryPrivateKey: JWK | null = null;
  private primaryPublicKey: JWK | null = null;
  private secondaryPrivateKey: JWK | null = null;
  private secondaryPublicKey: JWK | null = null;

  private isInitialized = false;

  /**
   * Initialize service - load keys từ environment
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️  JWK Service already initialized');
      return;
    }

    console.log('🔑 Initializing JWK Service...');

    const config = envConfig.get();

    // Load primary keys
    this.primaryPrivateKey = config.jwtPrimaryPrivateKey;
    this.primaryPublicKey = config.jwtPrimaryPublicKey;

    console.log(`   ✅ Primary key loaded (kid: ${this.primaryPrivateKey.kid})`);

    // Load secondary keys (optional)
    if (config.jwtSecondaryPrivateKey && config.jwtSecondaryPublicKey) {
      this.secondaryPrivateKey = config.jwtSecondaryPrivateKey;
      this.secondaryPublicKey = config.jwtSecondaryPublicKey;
      console.log(`   ✅ Secondary key loaded (kid: ${this.secondaryPrivateKey.kid})`);
      console.log('   🔄 Key rotation enabled');
    } else {
      console.log('   ⚠️  No secondary key (key rotation disabled)');
    }

    this.isInitialized = true;
    console.log('✅ JWK Service initialized\n');
  }

  /**
   * Get signing key (private key) để sign JWTs
   * Luôn return primary key
   */
  getSigningKey(): JWK {
    this.ensureInitialized();

    if (!this.primaryPrivateKey) {
      throw new Error('Primary private key not loaded');
    }

    return this.primaryPrivateKey;
  }

  /**
   * Get signing key as KeyLike object (for jose library)
   */
  async getSigningKeyObject(): Promise<KeyLike> {
    const jwk = this.getSigningKey();
    return await importJWK(jwk, 'RS256');
  }

  /**
   * Get public JWKS (JSON Web Key Set)
   * Dùng để publish public keys cho services khác verify tokens
   *
   * Format theo RFC 7517
   */
  getPublicJWKS(): { keys: JWK[] } {
    this.ensureInitialized();

    const keys: JWK[] = [];

    // Add primary public key
    if (this.primaryPublicKey) {
      keys.push(this.primaryPublicKey);
    }

    // Add secondary public key (for old tokens)
    if (this.secondaryPublicKey) {
      keys.push(this.secondaryPublicKey);
    }

    return { keys };
  }

  /**
   * Find public key by kid (Key ID)
   * Dùng khi verify JWT - extract kid từ header và tìm matching key
   */
  findPublicKey(kid: string): JWK | undefined {
    this.ensureInitialized();

    if (this.primaryPublicKey?.kid === kid) {
      return this.primaryPublicKey;
    }

    if (this.secondaryPublicKey?.kid === kid) {
      return this.secondaryPublicKey;
    }

    return undefined;
  }

  /**
   * Find public key as KeyLike object
   */
  async findPublicKeyObject(kid: string): Promise<KeyLike | undefined> {
    const jwk = this.findPublicKey(kid);
    if (!jwk) return undefined;

    return await importJWK(jwk, 'RS256');
  }

  /**
   * Get primary key ID
   */
  getPrimaryKid(): string {
    this.ensureInitialized();

    if (!this.primaryPrivateKey?.kid) {
      throw new Error('Primary key ID not found');
    }

    return this.primaryPrivateKey.kid;
  }

  /**
   * Check if key rotation is enabled
   */
  isKeyRotationEnabled(): boolean {
    return !!(this.secondaryPrivateKey && this.secondaryPublicKey);
  }

  /**
   * Get key info (for debugging)
   */
  getKeyInfo(): {
    primary: { kid: string; alg: string };
    secondary?: { kid: string; alg: string };
    rotationEnabled: boolean;
  } {
    this.ensureInitialized();

    return {
      primary: {
        kid: this.primaryPrivateKey!.kid!,
        alg: this.primaryPrivateKey!.alg!,
      },
      secondary: this.secondaryPrivateKey
        ? {
            kid: this.secondaryPrivateKey.kid!,
            alg: this.secondaryPrivateKey.alg!,
          }
        : undefined,
      rotationEnabled: this.isKeyRotationEnabled(),
    };
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'JWK Service not initialized. Call initialize() first.'
      );
    }
  }
}

// Export singleton instance
export const jwkService = new JWKService();
