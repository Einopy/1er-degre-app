import { supabase } from '@/lib/supabase';
import type { WorkshopLocation } from '@/lib/database.types';

export interface DateChangeRecord {
  version: number;
  changed_at: string;
  changed_by: string;
  old_start: string;
  old_end: string;
  new_start: string;
  new_end: string;
}

export interface LocationChangeRecord {
  version: number;
  changed_at: string;
  changed_by: string;
  old_location: WorkshopLocation | null;
  new_location: WorkshopLocation | null;
  old_is_remote: boolean;
  new_is_remote: boolean;
}

export interface HistoryLog {
  id: string;
  workshop_id: string;
  log_type: 'status_change' | 'field_edit' | 'participant_add' | 'participant_remove' | 'participant_reinscribe' | 'refund' | 'email_sent' | 'date_change' | 'location_change';
  description: string;
  metadata: Record<string, any>;
  user_id: string | null;
  actor_user_id: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
  actor?: {
    first_name: string;
    last_name: string;
  };
}

export async function trackDateChange(
  workshopId: string,
  oldStart: string,
  oldEnd: string,
  newStart: string,
  newEnd: string,
  userId: string
): Promise<number> {
  const { data: workshop, error: fetchError } = await supabase
    .from('workshops')
    .select('date_change_history')
    .eq('id', workshopId)
    .maybeSingle();

  if (fetchError || !workshop) {
    throw new Error('Failed to fetch workshop for date tracking');
  }

  const workshopData = workshop as any;
  const history = (workshopData.date_change_history as DateChangeRecord[]) || [];
  const newVersion = history.length + 1;

  const newRecord: DateChangeRecord = {
    version: newVersion,
    changed_at: new Date().toISOString(),
    changed_by: userId,
    old_start: oldStart,
    old_end: oldEnd,
    new_start: newStart,
    new_end: newEnd,
  };

  const updatedHistory = [...history, newRecord];

  const { error: updateError } = await (supabase
    .from('workshops') as any)
    .update({
      date_change_history: updatedHistory,
      modified_date_flag: true,
    })
    .eq('id', workshopId);

  if (updateError) {
    throw updateError;
  }

  await logHistoryEvent(
    workshopId,
    'date_change',
    `Date changée du ${new Date(oldStart).toLocaleDateString('fr-FR')} au ${new Date(newStart).toLocaleDateString('fr-FR')}`,
    {
      version: newVersion,
      old_start: oldStart,
      old_end: oldEnd,
      new_start: newStart,
      new_end: newEnd,
    },
    userId,
    null
  );

  return newVersion;
}

export async function trackLocationChange(
  workshopId: string,
  oldLocation: WorkshopLocation | null,
  newLocation: WorkshopLocation | null,
  oldIsRemote: boolean,
  newIsRemote: boolean,
  userId: string
): Promise<number> {
  const { data: workshop, error: fetchError } = await supabase
    .from('workshops')
    .select('location_change_history')
    .eq('id', workshopId)
    .maybeSingle();

  if (fetchError || !workshop) {
    throw new Error('Failed to fetch workshop for location tracking');
  }

  const workshopData = workshop as any;
  const history = (workshopData.location_change_history as LocationChangeRecord[]) || [];
  const newVersion = history.length + 1;

  const newRecord: LocationChangeRecord = {
    version: newVersion,
    changed_at: new Date().toISOString(),
    changed_by: userId,
    old_location: oldLocation,
    new_location: newLocation,
    old_is_remote: oldIsRemote,
    new_is_remote: newIsRemote,
  };

  const updatedHistory = [...history, newRecord];

  const { error: updateError } = await (supabase
    .from('workshops') as any)
    .update({
      location_change_history: updatedHistory,
      modified_location_flag: true,
    })
    .eq('id', workshopId);

  if (updateError) {
    throw updateError;
  }

  const oldLocationDesc = oldIsRemote ? 'En ligne' : oldLocation?.city || 'Inconnu';
  const newLocationDesc = newIsRemote ? 'En ligne' : newLocation?.city || 'Inconnu';

  await logHistoryEvent(
    workshopId,
    'location_change',
    `Lieu changé de ${oldLocationDesc} à ${newLocationDesc}`,
    {
      version: newVersion,
      old_location: oldLocation,
      new_location: newLocation,
      old_is_remote: oldIsRemote,
      new_is_remote: newIsRemote,
    },
    userId,
    null
  );

  return newVersion;
}

