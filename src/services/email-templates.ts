import { supabase } from '@/lib/supabase';
import type { Workshop } from '@/lib/database.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface EmailTemplate {
  id: string;
  user_id: string | null;
  workshop_type: string;
  workshop_classification: string;
  language: string;
  template_type: 'pre' | 'post';
  subject: string;
  html_content: string;
  is_official: boolean;
  official_version: number;
  last_viewed_official_version: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface MergeTagContext {
  first_name: string;
  last_name: string;
  workshop_title: string;
  workshop_date: string;
  workshop_time: string;
  location: string;
  visio_link?: string;
  mural_link?: string;
}

export const AVAILABLE_MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'Prénom', description: 'Prénom du participant' },
  { tag: '{{last_name}}', label: 'Nom', description: 'Nom du participant' },
  { tag: '{{workshop_title}}', label: 'Titre de l\'atelier', description: 'Titre complet de l\'atelier' },
  { tag: '{{workshop_date}}', label: 'Date', description: 'Date de l\'atelier' },
  { tag: '{{workshop_time}}', label: 'Heure', description: 'Heure de début' },
  { tag: '{{location}}', label: 'Lieu', description: 'Adresse complète ou "En ligne"' },
  { tag: '{{visio_link}}', label: 'Lien visio', description: 'Lien de visioconférence (si distanciel)' },
  { tag: '{{mural_link}}', label: 'Lien Mural', description: 'Lien vers l\'espace collaboratif (si disponible)' },
];

export async function fetchOfficialTemplate(
  workshopType: string,
  language: string,
  templateType: 'pre' | 'post'
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('is_official', true)
    .eq('workshop_type', workshopType)
    .eq('language', language)
    .eq('template_type', templateType)
    .maybeSingle();

  if (error) {
    console.error('Error fetching official template:', error);
    throw error;
  }

  return data as EmailTemplate | null;
}

export async function fetchPersonalTemplate(
  userId: string,
  workshopType: string,
  language: string,
  templateType: 'pre' | 'post'
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('workshop_type', workshopType)
    .eq('language', language)
    .eq('template_type', templateType)
    .eq('is_official', false)
    .maybeSingle();

  if (error) {
    console.error('Error fetching personal template:', error);
    throw error;
  }

  return data as EmailTemplate | null;
}

export async function savePersonalTemplate(
  userId: string,
  workshopType: string,
  language: string,
  templateType: 'pre' | 'post',
  subject: string,
  htmlContent: string
): Promise<EmailTemplate> {
  const existingTemplate = await fetchPersonalTemplate(userId, workshopType, language, templateType);

  if (existingTemplate) {
    const { data, error } = await (supabase
      .from('email_templates') as any)
      .update({
        subject,
        html_content: htmlContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingTemplate.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating personal template:', error);
      throw error;
    }

    return data as EmailTemplate;
  } else {
    const { data, error } = await (supabase
      .from('email_templates') as any)
      .insert({
        user_id: userId,
        workshop_type: workshopType,
        language,
        template_type: templateType,
        subject,
        html_content: htmlContent,
        is_official: false,
        official_version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating personal template:', error);
      throw error;
    }

    return data as EmailTemplate;
  }
}

export async function updateLastViewedOfficialVersion(
  templateId: string,
  officialVersion: number
): Promise<void> {
  const { error } = await (supabase
    .from('email_templates') as any)
    .update({
      last_viewed_official_version: officialVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    console.error('Error updating last viewed version:', error);
    throw error;
  }
}

export function replaceMergeTags(template: string, context: MergeTagContext): string {
  let result = template;

  result = result.replace(/\{\{first_name\}\}/g, context.first_name);
  result = result.replace(/\{\{last_name\}\}/g, context.last_name);
  result = result.replace(/\{\{workshop_title\}\}/g, context.workshop_title);
  result = result.replace(/\{\{workshop_date\}\}/g, context.workshop_date);
  result = result.replace(/\{\{workshop_time\}\}/g, context.workshop_time);
  result = result.replace(/\{\{location\}\}/g, context.location);

  if (context.visio_link) {
    result = result.replace(/\{\{visio_link\}\}/g, context.visio_link);
  } else {
    result = result.replace(/\{\{visio_link\}\}/g, '');
  }

  if (context.mural_link) {
    result = result.replace(/\{\{mural_link\}\}/g, context.mural_link);
  } else {
    result = result.replace(/\{\{mural_link\}\}/g, '');
  }

  return result;
}

export function createMergeTagContext(
  workshop: Workshop,
  firstName: string,
  lastName: string
): MergeTagContext {
  const startDate = new Date(workshop.start_at);
  const location = workshop.location as any;

  return {
    first_name: firstName,
    last_name: lastName,
    workshop_title: workshop.title,
    workshop_date: format(startDate, 'EEEE d MMMM yyyy', { locale: fr }),
    workshop_time: format(startDate, 'HH:mm'),
    location: workshop.is_remote
      ? 'En ligne'
      : location
        ? `${location.venue_name}, ${location.street}, ${location.postal_code} ${location.city}`
        : 'À définir',
    visio_link: workshop.visio_link || undefined,
    mural_link: workshop.mural_link || undefined,
  };
}

export function insertMergeTag(
  currentText: string,
  cursorPosition: number,
  mergeTag: string
): { text: string; newCursorPosition: number } {
  const before = currentText.substring(0, cursorPosition);
  const after = currentText.substring(cursorPosition);
  const newText = before + mergeTag + after;
  const newCursorPosition = cursorPosition + mergeTag.length;

  return {
    text: newText,
    newCursorPosition,
  };
}
