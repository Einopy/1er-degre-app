import type { WorkshopFamily as BaseWorkshopFamily, RoleLevel as BaseRoleLevel } from './database.types';

export interface ExtendedWorkshopFamily extends Partial<BaseWorkshopFamily> {
  id: string;
  code: string;
  name: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  badge_emoji?: string | null;
  description_short?: string | null;
  description_long?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface ExtendedRoleLevel extends Partial<BaseRoleLevel> {
  id: string;
  workshop_family_id: string;
  internal_key: string;
  label: string;
  level: number;
  badge_emoji?: string | null;
  badge_color_primary?: string | null;
  badge_color_bg?: string | null;
  description_short?: string | null;
  description_long?: string | null;
}

export type { ExtendedWorkshopFamily as WorkshopFamily, ExtendedRoleLevel as RoleLevel };