export async function getLatestDateVersion(workshopId: string): Promise<number> {
  const { data: workshop, error } = await supabase
    .from('workshops')
    .select('date_change_history')
    .eq('id', workshopId)
    .maybeSingle();

  if (error || !workshop) {
    return 0;
  }

  const workshopData = workshop as any;
  const history = (workshopData.date_change_history as DateChangeRecord[]) || [];
  return history.length;
}

export async function getLatestLocationVersion(workshopId: string): Promise<number> {
  const { data: workshop, error } = await supabase
    .from('workshops')
    .select('location_change_history')
    .eq('id', workshopId)
    .maybeSingle();

  if (error || !workshop) {
    return 0;
  }

  const workshopData = workshop as any;
  const history = (workshopData.location_change_history as LocationChangeRecord[]) || [];
  return history.length;
}

export async function confirmDateChange(
  participationId: string,
  workshopId: string
): Promise<void> {
  const latestVersion = await getLatestDateVersion(workshopId);

  const { error } = await (supabase
    .from('participations') as any)
    .update({ date_confirmation_version: latestVersion })
    .eq('id', participationId);

  if (error) {
    throw error;
  }
}

export async function confirmLocationChange(
  participationId: string,
  workshopId: string
): Promise<void> {
  const latestVersion = await getLatestLocationVersion(workshopId);

  const { error } = await (supabase
    .from('participations') as any)
    .update({ location_confirmation_version: latestVersion })
    .eq('id', participationId);

  if (error) {
    throw error;
  }
}

export async function logHistoryEvent(
  workshopId: string,
  logType: HistoryLog['log_type'],
  description: string,
  metadata: Record<string, any> = {},
  actorUserId: string | null = null,
  subjectUserId: string | null = null
): Promise<void> {
  console.log('[logHistoryEvent] Logging event:', {
    workshopId,
    logType,
    description,
    actorUserId,
    subjectUserId,
    metadata
  });

  const { data, error } = await supabase
    .from('workshop_history_logs')
    .insert({
      workshop_id: workshopId,
      log_type: logType,
      description,
      metadata,
      actor_user_id: actorUserId,
      user_id: subjectUserId,
    } as any)
    .select();

  if (error) {
    console.error('[logHistoryEvent] Failed to log history event:', error);
  } else {
    console.log('[logHistoryEvent] Successfully logged history event:', data);
  }
}

export async function fetchWorkshopHistory(workshopId: string): Promise<HistoryLog[]> {
  console.log('[fetchWorkshopHistory] Fetching history for workshop:', workshopId);

  const { data, error } = await supabase
    .from('workshop_history_logs')
    .select(`
      *,
      user:user_id(first_name, last_name),
      actor:actor_user_id(first_name, last_name)
    `)
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchWorkshopHistory] Error fetching history:', error);
    throw error;
  }

  console.log('[fetchWorkshopHistory] Successfully fetched history, count:', data?.length || 0);
  console.log('[fetchWorkshopHistory] History data:', data);

  return (data || []) as any;
}

export async function getUnconfirmedParticipants(
  workshopId: string,
  changeType: 'date' | 'location'
): Promise<Array<{ id: string; name: string; email: string; version: number }>> {
  const latestVersion = changeType === 'date'
    ? await getLatestDateVersion(workshopId)
    : await getLatestLocationVersion(workshopId);

  if (latestVersion === 0) {
    return [];
  }

  const versionField = changeType === 'date' ? 'date_confirmation_version' : 'location_confirmation_version';

  const { data, error } = await supabase
    .from('participations')
    .select(`
      id,
      ${versionField},
      user:users(first_name, last_name, email)
    `)
    .eq('workshop_id', workshopId)
    .in('status', ['inscrit', 'paye', 'en_attente'])
    .lt(versionField, latestVersion);

  if (error) {
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: `${p.user.first_name} ${p.user.last_name}`,
    email: p.user.email,
    version: p[versionField],
  }));
}

export function canParticipantRefundDueToChanges(
  participation: {
    date_confirmation_version?: number;
    location_confirmation_version?: number;
  },
  workshop: {
    date_change_history?: any;
    location_change_history?: any;
  }
): boolean {
  const dateHistory = (workshop.date_change_history as DateChangeRecord[]) || [];
  const locationHistory = (workshop.location_change_history as LocationChangeRecord[]) || [];

  const latestDateVersion = dateHistory.length;
  const latestLocationVersion = locationHistory.length;

  const participantDateVersion = participation.date_confirmation_version || 0;
  const participantLocationVersion = participation.location_confirmation_version || 0;

  return (
    (latestDateVersion > 0 && participantDateVersion < latestDateVersion) ||
    (latestLocationVersion > 0 && participantLocationVersion < latestLocationVersion)
  );
}
