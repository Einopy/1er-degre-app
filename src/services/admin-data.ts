import { supabase } from '@/lib/supabase';
import type {
  Workshop,
  User,
  Participation,
  WaitlistEntry,
  MailLog,
  WorkshopHistoryLog,
} from '@/lib/database.types';
import { normalizeTextForSearch } from '@/lib/utils';

export interface AdminDashboardStats {
  completedWorkshops: number;
  activeWorkshops: number;
  totalParticipants: number;
  totalOrganizers: number;
  workshopsOverTime: { date: string; [key: string]: number | string }[];
  participantsOverTime: { date: string; [key: string]: number | string }[];
  organizersOverTime: { date: string; [key: string]: number | string }[];
  availableWorkshopFamilies: string[];
}

export interface RecentWorkshop {
  id: string;
  title: string;
  start_at: string;
  workshop_family_id: string;
  participants_count: number;
  audience_number: number;
  lifecycle_status?: string;
}

export interface RecentParticipant {
  id: string;
  user: User | null;
  workshop_title: string;
  workshop_family: string;
  created_at: string;
  status: string;
}

export interface RecentOrganizer {
  user: User;
  workshop_family: string;
  became_organizer_at: string;
  role: string;
}

export interface WorkshopWithDetails extends Workshop {
  organizer_user: User | null;
  co_organizers_users?: User[];
  participants_count: number;
  paid_count: number;
  waitlist_count: number;
  pre_email_sent: boolean;
  post_email_sent: boolean;
}

export interface ParticipantWithUser extends Participation {
  user: User | null;
}

export interface ParticipationDetail {
  id: string;
  status: 'en_attente' | 'inscrit' | 'paye' | 'rembourse' | 'echange' | 'annule';
  attended: boolean | null;
  created_at: string;
  workshop: {
    id: string;
    title: string;
    start_at: string;
    workshop_family_id: string;
  };
}

export interface OrganizerStats {
  user: User;
  workshopsCount: number;
  workshopCountsByFamily: Record<string, number>;
  lastWorkshopDate: string | null;
  lastWorkshopTitle: string | null;
  statusByFamily: Record<string, string>;
  rolesByFamily: Record<string, string[]>;
  animatorRoles: string[];
  participations: ParticipationDetail[];
}

export interface UserWithStats extends User {
  workshopsAttended: number;
  lastWorkshopDate: string | null;
}

export interface ParticipantStats {
  user: User;
  participations: ParticipationDetail[];
}

export async function fetchDashboardStats(
  monthsBack: number = 6
): Promise<AdminDashboardStats> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const startDateStr = startDate.toISOString();
  const now = new Date().toISOString();

  const [
    completedWorkshopsResult,
    activeWorkshopsResult,
    workshopsForChartResult,
    participationsData,
    trainingCompletionsData,
  ] = await Promise.all([
    supabase
      .from('workshops')
      .select('id', { count: 'exact' })
      .eq('lifecycle_status', 'closed')
      .gte('start_at', startDateStr)
      .lte('start_at', now),
    supabase
      .from('workshops')
      .select('id', { count: 'exact' })
      .in('lifecycle_status', ['active', 'draft']),
    supabase
      .from('workshops')
      .select('start_at, workshop_family_id')
      .eq('lifecycle_status', 'closed')
      .gte('start_at', startDateStr)
      .lte('start_at', now)
      .order('start_at', { ascending: true }),
    supabase
      .from('participations')
      .select('created_at, workshop_id, status')
      .eq('is_present', true)
      .gte('created_at', startDateStr),
    supabase
      .from('participations')
      .select(
        `
        user_id,
        attended,
        workshops!inner(
          start_at,
          workshop_family_id,
          workshop_type_id,
          workshop_type:workshop_types!inner(is_formation)
        )
      `
      )
      .eq('attended', true)
      .eq('workshops.workshop_type.is_formation', true),
  ]);

  const workshopsForChart = workshopsForChartResult.data || [];
  const workshopsOverTime = groupWorkshopsByMonth(workshopsForChart, monthsBack);

  const participationsForChart = participationsData.data || [];
  const participantsOverTime = await groupParticipantsByMonth(
    participationsForChart,
    monthsBack
  );

  const trainingCompletions = trainingCompletionsData.data || [];
  const organizersOverTime = await groupAnimatorsByMonth(
    trainingCompletions,
    monthsBack
  );

  // Count organizers by looking at user_role_levels
  const allOrganizersResult = await supabase
    .from('user_role_levels')
    .select('user_id, created_at')
    .gte('created_at', startDateStr);

  const uniqueOrganizerIds = [
    ...new Set((allOrganizersResult.data || []).map((url: any) => url.user_id)),
  ];
  const allOrganizers = uniqueOrganizerIds.map((id) => ({ id }));

  const availableFamilies = await fetchAvailableWorkshopFamilies();

  return {
    completedWorkshops: completedWorkshopsResult.count || 0,
    activeWorkshops: activeWorkshopsResult.count || 0,
    totalParticipants: participationsForChart.length,
    totalOrganizers: allOrganizers.length,
    workshopsOverTime,
    participantsOverTime,
    organizersOverTime,
    availableWorkshopFamilies: availableFamilies,
  };
}

