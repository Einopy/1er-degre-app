import { differenceInMinutes, addMinutes } from 'date-fns';
import type { WorkshopType, WorkshopFamily } from './database.types';
import { fetchWorkshopTypes, fetchWorkshopFamilies } from '@/services/client-config';

export interface WorkshopDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
  hasExtraTime?: boolean;
  extraMinutes?: number;
}

export const WORKSHOP_TYPE_DURATIONS: Record<string, number> = {
  formation: 180,
  formation_pro_1: 120,
  formation_pro_2: 150,
  formation_formateur: 240,
  formation_retex: 90,
};

let workshopTypesCache: Record<string, WorkshopType[]> = {};
let workshopFamiliesCache: Record<string, WorkshopFamily[]> = {};
let cacheTimestamp: Record<string, number> = {};
const CACHE_TTL = 5 * 60 * 1000;

export async function getWorkshopTypesWithCache(clientId: string): Promise<WorkshopType[]> {
  const now = Date.now();
  const cacheKey = `types_${clientId}`;

  if (workshopTypesCache[clientId] && (now - (cacheTimestamp[cacheKey] || 0)) < CACHE_TTL) {
    return workshopTypesCache[clientId];
  }

  const types = await fetchWorkshopTypes(clientId);
  workshopTypesCache[clientId] = types;
  cacheTimestamp[cacheKey] = now;

  return types;
}

export async function getWorkshopFamiliesWithCache(clientId: string): Promise<WorkshopFamily[]> {
  const now = Date.now();
  const cacheKey = `families_${clientId}`;

  if (workshopFamiliesCache[clientId] && (now - (cacheTimestamp[cacheKey] || 0)) < CACHE_TTL) {
    return workshopFamiliesCache[clientId];
  }

  const families = await fetchWorkshopFamilies(clientId);
  workshopFamiliesCache[clientId] = families;
  cacheTimestamp[cacheKey] = now;

  return families;
}

export function clearWorkshopCache(clientId?: string) {
  if (clientId) {
    delete workshopTypesCache[clientId];
    delete workshopFamiliesCache[clientId];
    delete cacheTimestamp[`types_${clientId}`];
    delete cacheTimestamp[`families_${clientId}`];
  } else {
    workshopTypesCache = {};
    workshopFamiliesCache = {};
    cacheTimestamp = {};
  }
}

export function getDefaultDuration(workshopType: string): number {
  return WORKSHOP_TYPE_DURATIONS[workshopType] || 180;
}

export async function getDefaultDurationAsync(
  typeId: string,
  clientId: string
): Promise<number> {
  try {
    const types = await getWorkshopTypesWithCache(clientId);
    const type = types.find(t => t.id === typeId);
    return type?.default_duration_minutes || 180;
  } catch (error) {
    console.error('Error fetching duration:', error);
    return 180;
  }
}

export async function getDefaultDurationByCode(
  typeCode: string,
  clientId: string
): Promise<number> {
  try {
    const types = await getWorkshopTypesWithCache(clientId);
    const type = types.find(t => t.code === typeCode);
    return type?.default_duration_minutes || getDefaultDuration(typeCode);
  } catch (error) {
    console.error('Error fetching duration by code:', error);
    return getDefaultDuration(typeCode);
  }
}

export function calculateEndTime(startAt: string, workshopTypeIdOrCode: string, extraMinutes: number = 0): Date {
  const start = new Date(startAt);
  const baseDuration = getDefaultDuration(workshopTypeIdOrCode);
  const totalMinutes = baseDuration + extraMinutes;
  return addMinutes(start, totalMinutes);
}

export async function calculateEndTimeAsync(
  startAt: string,
  typeId: string,
  clientId: string,
  extraMinutes: number = 0
): Promise<Date> {
  const start = new Date(startAt);
  const baseDuration = await getDefaultDurationAsync(typeId, clientId);
  const totalMinutes = baseDuration + extraMinutes;
  return addMinutes(start, totalMinutes);
}

export function calculateWorkshopDuration(startAt: string, endAt: string, extraMinutes?: number): WorkshopDuration {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const totalMinutes = differenceInMinutes(end, start);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    hasExtraTime: extraMinutes ? extraMinutes > 0 : false,
    extraMinutes: extraMinutes || 0,
  };
}

