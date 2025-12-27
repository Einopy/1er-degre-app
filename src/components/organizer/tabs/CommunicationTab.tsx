import { useState, useEffect, useMemo, useCallback } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { AccordionEmailEditor } from '../communication/AccordionEmailEditor';
import type { Workshop } from '@/lib/database.types';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import {
  fetchOfficialTemplate,
  fetchPersonalTemplate,
  savePersonalTemplate,
  updateLastViewedOfficialVersion,
  type EmailTemplate,
} from '@/services/email-templates';
import { sendWorkshopEmail, prepareRecipientsFromParticipants } from '@/services/email-sending';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CommunicationTabProps {
  workshop: Workshop;
  participants: ParticipantWithUser[];
  currentUserId: string;
  activeAccordion: string;
  onAccordionChange: (value: string) => void;
}

type EmailType = 'pre' | 'post' | 'spontane';

type LoadedTemplateType = 'official' | 'personal' | 'none';

interface EmailState {
  subject: string;
  content: string;
  savedSubject: string;
  savedContent: string;
  officialTemplate: EmailTemplate | null;
  personalTemplate: EmailTemplate | null;
  hasNewOfficialVersion: boolean;
  isDirty: boolean;
  loadedTemplate: LoadedTemplateType;
}

export function CommunicationTab({
  workshop,
  participants,
  currentUserId,
  activeAccordion,
  onAccordionChange,
}: CommunicationTabProps) {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);

  const [preState, setPreState] = useState<EmailState>(() => ({
    subject: workshop?.mail_pre_subject || '',
    content: workshop?.mail_pre_html || '',
    savedSubject: workshop?.mail_pre_subject || '',
    savedContent: workshop?.mail_pre_html || '',
    officialTemplate: null,
    personalTemplate: null,
    hasNewOfficialVersion: false,
    isDirty: false,
    loadedTemplate: 'none',
  }));

  const [postState, setPostState] = useState<EmailState>(() => ({
    subject: workshop?.mail_post_subject || '',
    content: workshop?.mail_post_html || '',
    savedSubject: workshop?.mail_post_subject || '',
    savedContent: workshop?.mail_post_html || '',
    officialTemplate: null,
    personalTemplate: null,
    hasNewOfficialVersion: false,
    isDirty: false,
    loadedTemplate: 'none',
  }));

  const [spontaneState, setSpontaneState] = useState<EmailState>({
    subject: '',
    content: '',
    savedSubject: '',
    savedContent: '',
    officialTemplate: null,
    personalTemplate: null,
    hasNewOfficialVersion: false,
    isDirty: false,
    loadedTemplate: 'none',
  });

  const [templatesLoaded, setTemplatesLoaded] = useState<{ pre: boolean; post: boolean }>({
    pre: false,
    post: false,
  });

  const [isLoadingTemplate, setIsLoadingTemplate] = useState<{ pre: boolean; post: boolean }>({
    pre: false,
    post: false,
  });

  const [editorKey, setEditorKey] = useState<{ pre: number; post: number }>({
    pre: 0,
    post: 0,
  });

  const [loadError, setLoadError] = useState<string | null>(null);

  const isPastWorkshop = useMemo(() => {
    if (!workshop?.start_at) return false;
    return new Date(workshop.start_at) < new Date();
  }, [workshop?.start_at]);

  const eligibleParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (isPastWorkshop) {
        return p.attended === true && ['inscrit', 'paye'].includes(p.status);
      } else {
        return ['inscrit', 'paye'].includes(p.status);
      }
    });
  }, [participants, isPastWorkshop]);

  const recipientCount = eligibleParticipants.length;

  const postSubtitleText = useMemo(() => {
    if (isPastWorkshop && workshop.lifecycle_status === 'active') {
      return "Action requise pour clôturer l'atelier";
    } else {
      return "Vous pourrez clôturer votre atelier après sa tenue.";
    }
  }, [isPastWorkshop, workshop.lifecycle_status]);

  const [preEmailSentDate, setPreEmailSentDate] = useState<Date | null>(null);
  const [postEmailSentDate, setPostEmailSentDate] = useState<Date | null>(null);

  useEffect(() => {
    const checkEmailsSent = async () => {
      const { data: preData } = await (supabase
        .from('mail_logs') as any)
        .select('sent_at')
        .eq('workshop_id', workshop.id)
        .eq('email_type', 'pre')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (preData && preData.sent_at) {
        setPreEmailSentDate(new Date(preData.sent_at));
      }

      const { data: postData } = await (supabase
        .from('mail_logs') as any)
        .select('sent_at')
        .eq('workshop_id', workshop.id)
        .eq('email_type', 'post')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (postData && postData.sent_at) {
        setPostEmailSentDate(new Date(postData.sent_at));
      }
    };

    checkEmailsSent();
  }, [workshop.id]);

  const scheduleLabel = useMemo(() => {
    if (preEmailSentDate) {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parts = formatter.formatToParts(preEmailSentDate);
      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const hour = parts.find((p) => p.type === 'hour')?.value;
      const minute = parts.find((p) => p.type === 'minute')?.value;

      return `Email envoyé le ${weekday} ${day} ${month} à ${hour}:${minute}`;
    }

    const startDate = new Date(workshop.start_at);
    const scheduledAt = new Date(startDate.getTime() - 72 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = scheduledAt.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 23 && diffHours > 0) {
      const hours = Math.floor(diffHours);
      const minutes = Math.floor((diffHours - hours) * 60);
      return `Envoi programmé dans ${hours} heure${hours > 1 ? 's' : ''} et ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffHours >= 23) {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parts = formatter.formatToParts(scheduledAt);
      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const hour = parts.find((p) => p.type === 'hour')?.value;
      const minute = parts.find((p) => p.type === 'minute')?.value;

      return `Envoi programmé : ${weekday} ${day} ${month} à ${hour}:${minute}`;
    } else {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parts = formatter.formatToParts(scheduledAt);
      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const hour = parts.find((p) => p.type === 'hour')?.value;
      const minute = parts.find((p) => p.type === 'minute')?.value;

      return `Envoi programmé : ${weekday} ${day} ${month} à ${hour}:${minute}`;
    }
  }, [workshop.start_at, preEmailSentDate]);

  useEffect(() => {
    if (!workshop?.workshop_family_id || !workshop?.language) {
      setIsInitializing(false);
      return;
    }
    setIsInitializing(false);
  }, [workshop?.workshop_family_id, workshop?.language]);

  // Auto-open accordion based on email status
  useEffect(() => {
    // Only auto-open if no accordion is currently selected
    if (activeAccordion === '' && !isInitializing) {
      if (!preEmailSentDate) {
        // Pre-email not sent yet, open pre-email section
        onAccordionChange('pre-email');
      } else {
        // Pre-email has been sent, open post-email section
        onAccordionChange('post-email');
      }
    }
  }, [preEmailSentDate, activeAccordion, isInitializing, onAccordionChange]);

  useEffect(() => {
    if (!workshop?.workshop_family_id || !workshop?.language) {
      setLoadError("Données de l'atelier incomplètes");
      return;
    }

    if (activeAccordion === 'pre-email' && !templatesLoaded.pre) {
      loadTemplates('pre');
    } else if (activeAccordion === 'post-email' && !templatesLoaded.post) {
      loadTemplates('post');
    }
  }, [activeAccordion, workshop?.workshop_family_id, workshop?.language]);

  const loadTemplates = async (type: 'pre' | 'post') => {
    if (!workshop?.workshop_family_id || !workshop?.language || !currentUserId) {
      console.warn('Missing required data for loading templates');
      return;
    }

    try {
      setLoadError(null);
      const [official, personal] = await Promise.all([
        fetchOfficialTemplate(workshop.workshop_family_id, workshop.language, type).catch((err) => {
          console.error('Error fetching official template:', err);
          return null;
        }),
        fetchPersonalTemplate(currentUserId, workshop.workshop_family_id, workshop.language, type).catch(
          (err) => {
            console.error('Error fetching personal template:', err);
            return null;
          }
        ),
      ]);

      const hasNewVersion =
        official && personal && personal.last_viewed_official_version < official.official_version;

      const updateState = type === 'pre' ? setPreState : setPostState;
      const currentSubject =
        type === 'pre' ? workshop.mail_pre_subject : workshop.mail_post_subject;
      const currentContent = type === 'pre' ? workshop.mail_pre_html : workshop.mail_post_html;

      let displaySubject = currentSubject || '';
      let displayContent = currentContent || '';
      let detectedTemplate: LoadedTemplateType = 'none';
      let effectiveSavedSubject = currentSubject || '';
      let effectiveSavedContent = currentContent || '';

      if (!displayContent) {
        if (personal) {
          displaySubject = personal.subject;
          displayContent = personal.html_content;
          detectedTemplate = 'personal';
          effectiveSavedSubject = personal.subject;
          effectiveSavedContent = personal.html_content;
        } else if (official) {
          displaySubject = official.subject;
          displayContent = official.html_content;
          detectedTemplate = 'official';
          effectiveSavedSubject = official.subject;
          effectiveSavedContent = official.html_content;
        }
      } else {
        // Detect which template matches the current content
        if (personal && displaySubject === personal.subject && displayContent === personal.html_content) {
          detectedTemplate = 'personal';
        } else if (official && displaySubject === official.subject && displayContent === official.html_content) {
          detectedTemplate = 'official';
        }
      }

      updateState((prev) => ({
        ...prev,
        officialTemplate: official,
        personalTemplate: personal,
        hasNewOfficialVersion: hasNewVersion || false,
        subject: displaySubject,
        content: displayContent,
        savedSubject: effectiveSavedSubject,
        savedContent: effectiveSavedContent,
        loadedTemplate: detectedTemplate,
      }));

      setTemplatesLoaded((prev) => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error('Error loading templates:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Impossible de charger les templates';
      setLoadError(errorMessage);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleLoadOfficialTemplate = async (type: 'pre' | 'post') => {
    const state = type === 'pre' ? preState : postState;
    const updateState = type === 'pre' ? setPreState : setPostState;

    if (!state.officialTemplate) return;

    setIsLoadingTemplate((prev) => ({ ...prev, [type]: true }));

    try {
      const newSubject = state.officialTemplate.subject;
      const newContent = state.officialTemplate.html_content;

      const field = type === 'pre' ? 'mail_pre' : 'mail_post';
      const { error } = await (supabase.from('workshops') as any)
        .update({
          [`${field}_subject`]: newSubject,
          [`${field}_html`]: newContent,
        })
        .eq('id', workshop.id);

      if (error) {
        throw error;
      }

      if (type === 'pre') {
        workshop.mail_pre_subject = newSubject;
        workshop.mail_pre_html = newContent;
      } else {
        workshop.mail_post_subject = newSubject;
        workshop.mail_post_html = newContent;
      }

      updateState((prev) => ({
        ...prev,
        subject: newSubject,
        content: newContent,
        savedSubject: newSubject,
        savedContent: newContent,
        isDirty: false,
        loadedTemplate: 'official',
        hasNewOfficialVersion: false,
      }));

      setEditorKey((prev) => ({ ...prev, [type]: prev[type] + 1 }));

      if (state.personalTemplate) {
        try {
          await updateLastViewedOfficialVersion(
            state.personalTemplate.id,
            state.officialTemplate.official_version
          );
        } catch (error) {
          console.error('Error updating viewed version:', error);
        }
      }

      toast({
        description: 'Template officiel chargé avec succès',
      });

      setIsLoadingTemplate((prev) => ({ ...prev, [type]: false }));
    } catch (error) {
      console.error('Error loading official template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le template officiel',
        variant: 'destructive',
      });
      setIsLoadingTemplate((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleLoadPersonalTemplate = async (type: 'pre' | 'post') => {
    const state = type === 'pre' ? preState : postState;
    const updateState = type === 'pre' ? setPreState : setPostState;

    if (!state.personalTemplate) return;

    setIsLoadingTemplate((prev) => ({ ...prev, [type]: true }));

    try {
      const newSubject = state.personalTemplate.subject;
      const newContent = state.personalTemplate.html_content;

      const field = type === 'pre' ? 'mail_pre' : 'mail_post';
      const { error } = await (supabase.from('workshops') as any)
        .update({
          [`${field}_subject`]: newSubject,
          [`${field}_html`]: newContent,
        })
        .eq('id', workshop.id);

      if (error) {
        throw error;
      }

      if (type === 'pre') {
        workshop.mail_pre_subject = newSubject;
        workshop.mail_pre_html = newContent;
      } else {
        workshop.mail_post_subject = newSubject;
        workshop.mail_post_html = newContent;
      }

      updateState((prev) => ({
        ...prev,
        subject: newSubject,
        content: newContent,
        savedSubject: newSubject,
        savedContent: newContent,
        isDirty: false,
        loadedTemplate: 'personal',
      }));

      setEditorKey((prev) => ({ ...prev, [type]: prev[type] + 1 }));

      toast({
        description: 'Votre template personnel chargé avec succès',
      });

      setIsLoadingTemplate((prev) => ({ ...prev, [type]: false }));
    } catch (error) {
      console.error('Error loading personal template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger votre template personnel',
        variant: 'destructive',
      });
      setIsLoadingTemplate((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSave = async (type: EmailType, content: string, subject: string) => {
    try {
      if (type === 'pre') {
        const { error } = await (supabase.from('workshops') as any)
          .update({
            mail_pre_subject: subject,
            mail_pre_html: content,
          })
          .eq('id', workshop.id);

        if (error) {
          throw error;
        }

        workshop.mail_pre_subject = subject;
        workshop.mail_pre_html = content;

        setPreState((prev) => ({
          ...prev,
          subject,
          content,
          savedSubject: subject,
          savedContent: content,
          loadedTemplate: 'none',
        }));
      } else if (type === 'post') {
        const { error } = await (supabase.from('workshops') as any)
          .update({
            mail_post_subject: subject,
            mail_post_html: content,
          })
          .eq('id', workshop.id);

        if (error) {
          throw error;
        }

        workshop.mail_post_subject = subject;
        workshop.mail_post_html = content;

        setPostState((prev) => ({
          ...prev,
          subject,
          content,
          savedSubject: subject,
          savedContent: content,
          loadedTemplate: 'none',
        }));
      }

      toast({
        description: 'Contenu sauvegardé avec succès',
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le contenu',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSaveAsTemplate = async (type: 'pre' | 'post', content: string, subject: string) => {
    try {
      const savedTemplate = await savePersonalTemplate(
        currentUserId,
        workshop.workshop_family_id,
        workshop.language,
        type,
        subject,
        content
      );

      const field = type === 'pre' ? 'mail_pre' : 'mail_post';
      const { error } = await (supabase.from('workshops') as any)
        .update({
          [`${field}_subject`]: subject,
          [`${field}_html`]: content,
        })
        .eq('id', workshop.id);

      if (error) {
        throw error;
      }

      if (type === 'pre') {
        workshop.mail_pre_subject = subject;
        workshop.mail_pre_html = content;
      } else {
        workshop.mail_post_subject = subject;
        workshop.mail_post_html = content;
      }

      const updateState = type === 'pre' ? setPreState : setPostState;
      const currentState = type === 'pre' ? preState : postState;

      updateState((prev) => ({
        ...prev,
        subject,
        content,
        savedSubject: subject,
        savedContent: content,
        personalTemplate: savedTemplate,
        hasNewOfficialVersion:
          currentState.officialTemplate && savedTemplate
            ? savedTemplate.last_viewed_official_version <
              currentState.officialTemplate.official_version
            : false,
        loadedTemplate: 'personal',
      }));

      toast({
        description: 'Template personnel sauvegardé avec succès',
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le template',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSendPre = async (content: string) => {
    try {
      const recipients = prepareRecipientsFromParticipants(eligibleParticipants);

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject: preState.subject,
        htmlContent: content,
        senderName: '1er Degré',
        senderEmail: 'hello@1erdegre.earth',
      });

      toast({
        title: 'Email envoyé',
        description: `L'email pré-atelier a été envoyé à ${recipients.length} destinataire(s)`,
      });
    } catch (error) {
      console.error('Error sending pre-workshop email:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'email",
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSendPost = async (content: string) => {
    try {
      const recipients = prepareRecipientsFromParticipants(eligibleParticipants);

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject: postState.subject,
        htmlContent: content,
        senderName: '1er Degré',
        senderEmail: 'hello@1erdegre.earth',
        emailType: 'post',
        currentUserId,
      });

      toast({
        title: 'Email envoyé',
        description: `L'email post-atelier a été envoyé à ${recipients.length} destinataire(s)`,
      });
    } catch (error) {
      console.error('Error sending post-workshop email:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'email",
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSendPostAndClose = async (content: string) => {
    try {
      const recipients = prepareRecipientsFromParticipants(eligibleParticipants);

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject: postState.subject,
        htmlContent: content,
        senderName: '1er Degré',
        senderEmail: 'hello@1erdegre.earth',
        emailType: 'post',
        currentUserId,
      });

      const { updateWorkshopStatus } = await import('@/services/organizer-workshops');
      await updateWorkshopStatus(workshop.id, 'closed', currentUserId);

      toast({
        title: 'Email envoyé et atelier clôturé',
        description: `L'email a été envoyé à ${recipients.length} destinataire(s) et l'atelier a été clôturé.`,
      });
    } catch (error) {
      console.error('Error sending email and closing workshop:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'email ou de clôturer l'atelier",
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCloseWithoutSending = async () => {
    try {
      const { updateWorkshopStatus } = await import('@/services/organizer-workshops');
      await updateWorkshopStatus(workshop.id, 'closed', currentUserId);

      toast({
        title: 'Atelier clôturé',
        description: "L'atelier a été clôturé sans envoi d'email.",
      });
    } catch (error) {
      console.error('Error closing workshop:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de clôturer l'atelier",
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSendSpontane = async (content: string) => {
    try {
      const recipients = prepareRecipientsFromParticipants(eligibleParticipants);

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject: spontaneState.subject,
        htmlContent: content,
        senderName: '1er Degré',
        senderEmail: 'hello@1erdegre.earth',
      });

      setSpontaneState((prev) => ({
        ...prev,
        subject: '',
        content: '',
      }));

      toast({
        title: 'Email envoyé',
        description: `Le message a été envoyé à ${recipients.length} destinataire(s)`,
      });
    } catch (error) {
      console.error('Error sending spontaneous email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSendTest = async (email: string, content: string, subject: string) => {
    try {
      const { data: userData } = await (supabase.from('users') as any)
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .maybeSingle();

      const firstName = userData?.first_name || 'Test';
      const lastName = userData?.last_name || 'User';

      const testRecipient = {
        email,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
      };

      await sendWorkshopEmail({
        workshop,
        recipients: [testRecipient],
        subject: `[TEST] ${subject}`,
        htmlContent: content,
        senderName: '1er Degré',
        senderEmail: 'hello@1erdegre.earth',
        emailType: undefined,
        currentUserId: undefined,
      });

      toast({
        description: `Email de test envoyé à ${email}`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'email de test",
        variant: 'destructive',
      });
      throw error;
    }
  };

  const canSaveAsTemplateFn = (type: 'pre' | 'post'): boolean => {
    const state = type === 'pre' ? preState : postState;

    if (!state.personalTemplate) {
      return true;
    }

    return (
      state.subject !== state.personalTemplate.subject ||
      state.content !== state.personalTemplate.html_content
    );
  };

  /** Callbacks stables pour le dirty → évite les boucles */
  const handlePreDirtyChange = useCallback((dirty: boolean) => {
    setPreState((prev) => (prev.isDirty === dirty ? prev : { ...prev, isDirty: dirty }));
  }, []);

  const handlePostDirtyChange = useCallback((dirty: boolean) => {
    setPostState((prev) => (prev.isDirty === dirty ? prev : { ...prev, isDirty: dirty }));
  }, []);

  const handleSpontaneDirtyChange = useCallback((dirty: boolean) => {
    setSpontaneState((prev) => (prev.isDirty === dirty ? prev : { ...prev, isDirty: dirty }));
  }, []);

  const [organizerEmail, setOrganizerEmail] = useState('');

  useEffect(() => {
    const fetchOrganizerEmail = async () => {
      const { data } = await (supabase.from('users') as any)
        .select('email')
        .eq('id', currentUserId)
        .maybeSingle();

      if (data && data.email) {
        setOrganizerEmail(data.email);
      }
    };

    fetchOrganizerEmail();
  }, [currentUserId]);

  if (isInitializing) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les données de l'atelier.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!workshop.workshop_family_id || !workshop.language) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertDescription>
            Données de l'atelier incomplètes. Veuillez vérifier que l'atelier a un type et une langue
            définis.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Alert className="border-blue-500 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          La fonctionnalité d'envoi automatique sera disponible prochainement. Vous pouvez préparer
          vos messages et gérer vos templates.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <Accordion
          type="single"
          collapsible
          value={activeAccordion}
          onValueChange={onAccordionChange}
        >
          <AccordionEmailEditor
            key={`pre-email-${editorKey.pre}`}
            value={preState.content}
            subject={preState.subject}
            title="Votre email pré-atelier"
            accordionValue="pre-email"
            scheduleLabel={scheduleLabel}
            recipientCount={recipientCount}
            canLoadTemplate={true}
            hasOfficialTemplate={!!preState.officialTemplate}
            hasPersonalTemplate={!!preState.personalTemplate}
            hasNewOfficialVersion={preState.hasNewOfficialVersion}
            loadedTemplate={preState.loadedTemplate}
            onLoadOfficialTemplate={() => handleLoadOfficialTemplate('pre')}
            onLoadPersonalTemplate={() => handleLoadPersonalTemplate('pre')}
            onSave={(content, subject) => handleSave('pre', content, subject)}
            onSaveAsTemplate={(content, subject) => handleSaveAsTemplate('pre', content, subject)}
            onSend={handleSendPre}
            onSendTest={(email, content) => handleSendTest(email, content, preState.subject)}
            organizerEmail={organizerEmail}
            isDirty={preState.isDirty}
            onDirtyChange={handlePreDirtyChange}
            onSubjectChange={(subject) =>
              setPreState((prev) => ({
                ...prev,
                subject,
              }))
            }
            onContentChange={(content) =>
              setPreState((prev) => ({
                ...prev,
                content,
              }))
            }
            roundedStyle="top"
            canSaveAsTemplate={canSaveAsTemplateFn('pre')}
            savedSubject={preState.savedSubject}
            savedContent={preState.savedContent}
            isLoadingTemplate={isLoadingTemplate.pre}
            isProgrammedEmail={true}
            emailSentDate={preEmailSentDate}
            isLocked={!!preEmailSentDate}
          />

          <AccordionEmailEditor
            key={`post-email-${editorKey.post}`}
            value={postState.content}
            subject={postState.subject}
            title="Votre email post-atelier"
            accordionValue="post-email"
            subtitleText={postSubtitleText}
            requiresAction={isPastWorkshop && workshop.lifecycle_status === 'active'}
            recipientCount={recipientCount}
            canLoadTemplate={true}
            hasOfficialTemplate={!!postState.officialTemplate}
            hasPersonalTemplate={!!postState.personalTemplate}
            hasNewOfficialVersion={postState.hasNewOfficialVersion}
            loadedTemplate={postState.loadedTemplate}
            onLoadOfficialTemplate={() => handleLoadOfficialTemplate('post')}
            onLoadPersonalTemplate={() => handleLoadPersonalTemplate('post')}
            onSave={(content, subject) => handleSave('post', content, subject)}
            onSaveAsTemplate={(content, subject) => handleSaveAsTemplate('post', content, subject)}
            onSend={handleSendPost}
            onSendTest={(email, content) => handleSendTest(email, content, postState.subject)}
            organizerEmail={organizerEmail}
            isDirty={postState.isDirty}
            onDirtyChange={handlePostDirtyChange}
            onSubjectChange={(subject) =>
              setPostState((prev) => ({
                ...prev,
                subject,
              }))
            }
            onContentChange={(content) =>
              setPostState((prev) => ({
                ...prev,
                content,
              }))
            }
            roundedStyle="bottom"
            canSaveAsTemplate={canSaveAsTemplateFn('post')}
            savedSubject={postState.savedSubject}
            savedContent={postState.savedContent}
            isLoadingTemplate={isLoadingTemplate.post}
            isPostWorkshopSection={true}
            canCloseWorkshop={isPastWorkshop && workshop.lifecycle_status === 'active'}
            onSendAndClose={handleSendPostAndClose}
            onCloseWithoutSending={handleCloseWithoutSending}
            emailSentDate={postEmailSentDate}
            isLocked={workshop.lifecycle_status === 'closed'}
          />

          <AccordionEmailEditor
            value={spontaneState.content}
            subject={spontaneState.subject}
            title="Contacter les participants"
            accordionValue="contact-email"
            subtitleText="Envoyez un message spontané aux participants"
            recipientCount={recipientCount}
            canLoadTemplate={false}
            hasOfficialTemplate={false}
            hasPersonalTemplate={false}
            hasNewOfficialVersion={false}
            loadedTemplate="none"
            onLoadOfficialTemplate={async () => {}}
            onLoadPersonalTemplate={async () => {}}
            onSave={async () => {}}
            onSaveAsTemplate={async () => {}}
            onSend={handleSendSpontane}
            onSendTest={(email, content) =>
              handleSendTest(email, content, spontaneState.subject)
            }
            organizerEmail={organizerEmail}
            isDirty={spontaneState.isDirty}
            onDirtyChange={handleSpontaneDirtyChange}
            onSubjectChange={(subject) =>
              setSpontaneState((prev) => ({
                ...prev,
                subject,
              }))
            }
            onContentChange={(content) =>
              setSpontaneState((prev) => ({
                ...prev,
                content,
              }))
            }
            roundedStyle="both"
            isContactSection={true}
            canSaveAsTemplate={false}
            savedSubject=""
            savedContent=""
          />
        </Accordion>
      </div>
    </div>
  );
}