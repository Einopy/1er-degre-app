import type { WorkshopLocation } from './database.types';

export interface WorkshopWizardData {
  workshop_family_id: string;
  language_code: string;
  workshop_type_id: string;
  title: string;
  description: string;
  classification_status: string;
  coOrganizers?: string[];
  start_at: Date;
  start_time: string;
  extra_duration_minutes: number;
  audience_number: number;
  is_remote: boolean;
  visio_link?: string;
  mural_link?: string;
  location?: WorkshopLocation;
  enablePostWorkshopEmails?: boolean;
}

export type WizardStep = 'workshop-family' | 'event-type-language' | 'classification-coorg' | 'details' | 'schedule' | 'location' | 'review';

export interface WizardStepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'workshop-family', label: 'Fresques disponibles', description: 'Sélection de la fresque' },
  { id: 'event-type-language', label: 'Type et langue de l\'évènement', description: 'Configuration de l\'évènement' },
  { id: 'classification-coorg', label: 'Classification et co-organisateurs', description: 'Audience et équipe' },
  { id: 'details', label: 'Détails de l\'évènement', description: 'Titre, description et capacité' },
  { id: 'schedule', label: 'Planification', description: 'Date, heure et durée' },
  { id: 'location', label: 'Mode de l\'atelier', description: 'Présentiel ou distanciel' },
  { id: 'review', label: 'Récapitulatif', description: 'Vérification finale' },
];
