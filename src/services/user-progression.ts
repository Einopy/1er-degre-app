import { supabase } from '@/lib/supabase';
import type { RoleLevel, RoleRequirement } from '@/lib/database.types';

export interface ProgressionStats {
  completedFormationIds: string[];
  totalWorkshops: number;
  onlineWorkshops: number;
  inPersonWorkshops: number;
  feedbackCount: number;
  averageFeedback: number;
}

export interface RoleLevelProgress {
  roleLevel: RoleLevel;
  requirements: RoleRequirement | null;
  status: 'locked' | 'in_progress' | 'achieved';
  progress: {
    formations: {
      completed: string[];
      required: string[];
      completedCount: number;
      requiredCount: number;
    };
    workshopsTotal: {
      current: number;
      required: number;
    };
    workshopsOnline: {
      current: number;
      required: number;
    };
    workshopsInPerson: {
      current: number;
      required: number;
    };
    feedback: {
      count: number;
      requiredCount: number;
      average: number;
      requiredAverage: number;
    };
  };
}

export interface UserProgression {
  currentLevel: number;
  levels: RoleLevelProgress[];
  stats: ProgressionStats;
}

/**
 * Get completed formations for a user in a specific client/family
 */
export async function getCompletedFormations(
  userId: string,
  clientId: string,
  familyId: string
): Promise<string[]> {
  try {
    // Get participations where user attended
    const { data: participations, error: partError } = await supabase
      .from('participations')
      .select('workshop_id')
      .eq('user_id', userId)
      .eq('attended', true);

    if (partError) {
      console.error('Error fetching participations:', partError);
      return [];
    }

    if (!participations || participations.length === 0) return [];

    const workshopIds = participations.map((p: any) => p.workshop_id);

    // Get workshop types for those workshops
    const { data: workshops, error: workshopsError } = await supabase
      .from('workshops')
      .select(`
        id,
        workshop_type_id,
        workshop_family_id,
        workshop_family:workshop_families!workshops_workshop_family_id_fkey(client_id),
        workshop_type:workshop_types!workshops_workshop_type_id_fkey(id, is_formation)
      `)
      .in('id', workshopIds)
      .eq('workshop_family_id', familyId);

    if (workshopsError) {
      console.error('Error fetching workshops:', workshopsError);
      return [];
    }

    // Filter for formations in the correct client/family
    const completedFormationTypeIds = (workshops || [])
      .filter((w: any) =>
        w.workshop_family?.client_id === clientId &&
        w.workshop_type?.is_formation
      )
      .map((w: any) => w.workshop_type_id);

    return [...new Set(completedFormationTypeIds)];
  } catch (error) {
    console.error('Error in getCompletedFormations:', error);
    return [];
  }
}

/**
 * Get animated workshop statistics for a user in a specific client/family
 */
export async function getAnimatedWorkshopsStats(
  userId: string,
  clientId: string,
  familyId: string
): Promise<{
  total: number;
  online: number;
  inPerson: number;
}> {
  try {
    const { data: workshops, error } = await supabase
      .from('workshops')
      .select(`
        id,
        is_remote,
        lifecycle_status,
        workshop_family:workshop_families!workshops_workshop_family_id_fkey(client_id),
        workshop_type:workshop_types!workshops_workshop_type_id_fkey(is_formation)
      `)
      .eq('organizer', userId)
      .eq('workshop_family_id', familyId)
      .eq('lifecycle_status', 'closed');

    if (error) {
      console.error('Error fetching animated workshops:', error);
      return { total: 0, online: 0, inPerson: 0 };
    }

    // Filter for correct client and non-formation workshops
    const validWorkshops = (workshops || []).filter((w: any) =>
      w.workshop_family?.client_id === clientId &&
      !w.workshop_type?.is_formation
    );

    const total = validWorkshops.length;
    const online = validWorkshops.filter((w: any) => w.is_remote).length;
    const inPerson = validWorkshops.filter((w: any) => !w.is_remote).length;

    return { total, online, inPerson };
  } catch (error) {
    console.error('Error in getAnimatedWorkshopsStats:', error);
    return { total: 0, online: 0, inPerson: 0 };
  }
}

