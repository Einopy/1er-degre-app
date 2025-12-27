import { supabase } from './supabase';

interface FamilyColors {
  primary: string;
  bg: string;
}

const familyColorCache = new Map<string, FamilyColors>();

export async function getWorkshopFamilyColors(familyCode: string): Promise<FamilyColors> {
  if (familyColorCache.has(familyCode)) {
    return familyColorCache.get(familyCode)!;
  }

  const { data } = await supabase
    .from('workshop_families')
    .select('primary_color, secondary_color')
    .eq('code', familyCode)
    .maybeSingle();

  const familyData = data as any;
  const colors: FamilyColors = {
    primary: familyData?.primary_color || '#666666',
    bg: familyData?.secondary_color || '#F5F5F5',
  };

  familyColorCache.set(familyCode, colors);
  return colors;
}

export function getWorkshopFamilyColor(family: string): string {
  if (family === 'FDFP') return '#008E45';
  if (family === 'HD') return '#2D2B6B';
  return '#666666';
}

export function getWorkshopFamilyBgColor(family: string): string {
  if (family === 'FDFP') return '#E6F4ED';
  if (family === 'HD') return '#E8E7F0';
  return '#F5F5F5';
}

export function getOrganizerStatusLabel(role: string): string {
  const labels: Record<string, string> = {
    FDFP_public: 'Animateur GP',
    FDFP_pro: 'Animateur Pro',
    FDFP_trainer: 'Formateur',
    FDFP_instructor: 'Instructeur',
    HD_public: 'Animateur GP',
    HD_pro: 'Animateur Pro',
    HD_trainer: 'Formateur',
    HD_instructor: 'Instructeur',
  };
  return labels[role] || role;
}

export function getHighestOrganizerRole(roles: string[], family: string): string | null {
  const familyRoles = roles.filter(r => r.startsWith(`${family}_`));

  const hierarchy = [
    `${family}_instructor`,
    `${family}_trainer`,
    `${family}_pro`,
    `${family}_public`,
  ];

  for (const role of hierarchy) {
    if (familyRoles.includes(role)) {
      return role;
    }
  }

  return null;
}
