import { getOIDCProvider } from './provider';

/**
 * OIDC Provider Catch-All Endpoint
 *
 * Handle tất cả OIDC requests:
 * - /oidc/auth (authorization endpoint)
 * - /oidc/token (token endpoint)
 * - /oidc/me (userinfo endpoint)
 * - /oidc/jwks (JWKS endpoint)
 * - /oidc/session/end (logout endpoint)
 * - /oidc/.well-known/openid-configuration (discovery)
 * - etc.
 *
 * Tất cả được forward đến node-oidc-provider để xử lý.
 */
export default defineEventHandler(async (event) => {
  const provider = getOIDCProvider();
  const req = event.node.req;
  const res = event.node.res;

  console.log(`🔗 OIDC Request: ${req.method} ${req.url}`);

  // Pass request to OIDC provider
  // Provider sẽ handle routing internally
  return new Promise<void>((resolve, reject) => {
    provider
      .callback()(req, res)
      .then(() => resolve())
      .catch((error) => {
        console.error('❌ OIDC Provider error:', error);
        reject(error);
      });
  });
});