function groupWorkshopsByMonth(
  workshops: any[],
  monthsBack: number
): { date: string; [key: string]: number | string }[] {
  const now = new Date();
  const monthMap = new Map<string, Map<string, number>>();
  const allFamilies = new Set<string>();

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (monthsBack - 1 - i),
      1
    );
    const monthStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-01`;
    monthMap.set(monthStr, new Map());
  }

  workshops.forEach((workshop: any) => {
    const familyCode = workshop.workshop_family_id;
    if (familyCode) {
      allFamilies.add(familyCode);
    }

    const date = new Date(workshop.start_at);
    const monthStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-01`;
    if (monthMap.has(monthStr) && familyCode) {
      const counts = monthMap.get(monthStr)!;
      counts.set(familyCode, (counts.get(familyCode) || 0) + 1);
    }
  });

  return Array.from(monthMap.entries()).map(([date, familyCounts]) => {
    const result: { date: string; [key: string]: number | string } = { date };
    let total = 0;

    allFamilies.forEach((family) => {
      const count = familyCounts.get(family) || 0;
      result[family] = count;
      total += count;
    });

    result.total = total;
    return result;
  });
}

async function groupParticipantsByMonth(
  participations: any[],
  monthsBack: number
): Promise<{ date: string; [key: string]: number | string }[]> {
  const now = new Date();
  const monthMap = new Map<string, Map<string, number>>();
  const allFamilies = new Set<string>();

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (monthsBack - 1 - i),
      1
    );
    const monthStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-01`;
    monthMap.set(monthStr, new Map());
  }

  const workshopIds = Array.from(new Set(participations.map((p) => p.workshop_id)));
  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, workshop_family_id')
    .in('id', workshopIds);

  const workshopMap = new Map(
    (workshops || []).map((w: any) => [w.id, w.workshop_family_id])
  );

  for (const participation of participations) {
    const familyCode = workshopMap.get(participation.workshop_id);
    if (familyCode) {
      allFamilies.add(familyCode);
    }

    const date = new Date(participation.created_at);
    const monthStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-01`;
    if (monthMap.has(monthStr) && familyCode) {
      const counts = monthMap.get(monthStr)!;
      counts.set(familyCode, (counts.get(familyCode) || 0) + 1);
    }
  }

  return Array.from(monthMap.entries()).map(([date, familyCounts]) => {
    const result: { date: string; [key: string]: number | string } = { date };
    let total = 0;

    allFamilies.forEach((family) => {
      const count = familyCounts.get(family) || 0;
      result[family] = count;
      total += count;
    });

    result.total = total;
    return result;
  });
}

