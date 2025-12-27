import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/database.types';

export interface UserWithStats extends User {
  workshop_count?: number;
  participation_count?: number;
}

export async function fetchAllUsers(): Promise<UserWithStats[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as UserWithStats[];
}

export async function updateUserRoles(
  userId: string,
  roles: string[]
): Promise<void> {
  const { error } = await (supabase
    .from('users') as any)
    .update({ roles })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const { error } = await (supabase
    .from('users') as any)
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function searchUsers(query: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as User[];
}

export async function getUsersByRole(role: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .contains('roles', [role])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as User[];
}

export async function getUserStats(userId: string): Promise<{
  workshopsOrganized: number;
  workshopsAttended: number;
  totalRevenue: number;
}> {
  const [workshopsResult, participationsResult] = await Promise.all([
    supabase
      .from('workshops')
      .select('id', { count: 'exact' })
      .eq('organizer', userId),
    supabase
      .from('participations')
      .select('status, payment_status, price_paid')
      .eq('user_id', userId),
  ]);

  const workshopsOrganized = workshopsResult.count || 0;
  const participations = (participationsResult.data || []) as any[];

  const workshopsAttended = participations.filter(
    (p: any) => ['paye', 'inscrit'].includes(p.status)
  ).length;

  const totalRevenue = participations
    .filter((p: any) => p.payment_status === 'paid')
    .reduce((sum: number, p: any) => sum + parseFloat(p.price_paid?.toString() || '0'), 0);

  return {
    workshopsOrganized,
    workshopsAttended,
    totalRevenue,
  };
}
