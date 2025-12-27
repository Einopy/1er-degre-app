import { supabase } from '@/lib/supabase';
import type { Client, UserRoleLevel, RoleLevel, WorkshopFamily } from '@/lib/database.types';

export interface UserPermissions {
  adminClients: Client[];
  roleLevels: (UserRoleLevel & { role_level: RoleLevel & { workshop_family: WorkshopFamily } })[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canManageWorkshops: boolean;
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    const [adminClientsResult, roleLevelsResult, userResult] = await Promise.all([
      supabase
        .from('client_admins')
        .select('client:clients(*)')
        .eq('user_id', userId),
      supabase
        .from('user_role_levels')
        .select(`
          *,
          role_level:role_levels(
            *,
            workshop_family:workshop_families(*)
          )
        `)
        .eq('user_id', userId),
      supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const adminClients = ((adminClientsResult.data || []) as any[])
      .map((ca: any) => ca.client)
      .filter((client: any): client is Client => client !== null);

    const roleLevels = (roleLevelsResult.data || []) as any[];

    const isSuperAdmin = (userResult.data as any)?.is_super_admin || false;
    const isAdmin = adminClients.length > 0;
    const canManageWorkshops = roleLevels.length > 0;

    return {
      adminClients,
      roleLevels,
      isAdmin,
      isSuperAdmin,
      canManageWorkshops,
    };
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return {
      adminClients: [],
      roleLevels: [],
      isAdmin: false,
      isSuperAdmin: false,
      canManageWorkshops: false,
    };
  }
}

export async function hasAnyWorkshopPermissions(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking workshop permissions:', error);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Error in hasAnyWorkshopPermissions:', error);
    return false;
  }
}

export async function getUserWorkshopFamiliesForClient(
  userId: string,
  clientId: string
): Promise<WorkshopFamily[]> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select(`
        role_level:role_levels!inner(
          workshop_family:workshop_families!inner(*)
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching workshop families:', error);
      return [];
    }

    const familiesMap = new Map<string, WorkshopFamily>();
    (data || []).forEach((item: any) => {
      const family = item.role_level?.workshop_family;
      if (family && family.client_id === clientId && !familiesMap.has(family.id)) {
        familiesMap.set(family.id, family);
      }
    });

    return Array.from(familiesMap.values());
  } catch (error) {
    console.error('Error in getUserWorkshopFamiliesForClient:', error);
    return [];
  }
}

export async function isClientAdminForClient(userId: string, clientId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('client_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      console.error('Error checking client admin status:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Error in isClientAdminForClient:', error);
    return false;
  }
}

export async function hasRoleLevelForFamily(
  userId: string,
  workshopFamilyId: string,
  minLevel: number = 1
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select(`
        role_level:role_levels!inner(
          level,
          workshop_family_id
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking role level for family:', error);
      return false;
    }

    return (data || []).some((item: any) => {
      const roleLevel = item.role_level;
      return roleLevel?.workshop_family_id === workshopFamilyId && roleLevel?.level >= minLevel;
    });
  } catch (error) {
    console.error('Error in hasRoleLevelForFamily:', error);
    return false;
  }
}

export async function getUserHighestLevelForFamily(
  userId: string,
  workshopFamilyId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_role_levels')
      .select(`
        role_level:role_levels!inner(
          level,
          workshop_family_id
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting highest level for family:', error);
      return 0;
    }

    const levels = (data || [])
      .filter((item: any) => item.role_level?.workshop_family_id === workshopFamilyId)
      .map((item: any) => item.role_level?.level || 0);

    return levels.length > 0 ? Math.max(...levels) : 0;
  } catch (error) {
    console.error('Error in getUserHighestLevelForFamily:', error);
    return 0;
  }
}
