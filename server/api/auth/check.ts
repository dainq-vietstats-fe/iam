import { jwtVerify, decodeJwt } from 'jose';
import { envConfig } from '../../config/env.config';
import { jwkService } from '../../services/jwk.service';
import { userService } from '../../services/user.service';

/**
 * Check Authentication Endpoint
 *
 * Verify access token và return user info + authorization data.
 *
 * Flow:
 * 1. Extract access_token từ cookie
 * 2. Verify JWT signature
 * 3. Check expiration và claims
 * 4. Check tokenValidAfter (revocation)
 * 5. Get user details với roles và policies
 * 6. Return user info
 */
export default defineEventHandler(async (event) => {
  console.log('🔍 Auth check requested');

  const config = envConfig.get();

  // Extract tokens from cookies
  const accessToken = getCookie(event, `${config.tokenPrefix}access_token`);
  const idToken = getCookie(event, `${config.tokenPrefix}id_token`);

  if (!accessToken) {
    console.log('   ❌ No access token');
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  try {
    // Verify access token signature
    console.log('   🔐 Verifying access token...');

    const publicKey = await jwkService.getSigningKeyObject();

    const { payload } = await jwtVerify(accessToken, publicKey, {
      issuer: config.publicUrl,
      // audience: config.oidcClientId, // Skip audience check for flexibility
    });

    console.log('   ✅ Token signature valid');
    console.log(`   - sub: ${payload.sub}`);
    console.log(`   - exp: ${new Date((payload.exp || 0) * 1000).toISOString()}`);

    // Check tokenValidAfter (revocation check)
    const isValid = await userService.isTokenValid(
      payload.sub!,
      payload.iat || 0
    );

    if (!isValid) {
      console.log('   ❌ Token revoked');
      throw createError({
        statusCode: 401,
        message: 'Token has been revoked',
      });
    }

    console.log('   ✅ Token not revoked');

    // Decode ID token for user info (no verification needed, already verified via access token)
    let userInfo: any = {
      id: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
    };

    if (idToken) {
      try {
        const idPayload = decodeJwt(idToken);
        userInfo = {
          id: idPayload.sub,
          email: idPayload.email,
          name: idPayload.name,
          picture: idPayload.picture,
        };
      } catch {
        // ID token decode failed, use access token claims
      }
    }

    console.log('   📋 Fetching user authorization data...');

    // Get full user details with roles and policies
    const userDetails = await userService.getUserDetailsWithAuth(payload.sub!);

    console.log(`   ✅ User authorized: ${userDetails.user.email}`);
    console.log(`   - Roles: ${userDetails.roles.map(r => r.name).join(', ')}`);
    console.log(`   - Policies: ${userDetails.policies.length}`);

    // Return response
    return {
      authenticated: true,
      user: {
        id: userDetails.user.id,
        email: userDetails.user.email,
        name: userDetails.user.name,
        avatar: userDetails.user.avatar,
        status: userDetails.user.status,
      },
      roles: userDetails.roles.map((r) => r.name),
      policies: userDetails.policies,
      token: {
        issued_at: new Date((payload.iat || 0) * 1000).toISOString(),
        expires_at: new Date((payload.exp || 0) * 1000).toISOString(),
      },
    };
  } catch (error: any) {
    console.error('   ❌ Token verification failed:', error.message);

    // Clear invalid tokens
    deleteCookie(event, `${config.tokenPrefix}access_token`);
    deleteCookie(event, `${config.tokenPrefix}id_token`);
    deleteCookie(event, `${config.tokenPrefix}refresh_token`);

    throw createError({
      statusCode: 401,
      message: 'Invalid or expired token',
    });
  }
});
