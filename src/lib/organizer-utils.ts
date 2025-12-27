import type { User, Workshop } from './database.types';
import { isClientAdminForClient } from '@/services/user-permissions';

export type WorkshopFamily = string;

export type WorkshopPermission =
  | 'FDFP_public'
  | 'FDFP_pro'
  | 'FDFP_trainer'
  | 'FDFP_instructor'
  | 'HD_public'
  | 'HD_pro'
  | 'HD_trainer'
  | 'HD_instructor';

export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.is_super_admin === true;
}

export async function isAdmin(user: User | null, clientId?: string): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  if (clientId) {
    return await isClientAdminForClient(user.id, clientId);
  }

  return false;
}

export function canManageWorkshop(
  user: User | null,
  workshop: Workshop | null
): boolean {
  if (!user || !workshop) return false;

  if (isSuperAdmin(user)) return true;

  if (workshop.organizer === user.id) return true;

  if (workshop.co_organizers && Array.isArray(workshop.co_organizers)) {
    return workshop.co_organizers.includes(user.id);
  }

  return false;
}

export function getWorkshopFamilyLabel(workshopFamily: string): string {
  const labels: Record<string, string> = {
    FDFP: 'Fresque du Faire ensemble',
    HD: 'Hackons le Débat',
  };
  return labels[workshopFamily] || workshopFamily;
}

export function getPermissionLabel(permission: WorkshopPermission): string {
  return permission.replace('_', ' - ');
}

export function getUserWorkshopPermissions(_user: User | null): WorkshopPermission[] {
  console.warn('getUserWorkshopPermissions is deprecated - use permissions from AuthContext instead');
  return [];
}

export function hasRole(_user: User | null, _role: string): boolean {
  console.warn('hasRole is deprecated - use permissions from AuthContext instead');
  return false;
}

export function getAvailableWorkshopFamilies(_user: User | null): string[] {
  console.warn('getAvailableWorkshopFamilies is deprecated - use permissions from AuthContext instead');
  return [];
}

export function canCreateWorkshop(_user: User | null, _workshopFamily: string): boolean {
  console.warn('canCreateWorkshop is deprecated - use permissions from AuthContext instead');
  return false;
}