async function groupAnimatorsByMonth(
  trainingCompletions: any[],
  monthsBack: number
): Promise<{ date: string; [key: string]: number | string }[]> {
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const monthMap = new Map<string, Date>();
  const allFamilies = new Set<string>();

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (monthsBack - 1 - i),
      1
    );
    const monthStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-01`;
    monthMap.set(monthStr, date);
  }

  const userCertifications = new Map<string, Map<string, Date | null>>();

  trainingCompletions.forEach((participation: any) => {
    const userId = participation.user_id;
    const workshop = participation.workshops;

    if (!workshop || !workshop.start_at || !workshop.workshop_type?.is_formation)
      return;

    const certificationDate = new Date(workshop.start_at);

    if (certificationDate < startDate || certificationDate > now) return;

    const family = workshop.workshop_family_id;
    if (family) {
      allFamilies.add(family);
    }

    if (!userCertifications.has(userId)) {
      userCertifications.set(userId, new Map());
    }

    const userCert = userCertifications.get(userId)!;

    if (family && (!userCert.get(family) || certificationDate < userCert.get(family)!)) {
      userCert.set(family, certificationDate);
    }
  });

  const userIds = Array.from(userCertifications.keys());

  const { data: userRoleLevelsData } = await supabase
    .from('user_role_levels')
    .select(
      `
      user_id,
      role_level:role_levels(
        workshop_family:workshop_families(code)
      )
    `
    )
    .in('user_id', userIds);

  const userFamiliesMap = new Map<string, Set<string>>();
  (userRoleLevelsData || []).forEach((url: any) => {
    const userId = url.user_id;
    const familyCode = url.role_level?.workshop_family?.code;

    if (familyCode) {
      if (!userFamiliesMap.has(userId)) {
        userFamiliesMap.set(userId, new Set());
      }
      userFamiliesMap.get(userId)!.add(familyCode);
    }
  });

  const result: { date: string; [key: string]: number | string }[] = [];

  for (const [monthStr, monthDate] of Array.from(monthMap.entries())) {
    const familyAnimators = new Map<string, Set<string>>();
    allFamilies.forEach((family) => familyAnimators.set(family, new Set()));

    for (const [userId, certDates] of userCertifications.entries()) {
      const families = userFamiliesMap.get(userId) || new Set();

      certDates.forEach((date, family) => {
        if (date && date <= monthDate && families.has(family)) {
          familyAnimators.get(family)?.add(userId);
        }
      });
    }

    const allAnimators = new Set<string>();
    familyAnimators.forEach((animators) => {
      animators.forEach((userId) => allAnimators.add(userId));
    });

    const monthData: { date: string; [key: string]: number | string } = {
      date: monthStr,
    };
    familyAnimators.forEach((animators, family) => {
      monthData[family] = animators.size;
    });
    monthData.total = allAnimators.size;

    result.push(monthData);
  }

  return result;
}

export interface ActionItem {
  type:
    | 'workshop_no_pre_email'
    | 'workshop_needs_closing'
    | 'order_no_tracking'
    | 'waitlist_with_seats';
  workshopId?: string;
  workshopTitle?: string;
  description: string;
  count?: number;
}

export async function fetchActionItems(): Promise<ActionItem[]> {
  const actions: ActionItem[] = [];
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: upcomingWorkshops } = await supabase
    .from('workshops')
    .select('id, title, start_at, mail_pre_html')
    .eq('lifecycle_status', 'active')
    .gte('start_at', now.toISOString())
    .lte('start_at', sevenDaysFromNow.toISOString());

  (upcomingWorkshops || []).forEach((workshop: any) => {
    if (!workshop.mail_pre_html || workshop.mail_pre_html.trim() === '') {
      actions.push({
        type: 'workshop_no_pre_email',
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        description: `Atelier "${workshop.title}" dans moins de 7 jours sans email pré-atelier`,
      });
    }
  });

  const { data: pastActiveWorkshops } = await supabase
    .from('workshops')
    .select('id, title, start_at')
    .eq('lifecycle_status', 'active')
    .lt('start_at', now.toISOString());

  (pastActiveWorkshops || []).forEach((workshop: any) => {
    actions.push({
      type: 'workshop_needs_closing',
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      description: `Atelier "${workshop.title}" passé, à clôturer`,
    });
  });

  return actions;
}

export interface AdminWorkshopFilters {
  lifecycleStatus?: string[];
  workshopFamily?: string[];
  workshopType?: string;
  startDate?: string;
  endDate?: string;
  organizerId?: string;
  city?: string;
  search?: string;
}

export async function fetchAdminWorkshops(
  filters: AdminWorkshopFilters = {}
): Promise<WorkshopWithDetails[]> {
  let familyUuids: string[] | undefined;
  let typeUuids: string[] | undefined;

  if (filters.workshopFamily && filters.workshopFamily.length > 0) {
    const { data: families } = await supabase
      .from('workshop_families')
      .select('id, code')
      .in('code', filters.workshopFamily);
    familyUuids = (families || []).map((f: any) => f.id);
  }

  if (filters.workshopType) {
    const { data: types } = await supabase
      .from('workshop_types')
      .select('id, code')
      .like('code', `%_${filters.workshopType}`);
    if (types && types.length > 0) {
      typeUuids = types.map((t: any) => t.id);
    }
  }

  let query = supabase
    .from('workshops')
    .select(
      `
      *,
      organizer_user:users!workshops_organizer_fkey(*),
      participations(status),
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(
        id,
        code,
        name,
        card_illustration_url
      ),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(
        id,
        code,
        label,
        is_formation,
        default_duration_minutes
      )
    `
    );

  if (filters.lifecycleStatus && filters.lifecycleStatus.length > 0) {
    query = query.in('lifecycle_status', filters.lifecycleStatus);
  }

  if (familyUuids && familyUuids.length > 0) {
    query = query.in('workshop_family_id', familyUuids);
  }

  if (typeUuids && typeUuids.length > 0) {
    query = query.in('workshop_type_id', typeUuids);
  }

  if (filters.startDate) {
    query = query.gte('start_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('start_at', filters.endDate);
  }

  if (filters.organizerId) {
    query = query.eq('organizer', filters.organizerId);
  }

  query = query.order('start_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching admin workshops:', error);
    throw error;
  }

  const workshopsData = data || [];

  const workshopsWithDetails = await Promise.all(
    workshopsData.map(async (workshop: any) => {
      const activeParticipations =
        workshop.participations?.filter((p: any) =>
          ['inscrit', 'paye', 'en_attente'].includes(p.status)
        ) || [];

      const paidParticipations =
        workshop.participations?.filter((p: any) => p.status === 'paye') || [];

      let coOrganizersUsers: User[] = [];
      if (workshop.co_organizers && workshop.co_organizers.length > 0) {
        const { data: coOrgUsers } = await supabase
          .from('users')
          .select('*')
          .in('id', workshop.co_organizers);
        coOrganizersUsers = coOrgUsers || [];
      }

      return {
        ...workshop,
        co_organizers_users: coOrganizersUsers,
        participants_count: activeParticipations.length,
        paid_count: paidParticipations.length,
        waitlist_count: 0,
        pre_email_sent: false,
        post_email_sent: false,
      };
    })
  );

  if (filters.search) {
    const searchNormalized = normalizeTextForSearch(filters.search);
    return workshopsWithDetails.filter((workshop) => {
      const titleMatch = workshop.title
        ? normalizeTextForSearch(workshop.title).includes(searchNormalized)
        : false;
      const descMatch = workshop.description
        ? normalizeTextForSearch(workshop.description).includes(searchNormalized)
        : false;
      const organizerMatch = workshop.organizer_user
        ? normalizeTextForSearch(
            `${workshop.organizer_user.first_name} ${workshop.organizer_user.last_name}`
          ).includes(searchNormalized)
        : false;
      const coOrganizerMatch =
        workshop.co_organizers_users?.some((coOrg: User) =>
          normalizeTextForSearch(
            `${coOrg.first_name} ${coOrg.last_name}`
          ).includes(searchNormalized)
        ) || false;
      const cityMatch = workshop.location?.city
        ? normalizeTextForSearch(workshop.location.city).includes(
            searchNormalized
          )
        : false;
      return (
        titleMatch || descMatch || organizerMatch || coOrganizerMatch || cityMatch
      );
    });
  }

  return workshopsWithDetails;
}

export async function fetchWorkshopParticipants(
  workshopId: string
): Promise<ParticipantWithUser[]> {
  const { data, error } = await supabase
    .from('participations')
    .select('*, user:users(*)')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }

  return (data || []) as ParticipantWithUser[];
}

export async function fetchWorkshopEmailLogs(
  workshopId: string
): Promise<MailLog[]> {
  const { data, error } = await supabase
    .from('mail_logs')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email logs:', error);
    throw error;
  }

  return data || [];
}

export async function fetchWorkshopHistory(
  workshopId: string
): Promise<WorkshopHistoryLog[]> {
  const { data, error } = await supabase
    .from('workshop_history_logs')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workshop history:', error);
    throw error;
  }

  return data || [];
}

export async function updateWorkshopLifecycleStatus(
  workshopId: string,
  status: 'active' | 'closed' | 'canceled'
): Promise<void> {
  const { error } = await (supabase.from('workshops') as any)
    .update({ lifecycle_status: status })
    .eq('id', workshopId);

  if (error) {
    console.error('Error updating workshop status:', error);
    throw error;
  }
}

export async function fetchOrganizers(
  clientId?: string
): Promise<OrganizerStats[]> {
  console.log('[fetchOrganizers] Start for clientId =', clientId);

  // 1) Lire user_role_levels avec join sur role_levels + workshop_families
  let urlQuery = supabase
    .from('user_role_levels')
    .select(
      `
      user_id,
      role_level:role_levels(
        internal_key,
        level,
        workshop_family:workshop_families(
          code,
          client_id
        )
      )
    `
    );

  if (clientId) {
    urlQuery = urlQuery.eq('role_level.workshop_family.client_id', clientId);
  }

  const { data: userRoleLevels, error: roleLevelsError } = await urlQuery;

  if (roleLevelsError) {
    console.error(
      '[fetchOrganizers] Error fetching user role levels:',
      roleLevelsError
    );
    throw roleLevelsError;
  }

  console.log(
    '[fetchOrganizers] joined user_role_levels count:',
    userRoleLevels?.length ?? 0,
    userRoleLevels
  );

  const filteredUserRoleLevels = (userRoleLevels || []).filter((url: any) => {
    const fam = url.role_level?.workshop_family;
    if (!fam) return false;
    if (!clientId) return true;
    return fam.client_id === clientId;
  });

  console.log(
    '[fetchOrganizers] filtered user_role_levels for client:',
    filteredUserRoleLevels.length
  );

  if (filteredUserRoleLevels.length === 0) {
    console.log(
      '[fetchOrganizers] No role_levels for this client → no organizers'
    );
    return [];
  }

  const organizerUserIds = [
    ...new Set(filteredUserRoleLevels.map((url: any) => url.user_id)),
  ];

  console.log(
    '[fetchOrganizers] Unique organizer user IDs:',
    organizerUserIds.length,
    organizerUserIds
  );

  if (organizerUserIds.length === 0) {
    return [];
  }

  // Map user_id -> ses user_role_levels
  const userRoleLevelsByUser = new Map<string, any[]>();
  filteredUserRoleLevels.forEach((url: any) => {
    const list = userRoleLevelsByUser.get(url.user_id) || [];
    list.push(url);
    userRoleLevelsByUser.set(url.user_id, list);
  });

  // 2) Récupérer les utilisateurs concernés
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('id', organizerUserIds)
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('[fetchOrganizers] Error fetching users:', usersError);
    throw usersError;
  }

  const organizers = (users || []) as User[];
  console.log('[fetchOrganizers] Fetched organizers users:', organizers.length);

  // 3) Construire les stats pour chaque utilisateur
  const organizerStats = await Promise.all(
    organizers.map(async (user: User) => {
      // 3.a) Ateliers organisés par cet utilisateur
      const { data: allWorkshops, count: totalCount } = await supabase
        .from('workshops')
        .select(
          `
          id,
          title,
          start_at,
          workshop_family_id,
          workshop_families!inner(code)
        `,
          { count: 'exact' }
        )
        .eq('organizer', user.id)
        .order('start_at', { ascending: false });

      const workshopsList = (allWorkshops as any[]) || [];
      const workshopCountsByFamily: Record<string, number> = {};

      workshopsList.forEach((workshop: any) => {
        const familyCode = workshop.workshop_families?.code as
          | string
          | undefined;
        if (familyCode) {
          workshopCountsByFamily[familyCode] =
            (workshopCountsByFamily[familyCode] || 0) + 1;
        }
      });

      // 3.b) Rôles & statuts par famille
      const rolesByFamily: Record<string, string[]> = {};
      const statusByFamily: Record<string, string> = {};
      const animatorRoles: string[] = [];

      const userRLs = userRoleLevelsByUser.get(user.id) || [];

      userRLs.forEach((url: any) => {
        const rl = url.role_level;
        if (!rl) return;

        const familyCode = rl.workshop_family?.code as string | undefined;
        const internalKey = rl.internal_key as string | undefined;

        if (!familyCode || !internalKey) return;

        if (!rolesByFamily[familyCode]) {
          rolesByFamily[familyCode] = [];
        }
        rolesByFamily[familyCode].push(internalKey);
        animatorRoles.push(`${familyCode}_${internalKey}`);
      });

      // Statut par famille (certifié / en cours)
      Object.entries(rolesByFamily).forEach(([familyCode, roleKeys]) => {
        if (roleKeys.includes('trainer') || roleKeys.includes('instructor')) {
          statusByFamily[familyCode] = 'certifié';
        } else {
          statusByFamily[familyCode] = 'en cours';
        }
      });

      console.log(
        `[fetchOrganizers] User ${user.email} animatorRoles:`,
        animatorRoles
      );

      // 3.c) Participations comme participant
      const { data: allParticipations } = await supabase
        .from('participations')
        .select('id, status, attended, created_at, workshop_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const participationsList = (allParticipations as any[]) || [];
      const participations: ParticipationDetail[] = [];

      if (participationsList.length > 0) {
        const workshopIds = participationsList.map((p) => p.workshop_id);
        const { data: participantWorkshops } = await supabase
          .from('workshops')
          .select('id, title, start_at, workshop_family_id')
          .in('id', workshopIds);

        const workshopsMap = new Map(
          ((participantWorkshops || []) as any[]).map((w: any) => [w.id, w])
        );

        participationsList.forEach((p: any) => {
          const workshop = workshopsMap.get(p.workshop_id);
          if (workshop) {
            participations.push({
              id: p.id,
              status: p.status,
              attended: p.attended,
              created_at: p.created_at,
              workshop: {
                id: workshop.id,
                title: workshop.title,
                start_at: workshop.start_at,
                workshop_family_id: workshop.workshop_family_id,
              },
            });
          }
        });
      }

      return {
        user,
        workshopsCount: totalCount || 0,
        workshopCountsByFamily,
        lastWorkshopDate:
          workshopsList.length > 0 ? workshopsList[0].start_at : null,
        lastWorkshopTitle:
          workshopsList.length > 0 ? workshopsList[0].title : null,
        statusByFamily,
        rolesByFamily,
        animatorRoles,
        participations,
      } as OrganizerStats;
    })
  );

  return organizerStats;
}

export async function fetchUsersWithStats(): Promise<UserWithStats[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  const usersWithStats = await Promise.all(
    (users || []).map(async (user: User) => {
      const { data: participations, count } = await supabase
        .from('participations')
        .select('workshop_id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .in('status', ['inscrit', 'paye'])
        .order('created_at', { ascending: false })
        .limit(1);

      const participationsList = (participations as any[]) || [];

      return {
        ...user,
        workshopsAttended: count || 0,
        lastWorkshopDate:
          participationsList.length > 0
            ? participationsList[0].created_at
            : null,
      };
    })
  );

  return usersWithStats;
}

export async function fetchParticipants(): Promise<ParticipantStats[]> {
  // Get all users who have role levels (organizers)
  const { data: organizerUserIds } = await supabase
    .from('user_role_levels')
    .select('user_id');

  const organizerIds = new Set(
    (organizerUserIds || []).map((url: any) => url.user_id)
  );

  // Fetch all users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  // Filter for users who are NOT organizers (i.e., participants only)
  const participants = (users || []).filter(
    (user: User) => !organizerIds.has(user.id)
  );

  const participantStats = await Promise.all(
    participants.map(async (user: User) => {
      const { data: allParticipations } = await supabase
        .from('participations')
        .select('id, status, attended, created_at, workshop_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const participationsList = (allParticipations as any[]) || [];

      const participations: ParticipationDetail[] = [];

      if (participationsList.length > 0) {
        const workshopIds = participationsList.map((p) => p.workshop_id);
        const { data: workshops } = await supabase
          .from('workshops')
          .select('id, title, start_at, workshop_family_id')
          .in('id', workshopIds);

        const workshopsMap = new Map(
          (workshops || []).map((w: any) => [w.id, w])
        );

        participationsList.forEach((p: any) => {
          const workshop = workshopsMap.get(p.workshop_id);
          if (workshop) {
            participations.push({
              id: p.id,
              status: p.status,
              attended: p.attended,
              created_at: p.created_at,
              workshop: {
                id: workshop.id,
                title: workshop.title,
                start_at: workshop.start_at,
                workshop_family_id: workshop.workshop_family_id,
              },
            });
          }
        });
      }

      return {
        user,
        participations,
      };
    })
  );

  return participantStats;
}

export interface WaitlistWithWorkshop extends WaitlistEntry {
  workshop: Workshop | null;
  user: User | null;
}

export async function fetchWaitlistEntries(): Promise<WaitlistWithWorkshop[]> {
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching waitlist entries:', error);
    throw error;
  }

  const entriesWithDetails = await Promise.all(
    (data || []).map(async (entry: WaitlistEntry) => {
      const workshopData = entry.notified_workshop_id
        ? await supabase
            .from('workshops')
            .select('*')
            .eq('id', entry.notified_workshop_id)
            .maybeSingle()
        : { data: null };

      const userData = entry.user_id
        ? await supabase
            .from('users')
            .select('*')
            .eq('id', entry.user_id)
            .maybeSingle()
        : { data: null };

      return {
        ...entry,
        workshop: workshopData.data || null,
        user: userData.data || null,
      };
    })
  );

  return entriesWithDetails;
}

export async function updateWaitlistStatus(
  entryId: string,
  status: 'waiting' | 'notified' | 'converted' | 'expired'
): Promise<void> {
  const { error } = await (supabase.from('waitlist_entries') as any)
    .update({ status })
    .eq('id', entryId);

  if (error) {
    console.error('Error updating waitlist status:', error);
    throw error;
  }
}

export async function fetchAvailableWorkshopFamilies(): Promise<string[]> {
  const { data, error } = await supabase
    .from('workshop_families')
    .select('code')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching workshop families:', error);
    return [];
  }

  return (data || []).map((family: any) => family.code);
}

export async function fetchActiveWorkshops(
  workshopFamily?: string
): Promise<WorkshopWithDetails[]> {
  let familyUuid: string | undefined;

  if (workshopFamily) {
    const { data: family } = await supabase
      .from('workshop_families')
      .select('id')
      .eq('code', workshopFamily)
      .maybeSingle();
    familyUuid = (family as any)?.id;
  }

  let query = supabase
    .from('workshops')
    .select(
      `
      *,
      organizer_user:users!workshops_organizer_fkey(id, first_name, last_name, email),
      participations(status),
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(
        id,
        code,
        name,
        card_illustration_url
      ),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(
        id,
        code,
        label,
        is_formation,
        default_duration_minutes
      )
    `
    )
    .not('lifecycle_status', 'in', '(closed,canceled)')
    .order('start_at', { ascending: true });

  if (familyUuid) {
    query = query.eq('workshop_family_id', familyUuid);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active workshops:', error);
    throw error;
  }

  const workshopsWithDetails: WorkshopWithDetails[] = await Promise.all(
    (data || []).map(async (workshop: any) => {
      const activeParticipations =
        workshop.participations?.filter((p: any) =>
          ['inscrit', 'paye'].includes(p.status)
        ) || [];

      let co_organizers_users: User[] = [];
      if (workshop.co_organizers && workshop.co_organizers.length > 0) {
        const { data: coOrgUsers } = await supabase
          .from('users')
          .select('*')
          .in('id', workshop.co_organizers);
        co_organizers_users = coOrgUsers || [];
      }

      return {
        ...workshop,
        organizer_user: workshop.organizer_user || null,
        co_organizers_users,
        participants_count: activeParticipations.length,
        paid_count: 0,
        waitlist_count: 0,
        pre_email_sent: false,
        post_email_sent: false,
      };
    })
  );

  return workshopsWithDetails;
}

export async function fetchRecentCompletedWorkshops(
  limit: number = 3,
  workshopFamily?: string
): Promise<WorkshopWithDetails[]> {
  let familyUuid: string | undefined;

  if (workshopFamily) {
    const { data: family } = await supabase
      .from('workshop_families')
      .select('id')
      .eq('code', workshopFamily)
      .maybeSingle();
    familyUuid = (family as any)?.id;
  }

  let query = supabase
    .from('workshops')
    .select(
      `
      *,
      organizer_user:users!workshops_organizer_fkey(id, first_name, last_name, email),
      participations(status, is_present),
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(
        id,
        code,
        name,
        card_illustration_url
      ),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(
        id,
        code,
        label,
        is_formation,
        default_duration_minutes
      )
    `
    )
    .eq('lifecycle_status', 'closed')
    .order('start_at', { ascending: false })
    .limit(limit);

  if (familyUuid) {
    query = query.eq('workshop_family_id', familyUuid);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent completed workshops:', error);
    throw error;
  }

  const workshopsWithDetails: WorkshopWithDetails[] = await Promise.all(
    (data || []).map(async (workshop: any) => {
      const activeParticipations =
        workshop.participations?.filter((p: any) =>
          ['inscrit', 'paye'].includes(p.status)
        ) || [];

      let co_organizers_users: User[] = [];
      if (workshop.co_organizers && workshop.co_organizers.length > 0) {
        const { data: coOrgUsers } = await supabase
          .from('users')
          .select('*')
          .in('id', workshop.co_organizers);
        co_organizers_users = coOrgUsers || [];
      }

      return {
        ...workshop,
        organizer_user: workshop.organizer_user || null,
        co_organizers_users,
        participants_count: activeParticipations.length,
        paid_count: 0,
        waitlist_count: 0,
        pre_email_sent: false,
        post_email_sent: false,
      };
    })
  );

  return workshopsWithDetails;
}

export async function fetchRecentParticipants(
  limit: number = 3,
  workshopFamily?: string
): Promise<RecentParticipant[]> {
  let query = supabase
    .from('participations')
    .select(
      `
      id,
      user_id,
      workshop_id,
      created_at,
      status,
      user:users(*),
      workshop:workshops(title, workshop_family_id)
    `
    )
    .in('status', ['inscrit', 'paye'])
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent participants:', error);
    throw error;
  }

  const participantsWithDetails = (data || []).map((participation: any) => {
    const workshopData = participation
      .workshop as { title: string; workshop_family_id: string } | null;

    return {
      id: participation.id,
      user: participation.user || null,
      workshop_title: workshopData?.title || 'N/A',
      workshop_family: workshopData?.workshop_family_id || '',
      created_at: participation.created_at,
      status: participation.status,
    };
  });

  const filtered = workshopFamily
    ? participantsWithDetails.filter(
        (p) => p.workshop_family === workshopFamily
      )
    : participantsWithDetails;

  return filtered.slice(0, limit);
}

export async function fetchRecentOrganizers(
  limit: number = 3,
  workshopFamily?: string
): Promise<RecentOrganizer[]> {
  // Get recent user_role_levels with user and family info
  let query = supabase
    .from('user_role_levels')
    .select(
      `
      granted_at,
      user:users(*),
      role_level:role_levels(
        internal_key,
        workshop_family:workshop_families(code)
      )
    `
    )
    .order('granted_at', { ascending: false })
    .limit(100);

  const { data: userRoleLevels, error } = await query;

  if (error) {
    console.error('Error fetching recent organizers:', error);
    throw error;
  }

  const organizerEvents: RecentOrganizer[] = [];
  const addedUsers = new Map<string, Set<string>>(); // user_id -> Set<family_code>

  for (const url of (userRoleLevels || []) as any[]) {
    const user = url.user;
    const familyCode = url.role_level?.workshop_family?.code;
    const roleKey = url.role_level?.internal_key || '';

    if (!user || !familyCode) continue;

    // Skip if family filter doesn't match
    if (workshopFamily && familyCode !== workshopFamily) continue;

    // Track which families we've added for this user to avoid duplicates
    if (!addedUsers.has(user.id)) {
      addedUsers.set(user.id, new Set());
    }
    const userFamilies = addedUsers.get(user.id)!;

    if (userFamilies.has(familyCode)) continue;

    organizerEvents.push({
      user,
      workshop_family: familyCode,
      became_organizer_at: url.granted_at,
      role: roleKey,
    });

    userFamilies.add(familyCode);

    if (organizerEvents.length >= limit) break;
  }

  return organizerEvents.slice(0, limit);
}

export async function updateAnimatorEmail(
  userId: string,
  newEmail: string
): Promise<void> {
  const { error } = await (supabase.from('users') as any)
    .update({ email: newEmail })
    .eq('id', userId);

  if (error) {
    console.error('Error updating animator email:', error);
    throw error;
  }
}

export interface AnimatorProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  birthdate?: string | null;
  language_animation?: string | null;
  outside_animation?: string | null;
  signed_contract?: boolean;
  signed_contract_year?: number | null;
}

export async function updateAnimatorProfile(
  userId: string,
  profileData: AnimatorProfileUpdate
): Promise<void> {
  const { error } = await (supabase.from('users') as any)
    .update(profileData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating animator profile:', error);
    throw error;
  }
}

export async function updateAnimatorRoles(
  userId: string,
  animatorRoles: string[]
): Promise<void> {
  const { data: existingRoleLevels, error: fetchError } = await supabase
    .from('user_role_levels')
    .select(
      'id, role_level_id, role_levels!inner(internal_key, workshop_families!inner(code))'
    )
    .eq('user_id', userId);

  if (fetchError) {
    console.error('Error fetching existing role levels:', fetchError);
    throw fetchError;
  }

  const existingRoleLevelsData = (existingRoleLevels as any[]) || [];
  const existingRoleKeys = existingRoleLevelsData
    .map((url: any) => {
      const familyCode = url.role_levels?.workshop_families?.code;
      const internalKey = url.role_levels?.internal_key;
      return familyCode && internalKey ? `${familyCode}_${internalKey}` : null;
    })
    .filter((key): key is string => key !== null);

  const toAdd = animatorRoles.filter((role) => !existingRoleKeys.includes(role));
  const toRemove = existingRoleKeys.filter(
    (role) => !animatorRoles.includes(role)
  );

  if (toRemove.length > 0) {
    const idsToRemove = existingRoleLevelsData
      .filter((url: any) => {
        const familyCode = url.role_levels?.workshop_families?.code;
        const internalKey = url.role_levels?.internal_key;
        const fullKey =
          familyCode && internalKey ? `${familyCode}_${internalKey}` : null;
        return fullKey && toRemove.includes(fullKey);
      })
      .map((url: any) => url.id);

    if (idsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_role_levels')
        .delete()
        .in('id', idsToRemove);

      if (deleteError) {
        console.error('Error deleting role levels:', deleteError);
        throw deleteError;
      }
    }
  }

  if (toAdd.length > 0) {
    for (const roleKey of toAdd) {
      const [familyCode, internalKey] = roleKey.split('_');

      const { data: familyData, error: familyError } = await (supabase
        .from('workshop_families') as any)
        .select('id')
        .eq('code', familyCode)
        .maybeSingle();

      if (familyError || !familyData) {
        console.error(
          `Workshop family not found for code: ${familyCode}`,
          familyError
        );
        continue;
      }

      const { data: roleLevelData, error: roleLevelError } = await (supabase
        .from('role_levels') as any)
        .select('id')
        .eq('internal_key', internalKey)
        .eq('workshop_family_id', familyData.id)
        .maybeSingle();

      if (roleLevelError || !roleLevelData) {
        console.error(
          `Role level not found for ${familyCode}_${internalKey}`,
          roleLevelError
        );
        continue;
      }

      const { error: insertError } = await (supabase
        .from('user_role_levels') as any).insert({
        user_id: userId,
        role_level_id: roleLevelData.id,
      });

      if (insertError) {
        console.error('Error inserting role level:', insertError);
        throw insertError;
      }
    }
  }
}