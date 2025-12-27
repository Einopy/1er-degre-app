// src/services/email-sending.ts

import type { Workshop } from '@/lib/database.types';
import type { ParticipantWithUser } from './organizer-workshops';
import { createMergeTagContext, replaceMergeTags } from './email-templates';
import { logHistoryEvent } from './workshop-changes';
import { recordEmailLog, createScheduledEmail, updateScheduledEmailStatus } from './email-tracking';

export interface EmailRecipient {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  participationId?: string;
  userId?: string;
}

export interface SendEmailOptions {
  workshop: Workshop;
  recipients: EmailRecipient[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  emailType?: 'pre' | 'post' | 'spontane';
  currentUserId?: string;
}

export async function sendWorkshopEmail(options: SendEmailOptions): Promise<void> {
  const {
    workshop,
    recipients,
    subject,
    htmlContent,
    senderName,
    senderEmail,
    emailType,
    currentUserId,
  } = options;

  let scheduledEmailId: string | null = null;

  if (emailType && emailType !== 'spontane') {
    try {
      const scheduledEmail = await createScheduledEmail({
        workshopId: workshop.id,
        emailType,
        scheduledAt: new Date().toISOString(),
        recipientCount: recipients.length,
        subjectSnapshot: subject,
        htmlSnapshot: htmlContent,
      });
      scheduledEmailId = scheduledEmail?.id || null;
    } catch (error) {
      console.error('Error creating scheduled email record:', error);
    }
  }

  const processedRecipients = recipients.map((recipient) => {
    const context = createMergeTagContext(
      workshop,
      recipient.firstName,
      recipient.lastName
    );

    return {
      email: recipient.email,
      name: recipient.name,
      personalizedSubject: replaceMergeTags(subject, context),
      personalizedContent: replaceMergeTags(htmlContent, context),
      participationId: recipient.participationId,
      userId: recipient.userId,
    };
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/send-workshop-email`;

  let successCount = 0;
  let failureCount = 0;

  for (const recipient of processedRecipients) {
    let mailLogId: string | null = null;

    try {
      const mailLog = await recordEmailLog({
        workshopId: workshop.id,
        participationId: recipient.participationId || null,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId || null,
        emailType: emailType || 'spontane',
        subject: recipient.personalizedSubject,
        deliveryStatus: 'queued',
      });
      mailLogId = mailLog?.id || null;
    } catch (logError) {
      console.error('Error recording initial email log:', logError);
    }

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          recipients: [
            {
              email: recipient.email,
              name: recipient.name,
            },
          ],
          subject: recipient.personalizedSubject,
          htmlContent: recipient.personalizedContent,
          senderName,
          senderEmail,
        }),
      });

      if (!response.ok) {
        let errorData: any = null;
        let errorMessage = `Failed to send email to ${recipient.email}`;

        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            if (responseText && responseText.trim()) {
              try {
                errorData = JSON.parse(responseText);
                errorMessage =
                  errorData.error || errorData.message || errorMessage;
              } catch (jsonError) {
                console.error(
                  `Failed to parse JSON error response:`,
                  jsonError
                );
                errorMessage = responseText || errorMessage;
              }
            } else {
              errorMessage = `Server error (${response.status}): Empty response`;
            }
          } else {
            const textResponse = await response.text();
            console.error(
              `Non-JSON error response (${response.status}):`,
              textResponse
            );
            errorMessage = textResponse || `Server error (${response.status})`;
          }
        } catch (parseError) {
          const rawText = await response
            .text()
            .catch(() => 'Unable to read response body');
          console.error(
            `Failed to parse error response for ${recipient.email}:`,
            parseError
          );
          console.error(`Raw response body:`, rawText);
          errorMessage = `Server error (${response.status}): Unable to parse error response`;
        }

        console.error(`Failed to send email to ${recipient.email}:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage,
        });

        console.error('Brevo raw details:', errorData?.details || errorData);

        if (mailLogId) {
          try {
            const { updateEmailDeliveryStatus } = await import('./email-tracking');
            await updateEmailDeliveryStatus(mailLogId, 'failed', errorMessage);
          } catch (updateError) {
            console.error('Error updating mail log to failed:', updateError);
          }
        }

        failureCount++;
        throw new Error(errorMessage);
      }

      if (mailLogId) {
        try {
          const { updateEmailDeliveryStatus } = await import('./email-tracking');
          await updateEmailDeliveryStatus(mailLogId, 'sent');
        } catch (updateError) {
          console.error('Error updating mail log to sent:', updateError);
        }
      }

      successCount++;

      try {
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();

        if (
          responseText &&
          responseText.trim() &&
          contentType &&
          contentType.includes('application/json')
        ) {
          try {
            JSON.parse(responseText);
          } catch (jsonError) {
            console.warn(
              `Email sent to ${recipient.email} but couldn't parse success response:`,
              jsonError
            );
            console.warn(`Response text:`, responseText);
          }
        }
      } catch (parseError) {
        console.warn(
          `Email sent to ${recipient.email} but couldn't read success response:`,
          parseError
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error);
      throw error;
    }
  }

  if (scheduledEmailId) {
    try {
      const status = failureCount === 0 ? 'sent' : failureCount < recipients.length ? 'sent' : 'failed';
      await updateScheduledEmailStatus(
        scheduledEmailId,
        status,
        failureCount > 0 ? `${failureCount} of ${recipients.length} emails failed` : null
      );
    } catch (error) {
      console.error('Error updating scheduled email status:', error);
    }
  }

  if (emailType && currentUserId) {
    const emailTypeLabel =
      emailType === 'pre'
        ? "Envoi de l'email pré-atelier"
        : emailType === 'post'
        ? "Envoi de l'email post-atelier"
        : 'Email spontané envoyé';

    const contentPreview = htmlContent.replace(/<[^>]*>/g, '').substring(0, 200);

    await logHistoryEvent(
      workshop.id,
      'email_sent',
      `${emailTypeLabel} à ${recipients.length} participant${
        recipients.length > 1 ? 's' : ''
      }`,
      {
        email_type: emailType,
        recipient_count: recipients.length,
        subject,
        content_preview: contentPreview + (htmlContent.length > 200 ? '...' : ''),
        sender_name: senderName,
        sender_email: senderEmail,
        recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
      },
      currentUserId,
      null
    );
  }
}

export function prepareRecipientsFromParticipants(
  participants: ParticipantWithUser[]
): EmailRecipient[] {
  return participants.map((p) => ({
    email: p.user.email,
    name: `${p.user.first_name} ${p.user.last_name}`,
    firstName: p.user.first_name,
    lastName: p.user.last_name,
    participationId: p.id,
    userId: p.user.id,
  }));
}