/**
 * Get feedback statistics for a user's animated workshops
 */
export async function getFeedbackStats(
  userId: string,
  clientId: string,
  familyId: string
): Promise<{
  count: number;
  average: number;
}> {
  try {
    // Get closed workshops organized by user in this family
    const { data: workshops, error: workshopsError } = await supabase
      .from('workshops')
      .select(`
        id,
        workshop_family:workshop_families!workshops_workshop_family_id_fkey(client_id),
        workshop_type:workshop_types!workshops_workshop_type_id_fkey(is_formation)
      `)
      .eq('organizer', userId)
      .eq('workshop_family_id', familyId)
      .eq('lifecycle_status', 'closed');

    if (workshopsError || !workshops || workshops.length === 0) {
      return { count: 0, average: 0 };
    }

    // Filter for correct client and non-formation workshops
    const validWorkshops = workshops.filter((w: any) =>
      w.workshop_family?.client_id === clientId &&
      !w.workshop_type?.is_formation
    );

    if (validWorkshops.length === 0) {
      return { count: 0, average: 0 };
    }

    const workshopIds = validWorkshops.map((w: any) => w.id);

    // Get participations for these workshops
    const { data: participations, error: partError } = await supabase
      .from('participations')
      .select('id')
      .in('workshop_id', workshopIds);

    if (partError || !participations || participations.length === 0) {
      return { count: 0, average: 0 };
    }

    const participationIds = participations.map((p: any) => p.id);

    // Get questionnaire responses
    const { data: responses, error: responsesError } = await supabase
      .from('questionnaire_responses')
      .select('responses')
      .in('participation_id', participationIds);

    if (responsesError || !responses || responses.length === 0) {
      return { count: 0, average: 0 };
    }

    // Calculate count and average
    let totalRating = 0;
    let count = 0;

    responses.forEach((response: any) => {
      const responsesData = response.responses;
      if (responsesData && typeof responsesData === 'object') {
        const rating = responsesData.global_rating || responsesData.rating || 0;
        if (rating > 0) {
          totalRating += rating;
          count++;
        }
      }
    });

    const average = count > 0 ? totalRating / count : 0;

    return { count, average };
  } catch (error) {
    console.error('Error in getFeedbackStats:', error);
    return { count: 0, average: 0 };
  }
}

/**
 * Get role levels for a specific client and family
 */
export async function getRoleLevels(
  clientId: string,
  familyId: string
): Promise<RoleLevel[]> {
  try {
    const { data, error } = await supabase
      .from('role_levels')
      .select('*')
      .eq('client_id', clientId)
      .eq('workshop_family_id', familyId)
      .order('level', { ascending: true });

    if (error) {
      console.error('Error fetching role levels:', error);
      return [];
    }

    return (data || []) as RoleLevel[];
  } catch (error) {
    console.error('Error in getRoleLevels:', error);
    return [];
  }
}

/**
 * Get requirements for a specific role level
 */
export async function getRoleRequirements(roleLevelId: string): Promise<RoleRequirement | null> {
  try {
    const { data, error } = await supabase
      .from('role_requirements')
      .select('*')
      .eq('role_level_id', roleLevelId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching role requirements:', error);
      return null;
    }

    return data as RoleRequirement | null;
  } catch (error) {
    console.error('Error in getRoleRequirements:', error);
    return null;
  }
}

/**
 * Calculate progress for a single role level
 */