export function formatDuration(duration: WorkshopDuration): string {
  if (duration.hours === 0) {
    return `${duration.minutes}min`;
  }

  if (duration.minutes === 0) {
    return `${duration.hours}h`;
  }

  return `${duration.hours}h${duration.minutes}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export interface PriceInfo {
  label: string;
  description: string;
  price: number;
}

export interface TicketTypeInfo {
  type: 'normal' | 'reduit' | 'gratuit' | 'pro';
  label: string;
  description: string;
  price: number;
  available: boolean;
}

export function getWorkshopPrice(workshopType: string, classificationStatus: string): PriceInfo {
  const isFormationType = ['formation', 'formation_retex', 'formation_pro_1', 'formation_pro_2', 'formation_formateur'].includes(workshopType);

  if (isFormationType) {
    return {
      label: 'Gratuit',
      description: 'Inscription gratuite pour les formations',
      price: 0,
    };
  }

  const basePrice = getClassificationBasePrice(classificationStatus);

  if (basePrice === 0) {
    return {
      label: 'Gratuit',
      description: 'Accès gratuit',
      price: 0,
    };
  }

  return {
    label: 'Tarif',
    description: 'Tarif basé sur la classification',
    price: basePrice,
  };
}

export function getTicketTypes(workshopType: string, classificationStatus: string): TicketTypeInfo[] {
  const priceInfo = getWorkshopPrice(workshopType, classificationStatus);

  return [{
    type: priceInfo.price === 0 ? 'gratuit' : 'normal',
    label: priceInfo.label,
    description: priceInfo.description,
    price: priceInfo.price,
    available: true,
  }];
}

function getClassificationBasePrice(classificationStatus: string): number {
  const priceMap: Record<string, number> = {
    'benevole_grand_public': 12,
    'interne_asso': 8,
    'externe_asso': 8,
    'interne_entreprise': 12,
    'externe_entreprise': 12,
    'interne_profs': 8,
    'externe_profs': 8,
    'interne_etudiants_alumnis': 0,
    'externe_etudiants_alumnis': 4,
    'interne_elus': 8,
    'externe_elus': 8,
    'interne_agents': 8,
    'externe_agents': 8,
  };

  return priceMap[classificationStatus] || 12;
}

export function getWorkshopTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    workshop: 'Atelier',
    formation: 'Formation',
    formation_pro_1: 'Formation Pro 1',
    formation_pro_2: 'Formation Pro 2',
    formation_formateur: 'Formation Formateur',
    formation_retex: 'Formation Retex',
  };

  return labels[type] || type;
}

export function getWorkshopFamilyLabel(family: string): string {
  const labels: Record<string, string> = {
    FDFP: 'Fresque du Futur Proche',
    HD: 'Human Design',
  };

  return labels[family] || family;
}

export async function getWorkshopFamilyLabelAsync(
  familyId: string,
  clientId: string
): Promise<string> {
  try {
    const families = await getWorkshopFamiliesWithCache(clientId);
    const family = families.find(f => f.id === familyId);
    return family?.name || 'Unknown';
  } catch (error) {
    console.error('Error fetching family label:', error);
    return 'Unknown';
  }
}

export async function getWorkshopTypeLabelAsync(
  typeId: string,
  clientId: string
): Promise<string> {
  try {
    const types = await getWorkshopTypesWithCache(clientId);
    const type = types.find(t => t.id === typeId);
    return type?.label || 'Unknown';
  } catch (error) {
    console.error('Error fetching type label:', error);
    return 'Unknown';
  }
}

export function getClassificationLabel(status: string): string {
  const labels: Record<string, string> = {
    benevole_grand_public: 'Grand public',
    interne_asso: 'Interne - Association',
    interne_entreprise: 'Interne - Entreprise',
    interne_profs: 'Interne - Professeurs',
    interne_etudiants_alumnis: 'Interne - Étudiants/Alumni',
    interne_elus: 'Interne - Élus',
    interne_agents: 'Interne - Agents',
    externe_asso: 'Externe - Association',
    externe_entreprise: 'Externe - Entreprise',
    externe_profs: 'Externe - Professeurs',
    externe_etudiants_alumnis: 'Externe - Étudiants/Alumni',
    externe_elus: 'Externe - Élus',
    externe_agents: 'Externe - Agents',
  };

  return labels[status] || status;
}
