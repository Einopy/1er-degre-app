import { supabase } from '@/lib/supabase';
import type { Participation, Workshop } from '@/lib/database.types';

export interface ParticipationWithWorkshop extends Participation {
  workshop: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    is_remote: boolean;
    location: any;
    lifecycle_status: string;
    modified_date_flag: boolean;
    modified_location_flag: boolean;
    workshop: string;
  };
}

export async function fetchUserParticipations(
  userId: string
): Promise<ParticipationWithWorkshop[]> {
  const { data, error } = await supabase
    .from('participations')
    .select(
      `
      *,
      workshop:workshops(
        id,
        title,
        start_at,
        end_at,
        is_remote,
        location,
        lifecycle_status,
        modified_date_flag,
        modified_location_flag,
        workshop
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ParticipationWithWorkshop[];
}

export async function cancelParticipation(
  participationId: string
): Promise<void> {
  const { error } = await (supabase
    .from('participations') as any)
    .update({
      status: 'annule',
      payment_status: 'refunded',
    })
    .eq('id', participationId);

  if (error) throw error;
}

export function canRefundParticipation(
  participation: ParticipationWithWorkshop
): boolean {
  if (participation.status === 'annule' || participation.status === 'rembourse') {
    return false;
  }

  if (participation.workshop.lifecycle_status === 'canceled') {
    return true;
  }

  if (participation.workshop.modified_date_flag || participation.workshop.modified_location_flag) {
    return true;
  }

  const workshopStart = new Date(participation.workshop.start_at);
  const now = new Date();
  const hoursUntilWorkshop = (workshopStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilWorkshop >= 72;
}

export function getRefundReason(participation: ParticipationWithWorkshop): string | null {
  if (participation.status === 'annule' || participation.status === 'rembourse') {
    return null;
  }

  if (participation.workshop.lifecycle_status === 'canceled') {
    return 'Atelier annulé';
  }

  if (participation.workshop.modified_date_flag) {
    return 'Date modifiée';
  }

  if (participation.workshop.modified_location_flag) {
    return 'Lieu modifié';
  }

  const workshopStart = new Date(participation.workshop.start_at);
  const now = new Date();
  const hoursUntilWorkshop = (workshopStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilWorkshop >= 72) {
    return 'Plus de 72h avant l\'atelier';
  }

  return null;
}

export function canExchangeParticipation(
  participation: ParticipationWithWorkshop
): boolean {
  if (participation.status === 'annule' || participation.status === 'rembourse') {
    return false;
  }

  if (participation.exchange_parent_participation_id) {
    return false;
  }

  const workshopStart = new Date(participation.workshop.start_at);
  const now = new Date();

  return workshopStart > now;
}

export async function fetchAvailableWorkshopsForExchange(): Promise<Workshop[]> {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('lifecycle_status', 'active')
    .gt('start_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Workshop[];
}

export async function exchangeParticipation(
  originalParticipationId: string,
  newWorkshopId: string,
  userId: string,
  ticketType: 'normal' | 'reduit' | 'gratuit' | 'pro',
  pricePaid: number
): Promise<void> {
  const { data: originalParticipation, error: fetchError } = await supabase
    .from('participations')
    .select('*')
    .eq('id', originalParticipationId)
    .single();

  if (fetchError || !originalParticipation) {
    throw new Error('Participation originale introuvable');
  }

  if ((originalParticipation as any).exchange_parent_participation_id) {
    throw new Error('Cette participation a déjà été échangée');
  }

  const { error: updateError } = await (supabase
    .from('participations') as any)
    .update({ status: 'echange' })
    .eq('id', originalParticipationId);

  if (updateError) throw updateError;

  const { error: insertError } = await (supabase
    .from('participations') as any)
    .insert({
      user_id: userId,
      workshop_id: newWorkshopId,
      status: 'inscrit',
      payment_status: 'paid',
      ticket_type: ticketType,
      price_paid: pricePaid,
      exchange_parent_participation_id: originalParticipationId,
    });

  if (insertError) throw insertError;
}