export async function calculateRoleLevelProgress(
  roleLevel: RoleLevel,
  stats: ProgressionStats
): Promise<RoleLevelProgress> {
  const requirements = await getRoleRequirements(roleLevel.id);

  if (!requirements) {
    return {
      roleLevel,
      requirements: null,
      status: 'locked',
      progress: {
        formations: {
          completed: [],
          required: [],
          completedCount: 0,
          requiredCount: 0,
        },
        workshopsTotal: { current: 0, required: 0 },
        workshopsOnline: { current: 0, required: 0 },
        workshopsInPerson: { current: 0, required: 0 },
        feedback: { count: 0, requiredCount: 0, average: 0, requiredAverage: 0 },
      },
    };
  }

  // Parse required workshop types
  const requiredTypes = requirements.required_workshop_types
    ? (Array.isArray(requirements.required_workshop_types)
        ? requirements.required_workshop_types as string[]
        : [])
    : [];

  const completedRequiredFormations = stats.completedFormationIds.filter((id) =>
    requiredTypes.includes(id)
  );

  // Check if all requirements are met
  const formationsComplete = completedRequiredFormations.length >= requiredTypes.length;
  const workshopsTotalComplete = stats.totalWorkshops >= requirements.min_workshops_total;
  const workshopsOnlineComplete = stats.onlineWorkshops >= requirements.min_workshops_online;
  const workshopsInPersonComplete = stats.inPersonWorkshops >= requirements.min_workshops_in_person;
  const feedbackCountComplete = stats.feedbackCount >= requirements.min_feedback_count;
  const feedbackAvgComplete = stats.averageFeedback >= requirements.min_feedback_avg;

  const allRequirementsMet =
    formationsComplete &&
    workshopsTotalComplete &&
    workshopsOnlineComplete &&
    workshopsInPersonComplete &&
    feedbackCountComplete &&
    feedbackAvgComplete;

  const anyProgressMade =
    completedRequiredFormations.length > 0 ||
    stats.totalWorkshops > 0 ||
    stats.feedbackCount > 0;

  const status = allRequirementsMet
    ? 'achieved'
    : anyProgressMade
    ? 'in_progress'
    : 'locked';

  return {
    roleLevel,
    requirements,
    status,
    progress: {
      formations: {
        completed: completedRequiredFormations,
        required: requiredTypes,
        completedCount: completedRequiredFormations.length,
        requiredCount: requiredTypes.length,
      },
      workshopsTotal: {
        current: stats.totalWorkshops,
        required: requirements.min_workshops_total,
      },
      workshopsOnline: {
        current: stats.onlineWorkshops,
        required: requirements.min_workshops_online,
      },
      workshopsInPerson: {
        current: stats.inPersonWorkshops,
        required: requirements.min_workshops_in_person,
      },
      feedback: {
        count: stats.feedbackCount,
        requiredCount: requirements.min_feedback_count,
        average: stats.averageFeedback,
        requiredAverage: requirements.min_feedback_avg,
      },
    },
  };
}

/**
 * Get full user progression for a client and family
 */
export async function getUserProgression(
  userId: string,
  clientId: string,
  familyId: string
): Promise<UserProgression | null> {
  try {
    // Get user stats
    const [completedFormationIds, workshopsStats, feedbackStats] = await Promise.all([
      getCompletedFormations(userId, clientId, familyId),
      getAnimatedWorkshopsStats(userId, clientId, familyId),
      getFeedbackStats(userId, clientId, familyId),
    ]);

    const stats: ProgressionStats = {
      completedFormationIds,
      totalWorkshops: workshopsStats.total,
      onlineWorkshops: workshopsStats.online,
      inPersonWorkshops: workshopsStats.inPerson,
      feedbackCount: feedbackStats.count,
      averageFeedback: feedbackStats.average,
    };

    // Get role levels
    const roleLevels = await getRoleLevels(clientId, familyId);

    if (roleLevels.length === 0) {
      return null;
    }

    // Calculate progress for each level
    const levels = await Promise.all(
      roleLevels.map((level) => calculateRoleLevelProgress(level, stats))
    );

    // Determine current level (highest achieved)
    let currentLevel = 0;
    for (const levelProgress of levels) {
      if (levelProgress.status === 'achieved') {
        currentLevel = levelProgress.roleLevel.level;
      }
    }

    return {
      currentLevel,
      levels,
      stats,
    };
  } catch (error) {
    console.error('Error in getUserProgression:', error);
    return null;
  }
}
