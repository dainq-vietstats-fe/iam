import { getDirectusClient } from './directusDb.service';
import type { OIDCData } from '../types';

/**
 * OIDC Directus Adapter
 *
 * Adapter implementation cho node-oidc-provider để lưu OIDC data vào Directus.
 *
 * OIDC Provider cần persist các loại data:
 * - AuthorizationCode: Authorization codes (short-lived)
 * - AccessToken: Access tokens
 * - RefreshToken: Refresh tokens
 * - Session: User sessions
 * - Grant: Authorization grants
 * - Interaction: Login/consent interactions
 * - DeviceCode: Device flow codes
 * - ClientCredentials: Client credentials tokens
 *
 * Tất cả được lưu trong table `oidc_data` với structure:
 * {
 *   internal_id: string (PK)
 *   kind: string
 *   session_id?: string
 *   value: jsonb (OIDC payload)
 *   exp?: number
 *   iat?: number
 * }
 */
export class OIDCDirectusAdapter {
  /**
   * Upsert OIDC data
   * Tạo mới hoặc update existing record
   */
  async upsert(id: string, payload: any, expiresIn: number): Promise<void> {
    try {
      const directus = getDirectusClient();

      const now = Math.floor(Date.now() / 1000);
      const exp = now + expiresIn;

      const oidcData: Partial<OIDCData> = {
        internal_id: id,
        kind: payload.kind,
        session_id: payload.uid || payload.sessionUid,
        value: payload,
        exp,
        iat: now,
      };

      // Try to read existing record
      try {
        await directus.items('oidc_data').readOne(id);
        // Record exists, update it
        await directus.items('oidc_data').updateOne(id, oidcData);
        console.log(`📝 Updated OIDC data: ${payload.kind} (${id})`);
      } catch {
        // Record doesn't exist, create it
        await directus.items('oidc_data').createOne(oidcData);
        console.log(`✨ Created OIDC data: ${payload.kind} (${id})`);
      }
    } catch (error) {
      console.error('Error upserting OIDC data:', error);
      throw error;
    }
  }

  /**
   * Find OIDC data by ID
   */
  async find(id: string): Promise<any | null> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('oidc_data').readOne(id);

      if (!result) {
        return null;
      }

      const data = result as OIDCData;

      // Check expiration
      if (data.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (data.exp < now) {
          console.log(`⏰ OIDC data expired: ${data.kind} (${id})`);
          // Delete expired data
          await this.destroy(id);
          return null;
        }
      }

      console.log(`🔍 Found OIDC data: ${data.kind} (${id})`);
      return data.value;
    } catch (error) {
      // Not found
      return null;
    }
  }

  /**
   * Find by user code (for Device Flow)
   */
  async findByUserCode(userCode: string): Promise<any | null> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('oidc_data').readByQuery({
        filter: {
          kind: { _eq: 'DeviceCode' },
          'value.userCode': { _eq: userCode },
        },
        limit: 1,
      });

      if (!result.data || result.data.length === 0) {
        return null;
      }

      const data = result.data[0] as OIDCData;

      // Check expiration
      if (data.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (data.exp < now) {
          await this.destroy(data.internal_id);
          return null;
        }
      }

      return data.value;
    } catch (error) {
      console.error('Error finding by user code:', error);
      return null;
    }
  }

  /**
   * Find by UID (for Interactions)
   */
  async findByUid(uid: string): Promise<any | null> {
    try {
      const directus = getDirectusClient();

      const result = await directus.items('oidc_data').readByQuery({
        filter: {
          kind: { _eq: 'Interaction' },
          session_id: { _eq: uid },
        },
        limit: 1,
      });

      if (!result.data || result.data.length === 0) {
        return null;
      }

      return result.data[0].value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Destroy OIDC data
   */
  async destroy(id: string): Promise<void> {
    try {
      const directus = getDirectusClient();

      await directus.items('oidc_data').deleteOne(id);
      console.log(`🗑️  Deleted OIDC data: ${id}`);
    } catch (error) {
      // Ignore errors (already deleted or not found)
    }
  }

  /**
   * Consume OIDC data (mark as used)
   * Dùng cho authorization codes và device codes
   */
  async consume(id: string): Promise<void> {
    try {
      const directus = getDirectusClient();

      const data = await directus.items('oidc_data').readOne(id);

      if (data) {
        const oidcData = data as OIDCData;
        const value = oidcData.value;

        // Mark as consumed
        value.consumed = Math.floor(Date.now() / 1000);

        await directus.items('oidc_data').updateOne(id, {
          value,
        });

        console.log(`✅ Consumed OIDC data: ${oidcData.kind} (${id})`);
      }
    } catch (error) {
      console.error('Error consuming OIDC data:', error);
    }
  }

  /**
   * Revoke by grant ID
   * Xóa tất cả tokens và codes liên quan đến một grant
   */
  async revokeByGrantId(grantId: string): Promise<void> {
    try {
      const directus = getDirectusClient();

      // Find all items with this grantId
      const result = await directus.items('oidc_data').readByQuery({
        filter: {
          'value.grantId': { _eq: grantId },
        },
        fields: ['internal_id', 'kind'],
      });

      if (!result.data || result.data.length === 0) {
        return;
      }

      // Delete all items
      const ids = result.data.map((d: any) => d.internal_id);

      for (const id of ids) {
        await this.destroy(id);
      }

      console.log(`🔒 Revoked grant: ${grantId} (${ids.length} items)`);
    } catch (error) {
      console.error('Error revoking by grant ID:', error);
    }
  }

  /**
   * Clean expired data
   * Nên chạy định kỳ (cron job) để cleanup
   */
  async cleanExpired(): Promise<number> {
    try {
      const directus = getDirectusClient();

      const now = Math.floor(Date.now() / 1000);

      // Find expired items
      const result = await directus.items('oidc_data').readByQuery({
        filter: {
          exp: { _lt: now },
        },
        fields: ['internal_id'],
        limit: 1000,
      });

      if (!result.data || result.data.length === 0) {
        return 0;
      }

      // Delete expired items
      const ids = result.data.map((d: any) => d.internal_id);

      for (const id of ids) {
        await this.destroy(id);
      }

      console.log(`🧹 Cleaned ${ids.length} expired OIDC records`);
      return ids.length;
    } catch (error) {
      console.error('Error cleaning expired data:', error);
      return 0;
    }
  }
}

/**
 * Factory function để create adapter instance
 * Dùng bởi OIDC Provider
 */
export function createOIDCAdapter(name: string) {
  const adapter = new OIDCDirectusAdapter();

  return class {
    constructor(private modelName: string) {
      console.log(`🔌 OIDC Adapter created for: ${modelName}`);
    }

    async upsert(id: string, payload: any, expiresIn: number) {
      return adapter.upsert(id, payload, expiresIn);
    }

    async find(id: string) {
      return adapter.find(id);
    }

    async findByUserCode(userCode: string) {
      return adapter.findByUserCode(userCode);
    }

    async findByUid(uid: string) {
      return adapter.findByUid(uid);
    }

    async destroy(id: string) {
      return adapter.destroy(id);
    }

    async consume(id: string) {
      return adapter.consume(id);
    }

    async revokeByGrantId(grantId: string) {
      return adapter.revokeByGrantId(grantId);
    }
  };
}

// Export singleton instance
export const oidcAdapter = new OIDCDirectusAdapter();
