import { supabase } from '@/lib/supabase';
import type { MailLog, ScheduledEmail } from '@/lib/database.types';

export interface RecordEmailLogParams {
  workshopId: string;
  participationId?: string | null;
  recipientEmail: string;
  recipientUserId?: string | null;
  emailType: 'pre' | 'post' | 'spontane';
  subject: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
  errorMessage?: string | null;
  providerMessageId?: string | null;
}

export async function recordEmailLog(params: RecordEmailLogParams): Promise<MailLog | null> {
  const { data, error } = await (supabase
    .from('mail_logs') as any)
    .insert({
      workshop_id: params.workshopId,
      participation_id: params.participationId || null,
      recipient_email: params.recipientEmail,
      recipient_user_id: params.recipientUserId || null,
      email_type: params.emailType,
      subject: params.subject,
      sent_at: params.deliveryStatus === 'sent' ? new Date().toISOString() : null,
      delivery_status: params.deliveryStatus || 'queued',
      error_message: params.errorMessage || null,
      provider_message_id: params.providerMessageId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording email log:', error);
    throw error;
  }

  return data;
}

export async function updateEmailDeliveryStatus(
  mailLogId: string,
  status: 'queued' | 'sent' | 'delivered' | 'failed',
  errorMessage?: string | null,
  providerMessageId?: string | null
): Promise<void> {
  const updateData: any = {
    delivery_status: status,
  };

  if (status === 'sent' || status === 'delivered') {
    updateData.sent_at = new Date().toISOString();
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  if (providerMessageId) {
    updateData.provider_message_id = providerMessageId;
  }

  const { error } = await (supabase
    .from('mail_logs') as any)
    .update(updateData)
    .eq('id', mailLogId);

  if (error) {
    console.error('Error updating email delivery status:', error);
    throw error;
  }
}

export async function getParticipantEmailStatus(
  workshopId: string,
  participationId: string
): Promise<MailLog[]> {
  const { data, error } = await (supabase
    .from('mail_logs') as any)
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('participation_id', participationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching participant email status:', error);
    return [];
  }

  return data || [];
}

export async function getFailedEmailsForWorkshop(workshopId: string): Promise<MailLog[]> {
  const { data, error } = await (supabase
    .from('mail_logs') as any)
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('delivery_status', 'failed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching failed emails:', error);
    return [];
  }

  return data || [];
}

export async function getFailedEmailsForParticipant(
  workshopId: string,
  participationId: string
): Promise<MailLog[]> {
  const { data, error } = await (supabase
    .from('mail_logs') as any)
    .select('*')
    .eq('workshop_id', workshopId)
    .eq('participation_id', participationId)
    .eq('delivery_status', 'failed')
    .order('created_at', { ascending: false});

  if (error) {
    console.error('Error fetching failed emails for participant:', error);
    return [];
  }

  return data || [];
}

export interface CreateScheduledEmailParams {
  workshopId: string;
  emailType: 'pre' | 'post' | 'spontane';
  scheduledAt: string;
  recipientCount: number;
  subjectSnapshot: string;
  htmlSnapshot: string;
}

export async function createScheduledEmail(
  params: CreateScheduledEmailParams
): Promise<ScheduledEmail | null> {
  const { data, error } = await (supabase
    .from('scheduled_emails') as any)
    .insert({
      workshop_id: params.workshopId,
      email_type: params.emailType,
      scheduled_at: params.scheduledAt,
      recipient_count: params.recipientCount,
      subject_snapshot: params.subjectSnapshot,
      html_snapshot: params.htmlSnapshot,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled email:', error);
    throw error;
  }

  return data;
}

export async function updateScheduledEmailStatus(
  scheduledEmailId: string,
  status: 'pending' | 'processing' | 'sent' | 'failed',
  errorMessage?: string | null
): Promise<void> {
  const updateData: any = {
    status,
  };

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await (supabase
    .from('scheduled_emails') as any)
    .update(updateData)
    .eq('id', scheduledEmailId);

  if (error) {
    console.error('Error updating scheduled email status:', error);
    throw error;
  }
}

export async function getScheduledEmailsForWorkshop(
  workshopId: string,
  emailType?: 'pre' | 'post' | 'spontane'
): Promise<ScheduledEmail[]> {
  let query = (supabase
    .from('scheduled_emails') as any)
    .select('*')
    .eq('workshop_id', workshopId);

  if (emailType) {
    query = query.eq('email_type', emailType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scheduled emails:', error);
    return [];
  }

  return data || [];
}
