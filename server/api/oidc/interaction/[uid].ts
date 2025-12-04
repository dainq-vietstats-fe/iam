import { getOIDCProvider } from '../provider';
import { userService } from '../../../services/user.service';

/**
 * OIDC Interaction Handler
 *
 * Handle login và consent interactions.
 *
 * GET: Lấy interaction details (để hiển thị login form)
 * POST: Submit credentials và finish interaction
 */
export default defineEventHandler(async (event) => {
  const provider = getOIDCProvider();
  const uid = getRouterParam(event, 'uid');
  const method = getMethod(event);

  if (!uid) {
    throw createError({
      statusCode: 400,
      message: 'Missing interaction UID',
    });
  }

  console.log(`🔄 Interaction ${method}: ${uid}`);

  // GET: Return interaction details
  if (method === 'GET') {
    try {
      const details = await provider.interactionDetails(
        event.node.req,
        event.node.res
      );

      console.log('   📋 Interaction details:');
      console.log(`   - prompt: ${details.prompt.name}`);
      console.log(`   - client: ${details.params.client_id}`);

      return {
        uid: details.uid,
        prompt: details.prompt.name,
        params: details.params,
        session: details.session,
      };
    } catch (error: any) {
      console.error('   ❌ Failed to get interaction details:', error.message);
      throw createError({
        statusCode: 400,
        message: 'Invalid interaction',
      });
    }
  }

  // POST: Submit credentials và finish interaction
  if (method === 'POST') {
    const body = await readBody(event);

    console.log('   🔐 Processing login...');

    try {
      // Get interaction details
      const details = await provider.interactionDetails(
        event.node.req,
        event.node.res
      );

      // Handle login prompt
      if (details.prompt.name === 'login') {
        const { email, password } = body;

        if (!email || !password) {
          throw createError({
            statusCode: 400,
            message: 'Email and password required',
          });
        }

        console.log(`   👤 Authenticating: ${email}`);

        // Get user from database
        const user = await userService.getUserByEmail(email);

        if (!user) {
          console.log('   ❌ User not found');
          throw createError({
            statusCode: 401,
            message: 'Invalid credentials',
          });
        }

        // Verify password
        const isValid = await userService.verifyPassword(user, password);

        if (!isValid) {
          console.log('   ❌ Invalid password');
          throw createError({
            statusCode: 401,
            message: 'Invalid credentials',
          });
        }

        // Check user status
        if (user.status !== 'active') {
          console.log('   ❌ User suspended');
          throw createError({
            statusCode: 403,
            message: 'Account suspended',
          });
        }

        console.log('   ✅ Authentication successful');

        // Finish interaction - login successful
        const result = await provider.interactionFinished(
          event.node.req,
          event.node.res,
          {
            login: {
              accountId: user.id,
              // Remember login for 7 days
              remember: true,
              ts: Math.floor(Date.now() / 1000),
            },
          },
          { mergeWithLastSubmission: false }
        );

        console.log('   🎉 Interaction finished, redirecting...');

        return {
          success: true,
          redirect: result,
        };
      }

      // Handle consent prompt
      if (details.prompt.name === 'consent') {
        console.log('   ✅ Auto-granting consent');

        // Auto-grant consent (for development)
        const grant = details.grantId
          ? await provider.Grant.find(details.grantId)
          : new provider.Grant({
              accountId: details.session!.accountId,
              clientId: details.params.client_id as string,
            });

        if (!grant) {
          throw new Error('Grant not found');
        }

        // Grant requested scopes
        grant.addOIDCScope((details.params.scope as string) || 'openid');

        const grantId = await grant.save();

        const result = await provider.interactionFinished(
          event.node.req,
          event.node.res,
          {
            consent: {
              grantId,
            },
          },
          { mergeWithLastSubmission: true }
        );

        return {
          success: true,
          redirect: result,
        };
      }

      throw createError({
        statusCode: 400,
        message: `Unknown prompt: ${details.prompt.name}`,
      });
    } catch (error: any) {
      console.error('   ❌ Interaction failed:', error.message);

      if (error.statusCode) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        message: 'Interaction failed',
      });
    }
  }

  throw createError({
    statusCode: 405,
    message: 'Method not allowed',
  });
});
