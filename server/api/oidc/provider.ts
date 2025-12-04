import Provider from 'oidc-provider';
import { getOIDCConfiguration } from './configuration';
import { envConfig } from '../../config/env.config';

/**
 * OIDC Provider Instance
 *
 * Singleton instance của node-oidc-provider.
 * Initialize một lần và reuse trong suốt app lifecycle.
 */

let providerInstance: Provider | null = null;

/**
 * Get OIDC Provider instance
 * Tạo mới nếu chưa tồn tại (singleton pattern)
 */
export function getOIDCProvider(): Provider {
  if (!providerInstance) {
    console.log('🚀 Initializing OIDC Provider...');

    const config = envConfig.get();
    const oidcConfig = getOIDCConfiguration();

    providerInstance = new Provider(config.publicUrl, oidcConfig);

    // Event listeners cho debugging
    providerInstance.on('grant.success', (ctx) => {
      console.log('✅ Grant successful:', {
        client: ctx.oidc.client?.clientId,
        user: ctx.oidc.session?.accountId,
      });
    });

    providerInstance.on('grant.error', (ctx, error) => {
      console.error('❌ Grant error:', error.message);
    });

    providerInstance.on('grant.revoked', (ctx, grantId) => {
      console.log('🔒 Grant revoked:', grantId);
    });

    providerInstance.on('authorization.success', (ctx) => {
      console.log('✅ Authorization successful:', {
        client: ctx.oidc.client?.clientId,
        user: ctx.oidc.session?.accountId,
      });
    });

    providerInstance.on('authorization.error', (ctx, error) => {
      console.error('❌ Authorization error:', error.message);
    });

    providerInstance.on('end_session.success', (ctx) => {
      console.log('👋 Session ended');
    });

    console.log('✅ OIDC Provider initialized');
    console.log(`   - Issuer: ${config.publicUrl}`);
    console.log(`   - Endpoints: ${config.publicUrl}/oidc/*`);
  }

  return providerInstance;
}

/**
 * Reset provider (for testing)
 */
export function resetProvider(): void {
  providerInstance = null;
}
