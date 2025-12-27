import { supabase } from '@/lib/supabase';
import type {
  WorkshopFamily,
  WorkshopType,
  RoleLevel,
  RoleRequirement,
  ClientLanguage,
} from '@/lib/database.types';

export interface WorkshopFamilyWithTypes extends WorkshopFamily {
  workshop_types?: WorkshopType[];
}

export interface RoleLevelWithRequirements extends RoleLevel {
  requirements?: RoleRequirement;
  workshop_family?: Pick<WorkshopFamily, 'id' | 'code' | 'name'>;
}

// =====================================================
// WORKSHOP FAMILIES
// =====================================================

export async function fetchWorkshopFamilies(clientId: string): Promise<WorkshopFamily[]> {
  console.log('[client-config] fetchWorkshopFamilies → clientId =', clientId);

  const { data, error } = await supabase
    .from('workshop_families')
    .select('*')
    .eq('client_id', clientId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[client-config] fetchWorkshopFamilies error:', error);
    throw error;
  }

  console.log(
    '[client-config] fetchWorkshopFamilies result length =',
    data?.length ?? 0,
    data,
  );

  return data || [];
}

export async function fetchWorkshopFamilyById(id: string): Promise<WorkshopFamily | null> {
  const { data, error } = await supabase
    .from('workshop_families')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createWorkshopFamily(
  family: Omit<WorkshopFamily, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkshopFamily> {
  const { data, error } = await supabase
    .from('workshop_families')
    .insert(family as any)
    .select()
    .single();

  if (error) throw error;
  return data as WorkshopFamily;
}

export async function updateWorkshopFamily(
  id: string,
  updates: Partial<Omit<WorkshopFamily, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<WorkshopFamily> {
  console.log('[client-config] updateWorkshopFamily → id =', id, 'updates =', updates);

  const { data, error } = await (supabase as any)
    .from('workshop_families')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[client-config] updateWorkshopFamily error:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Workshop family not found or update not permitted');
  }

  console.log('[client-config] updateWorkshopFamily result:', data);
  return data as WorkshopFamily;
}

export async function deleteWorkshopFamily(id: string): Promise<void> {
  const { error } = await supabase
    .from('workshop_families')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// WORKSHOP TYPES
// =====================================================

export async function fetchWorkshopTypes(
  clientId: string,
  familyId?: string
): Promise<WorkshopType[]> {
  let query = supabase
    .from('workshop_types')
    .select('*')
    .eq('client_id', clientId);

  if (familyId) {
    query = query.eq('workshop_family_id', familyId);
  }

  const { data, error } = await query.order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchWorkshopTypeById(id: string): Promise<WorkshopType | null> {
  const { data, error } = await supabase
    .from('workshop_types')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchWorkshopTypeByCode(
  clientId: string,
  code: string
): Promise<WorkshopType | null> {
  const { data, error} = await supabase
    .from('workshop_types')
    .select('*')
    .eq('client_id', clientId)
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createWorkshopType(
  type: Omit<WorkshopType, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkshopType> {
  const { data, error } = await supabase
    .from('workshop_types')
    .insert(type as any)
    .select()
    .single();

  if (error) throw error;
  return data as WorkshopType;
}

export async function updateWorkshopType(
  id: string,
  updates: Partial<Omit<WorkshopType, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<WorkshopType> {
  const { data, error } = await (supabase as any)
    .from('workshop_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Workshop type not found or update not permitted');
  return data as WorkshopType;
}

export async function deleteWorkshopType(id: string): Promise<void> {
  const { error } = await supabase
    .from('workshop_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ROLE LEVELS
// =====================================================

export async function fetchRoleLevels(
  clientId: string,
  familyId?: string
): Promise<RoleLevelWithRequirements[]> {
  console.log('[client-config] fetchRoleLevels → clientId =', clientId, 'familyId =', familyId);

  let query = (supabase as any)
    .from('role_levels')
    .select(`
      *,
      requirements:role_requirements(*),
      workshop_family:workshop_families(id, code, name)
    `)
    .eq('client_id', clientId);

  if (familyId) {
    query = query.eq('workshop_family_id', familyId);
  }

  const { data, error } = await query.order('level', { ascending: true });

  if (error) {
    console.error('[client-config] fetchRoleLevels error:', error);
    throw error;
  }

  console.log(
    '[client-config] fetchRoleLevels result length =',
    data?.length ?? 0,
    data,
  );

  return (data || []).map((item: any) => ({
    ...item,
    requirements: Array.isArray(item.requirements) ? item.requirements[0] : item.requirements,
    workshop_family: Array.isArray(item.workshop_family)
      ? item.workshop_family[0]
      : item.workshop_family,
  }));
}

export async function fetchRoleLevelById(id: string): Promise<RoleLevelWithRequirements | null> {
  const { data, error } = await (supabase as any)
    .from('role_levels')
    .select(`
      *,
      requirements:role_requirements(*),
      workshop_family:workshop_families(id, code, name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    requirements: Array.isArray(data.requirements) ? data.requirements[0] : data.requirements,
    workshop_family: Array.isArray(data.workshop_family)
      ? data.workshop_family[0]
      : data.workshop_family,
  } as RoleLevelWithRequirements;
}

export async function createRoleLevel(
  role: Omit<RoleLevel, 'id' | 'created_at' | 'updated_at'>
): Promise<RoleLevel> {
  const { data, error } = await supabase
    .from('role_levels')
    .insert(role as any)
    .select()
    .single();

  if (error) throw error;
  return data as RoleLevel;
}

export async function updateRoleLevel(
  id: string,
  updates: Partial<Omit<RoleLevel, 'id' | 'client_id' | 'workshop_family_id' | 'level' | 'internal_key' | 'created_at' | 'updated_at'>>
): Promise<RoleLevel> {
  const { data, error } = await (supabase as any)
    .from('role_levels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Role level not found or update not permitted');
  return data as RoleLevel;
}

export async function deleteRoleLevel(id: string): Promise<void> {
  const { error } = await supabase
    .from('role_levels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// ROLE REQUIREMENTS
// =====================================================

export async function fetchRoleRequirements(roleLevelId: string): Promise<RoleRequirement | null> {
  const { data, error } = await supabase
    .from('role_requirements')
    .select('*')
    .eq('role_level_id', roleLevelId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertRoleRequirements(
  requirements: Omit<RoleRequirement, 'id' | 'created_at' | 'updated_at'>
): Promise<RoleRequirement> {
  const { data, error } = await supabase
    .from('role_requirements')
    .upsert(
      { ...requirements, updated_at: new Date().toISOString() } as any,
      { onConflict: 'role_level_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as RoleRequirement;
}

export async function deleteRoleRequirements(roleLevelId: string): Promise<void> {
  const { error } = await supabase
    .from('role_requirements')
    .delete()
    .eq('role_level_id', roleLevelId);

  if (error) throw error;
}

// =====================================================
// CLIENT LANGUAGES
// =====================================================

export async function fetchClientLanguages(
  clientId: string,
  familyId?: string | null
): Promise<ClientLanguage[]> {
  let query = supabase
    .from('client_languages')
    .select('*')
    .eq('client_id', clientId);

  if (familyId !== undefined) {
    if (familyId === null) {
      query = query.is('workshop_family_id', null);
    } else {
      query = query.eq('workshop_family_id', familyId);
    }
  }

  const { data, error } = await query.order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchClientLanguageById(id: string): Promise<ClientLanguage | null> {
  const { data, error } = await supabase
    .from('client_languages')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createClientLanguage(
  language: Omit<ClientLanguage, 'id' | 'created_at' | 'updated_at'>
): Promise<ClientLanguage> {
  const { data, error } = await supabase
    .from('client_languages')
    .insert(language as any)
    .select()
    .single();

  if (error) throw error;
  return data as ClientLanguage;
}

export async function updateClientLanguage(
  id: string,
  updates: Partial<Omit<ClientLanguage, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<ClientLanguage> {
  const { data, error } = await (supabase as any)
    .from('client_languages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Client language not found or update not permitted');
  return data as ClientLanguage;
}

export async function deleteClientLanguage(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_languages')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function generateRoleCode(familyCode: string, internalKey: string): string {
  return `${familyCode}_${internalKey}`;
}

export async function validateWorkshopFamilyComplete(familyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('role_levels')
    .select('level')
    .eq('workshop_family_id', familyId);

  if (error) throw error;
  if (!data) return false;

  const levels = new Set((data as any).map((r: any) => r.level));
  return levels.size === 4 && [1, 2, 3, 4].every((level) => levels.has(level));
}