import { supabase } from '@/lib/supabase';
import type { UserRoleLevel, RoleLevel } from '@/lib/database.types';

/**
 * Get all role levels for a user, optionally filtered by client and/or family
 */
export async function getUserRoleLevels(
  userId: string,
  clientId?: string,
  familyId?: string
): Promise<(UserRoleLevel & { role_level: RoleLevel })[]> {
  try {
    let query = supabase
      .from('user_role_levels')
      .select(`
        *,
        role_level:role_levels(*)
      `)
      .eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user role levels:', error);
      return [];
    }

    let results = (data || []) as any[];

    // Filter by client_id if provided
    if (clientId) {
      results = results.filter((item: any) =>
        item.role_level?.client_id === clientId
      );
    }

    // Filter by workshop_family_id if provided
    if (familyId) {
      results = results.filter((item: any) =>
        item.role_level?.workshop_family_id === familyId
      );
    }

    return results;
  } catch (error) {
    console.error('Error in getUserRoleLevels:', error);
    return [];
  }
}

/**
 * Check if user has a specific role level
 */
export async function hasRoleLevel(
  userId: string,
  clientId: string,
  familyId: string,
  internalKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select(`
        id,
        role_level:role_levels!inner(
          id,
          client_id,
          workshop_family_id,
          internal_key
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking role level:', error);
      return false;
    }

    const hasLevel = (data || []).some((item: any) =>
      item.role_level?.client_id === clientId &&
      item.role_level?.workshop_family_id === familyId &&
      item.role_level?.internal_key === internalKey
    );

    return hasLevel;
  } catch (error) {
    console.error('Error in hasRoleLevel:', error);
    return false;
  }
}

/**
 * Get user's highest role level for a client/family
 */
export async function getUserHighestLevel(
  userId: string,
  clientId: string,
  familyId: string
): Promise<number> {
  try {
    const roleLevels = await getUserRoleLevels(userId, clientId, familyId);

    if (roleLevels.length === 0) return 0;

    const maxLevel = Math.max(...roleLevels.map((rl: any) => rl.role_level?.level || 0));
    return maxLevel;
  } catch (error) {
    console.error('Error in getUserHighestLevel:', error);
    return 0;
  }
}

/**
 * Grant a role level to a user
 */
export async function grantRoleLevel(
  userId: string,
  roleLevelId: string,
  grantedBy?: string
): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('user_role_levels') as any)
      .insert({
        user_id: userId,
        role_level_id: roleLevelId,
        granted_by: grantedBy || null,
      });

    if (error) {
      console.error('Error granting role level:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in grantRoleLevel:', error);
    return false;
  }
}

/**
 * Revoke a role level from a user
 */
export async function revokeRoleLevel(
  userId: string,
  roleLevelId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_role_levels')
      .delete()
      .eq('user_id', userId)
      .eq('role_level_id', roleLevelId);

    if (error) {
      console.error('Error revoking role level:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in revokeRoleLevel:', error);
    return false;
  }
}

/**
 * Check if user has any role level (i.e., is an animator)
 */
export async function hasAnyRoleLevel(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking for any role level:', error);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Error in hasAnyRoleLevel:', error);
    return false;
  }
}

/**
 * Get all clients where user has any role level
 */
export async function getUserClients(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select(`
        role_level:role_levels!inner(
          client:clients(*)
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user clients:', error);
      return [];
    }

    // Extract unique clients
    const clientsMap = new Map();
    (data || []).forEach((item: any) => {
      const client = item.role_level?.client;
      if (client && !clientsMap.has(client.id)) {
        clientsMap.set(client.id, client);
      }
    });

    return Array.from(clientsMap.values());
  } catch (error) {
    console.error('Error in getUserClients:', error);
    return [];
  }
}
