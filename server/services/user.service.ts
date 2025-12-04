import { getDirectusClient } from './directusDb.service';
import type { User, Role, Policy, UserDetailsResponse } from '../types';
import bcrypt from 'bcrypt';

/**
 * User Service
 *
 * Service để quản lý users, authentication, và authorization data.
 * Tương tác với Directus để:
 * - Lấy user information
 * - Verify passwords
 * - Lấy roles và policies của user
 */
export class UserService {
  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('users').readByQuery({
        filter: { email: { _eq: email } },
        limit: 1,
      });

      if (!result.data || result.data.length === 0) {
        return null;
      }

      return this.mapToUser(result.data[0]);
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('users').readOne(id);

      if (!result) {
        return null;
      }

      return this.mapToUser(result);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) {
      console.error('User has no password hash');
      return false;
    }

    try {
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('user_roles').readByQuery({
        filter: { user_id: { _eq: userId } },
        fields: ['role_id.*'],
      });

      if (!result.data || result.data.length === 0) {
        return [];
      }

      return result.data
        .map((ur: any) => this.mapToRole(ur.role_id))
        .filter((r: Role | null) => r !== null) as Role[];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  /**
   * Get policies for roles
   */
  async getRolePolicies(roleIds: string[]): Promise<Policy[]> {
    if (roleIds.length === 0) {
      return [];
    }

    try {
      const directus = getDirectusClient();

      const result = await directus.items('role_policies').readByQuery({
        filter: { role_id: { _in: roleIds } },
        fields: ['policy_id.*'],
      });

      if (!result.data || result.data.length === 0) {
        return [];
      }

      return result.data
        .map((rp: any) => this.mapToPolicy(rp.policy_id))
        .filter((p: Policy | null) => p !== null) as Policy[];
    } catch (error) {
      console.error('Error fetching role policies:', error);
      return [];
    }
  }

  /**
   * Get user với full authorization details (roles + policies)
   */
  async getUserDetailsWithAuth(userId: string): Promise<UserDetailsResponse> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get roles
    const roles = await this.getUserRoles(userId);

    // Get policies
    const roleIds = roles.map((r) => r.id);
    const policies = await this.getRolePolicies(roleIds);

    return {
      user: this.sanitizeUser(user),
      roles,
      policies,
    };
  }

  /**
   * Get user details by email with auth
   */
  async getUserDetailsByEmail(email: string): Promise<UserDetailsResponse> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    return this.getUserDetailsWithAuth(user.id);
  }

  /**
   * Create user (for testing/development)
   */
  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    avatar?: string;
  }): Promise<User> {
    const directus = getDirectusClient();

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    const result = await directus.items('users').createOne({
      email: data.email,
      password_hash,
      name: data.name,
      avatar: data.avatar,
      status: 'active',
      token_valid_after: new Date(),
    });

    return this.mapToUser(result);
  }

  /**
   * Update user's tokenValidAfter (for token revocation)
   */
  async revokeUserTokens(userId: string): Promise<void> {
    const directus = getDirectusClient();

    await directus.items('users').updateOne(userId, {
      token_valid_after: new Date(),
    });
  }

  /**
   * Check if token is still valid (not revoked)
   */
  async isTokenValid(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const user = await this.getUserById(userId);

    if (!user) {
      return false;
    }

    if (!user.token_valid_after) {
      return true; // No revocation timestamp set
    }

    const tokenValidAfterTimestamp = Math.floor(
      user.token_valid_after.getTime() / 1000
    );

    // Token is valid if issued after the revocation timestamp
    return tokenIssuedAt >= tokenValidAfterTimestamp;
  }

  // ========================
  // Private Helper Methods
  // ========================

  /**
   * Map Directus data to User type
   */
  private mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      password_hash: data.password_hash,
      name: data.name,
      avatar: data.avatar,
      status: data.status || 'active',
      token_valid_after: data.token_valid_after
        ? new Date(data.token_valid_after)
        : undefined,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
      updated_at: data.updated_at ? new Date(data.updated_at) : new Date(),
    };
  }

  /**
   * Map to Role type
   */
  private mapToRole(data: any): Role | null {
    if (!data || !data.id) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
    };
  }

  /**
   * Map to Policy type
   */
  private mapToPolicy(data: any): Policy | null {
    if (!data || !data.id) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      effect: data.effect || 'allow',
      resources: Array.isArray(data.resources) ? data.resources : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
      conditions: data.conditions || {},
      created_at: data.created_at ? new Date(data.created_at) : undefined,
    };
  }

  /**
   * Sanitize user (remove password_hash)
   */
  private sanitizeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

// Export singleton instance
export const userService = new UserService();
