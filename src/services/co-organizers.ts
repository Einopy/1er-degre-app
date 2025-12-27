import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/database.types';
import { type WorkshopFamily } from '@/lib/organizer-utils';

export interface CoOrganizerAlert {
  id: string;
  user_id: string;
  workshop_id: string;
  dismissed_at: string | null;
  created_at: string;
  workshop: {
    id: string;
    title: string;
    start_at: string;
  };
}

/**
 * Fetch users eligible to co-organize a specific workshop based on permissions
 */
export async function fetchEligibleCoOrganizers(
  _workshopFamily: WorkshopFamily,
  _workshopType: string,
  _classificationStatus: string,
  excludeUserId: string
): Promise<User[]> {
  // Fetch all users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', excludeUserId)
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  // All users are eligible - actual permission checks are done via role_levels in the database
  const eligibleUsers = (users || []);

  return eligibleUsers;
}

/**
 * Insert co-organizer assignments for a workshop
 */
export async function insertCoOrganizers(
  workshopId: string,
  coOrganizerIds: string[]
): Promise<void> {
  // Update the workshop with the co-organizers array
  const { error } = await (supabase
    .from('workshops') as any)
    .update({ co_organizers: coOrganizerIds })
    .eq('id', workshopId);

  if (error) {
    console.error('Error inserting co-organizers:', error);
    throw error;
  }

  // Create alerts for each co-organizer
  if (coOrganizerIds.length > 0) {
    const alerts = coOrganizerIds.map((userId) => ({
      user_id: userId,
      workshop_id: workshopId,
    }));

    const { error: alertError } = await (supabase
      .from('workshop_co_organizer_alerts') as any)
      .insert(alerts);

    if (alertError) {
      console.error('Error creating co-organizer alerts:', alertError);
      // Don't throw - alerts are non-critical
    }
  }
}

/**
 * Fetch co-organizers for a specific workshop
 */
export async function fetchWorkshopCoOrganizers(
  workshopId: string
): Promise<User[]> {
  // Fetch the workshop to get co_organizers array
  const { data: workshop, error: workshopError } = await supabase
    .from('workshops')
    .select('co_organizers')
    .eq('id', workshopId)
    .maybeSingle();

  if (workshopError || !workshop) {
    console.error('Error fetching workshop:', workshopError);
    return [];
  }

  const coOrganizerIds = (workshop as any).co_organizers || [];
  if (coOrganizerIds.length === 0) return [];

  // Fetch the users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('id', coOrganizerIds);

  if (usersError) {
    console.error('Error fetching co-organizer users:', usersError);
    return [];
  }

  return users || [];
}

/**
 * Check if a user is a co-organizer of a workshop
 */
export async function isCoOrganizer(
  workshopId: string,
  userId: string
): Promise<boolean> {
  const { data: workshop, error } = await supabase
    .from('workshops')
    .select('co_organizers')
    .eq('id', workshopId)
    .maybeSingle();

  if (error || !workshop) {
    console.error('Error checking co-organizer status:', error);
    return false;
  }

  const coOrganizers = (workshop as any).co_organizers || [];
  return coOrganizers.includes(userId);
}

/**
 * Fetch pending co-organizer alerts for the current user
 */
export async function fetchPendingCoOrganizerAlerts(
  userId: string
): Promise<CoOrganizerAlert[]> {
  const { data, error } = await (supabase
    .from('workshop_co_organizer_alerts') as any)
    .select(`
      id,
      user_id,
      workshop_id,
      dismissed_at,
      created_at,
      workshop:workshops(id, title, start_at)
    `)
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching co-organizer alerts:', error);
    throw error;
  }

  return (data || []) as CoOrganizerAlert[];
}

/**
 * Dismiss a co-organizer alert
 */
export async function dismissCoOrganizerAlert(alertId: string): Promise<void> {
  const { error } = await (supabase
    .from('workshop_co_organizer_alerts') as any)
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
}
