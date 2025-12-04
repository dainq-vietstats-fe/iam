import { jwkService } from '../../services/jwk.service';

/**
 * JWKS Endpoint
 *
 * Public endpoint để expose JWT public keys.
 * Services khác sẽ fetch keys từ đây để verify tokens.
 *
 * Standard endpoint: /.well-known/jwks.json
 * Alternative: /oidc/jwks.json
 *
 * Response format theo RFC 7517 (JSON Web Key Set)
 */
export default defineEventHandler(async (event) => {
  console.log('🔑 JWKS requested');

  const jwks = jwkService.getPublicJWKS();

  // Set cache headers
  setHeader(event, 'Cache-Control', 'public, max-age=3600'); // 1 hour
  setHeader(event, 'Content-Type', 'application/json');

  console.log(`   ✅ Returning ${jwks.keys.length} public keys`);

  return jwks;
});
