import { supabase } from '@/lib/supabase';
import type { Workshop } from '@/lib/database.types';

export type TrainingType = 'formation' | 'formation_pro_1' | 'formation_pro_2' | 'formation_formateur' | 'formation_retex';

export interface TrainingEligibility {
  isEligible: boolean;
  reason?: string;
  prerequisites?: {
    formationCompleted?: boolean;
    formationRetexCompleted?: boolean;
    closedWorkshopsCount?: number;
    hasPresentiel?: boolean;
    hasDistanciel?: boolean;
    positiveFeedbackCount?: number;
    hasPro1?: boolean;
  };
}

export interface AnimatedWorkshopStats {
  totalClosed: number;
  closedPresentiel: number;
  closedDistanciel: number;
  positiveFeedbackCount: number;
}

export async function getUserAttendedTrainings(
  userId: string,
  familyCode: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('participations')
    .select('workshop_id, attended')
    .eq('user_id', userId)
    .eq('attended', true);

  if (error) {
    console.error('Error fetching attended trainings:', error);
    return new Set();
  }

  if (!data || data.length === 0) return new Set();

  const workshopIds = data.map((p: any) => p.workshop_id);

  const { data: workshops, error: workshopsError } = await supabase
    .from('workshops')
    .select(`
      id,
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(code),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(code, is_formation)
    `)
    .in('id', workshopIds);

  if (workshopsError) {
    console.error('Error fetching workshops:', workshopsError);
    return new Set();
  }

  const attendedTypes = new Set<string>();
  workshops?.forEach((w: any) => {
    if (w.workshop_family?.code === familyCode && w.workshop_type?.is_formation && w.workshop_type?.code) {
      const typeCode = w.workshop_type.code.replace(`${familyCode.toLowerCase()}_`, '');
      attendedTypes.add(typeCode);
    }
  });

  return attendedTypes;
}

export async function getAnimatedWorkshopStats(
  userId: string,
  familyCode: string
): Promise<AnimatedWorkshopStats> {
  const { data: workshopsRaw, error } = await supabase
    .from('workshops')
    .select(`
      id,
      is_remote,
      lifecycle_status,
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(code),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(is_formation)
    `)
    .eq('lifecycle_status', 'closed')
    .eq('organizer', userId);

  if (error) {
    console.error('Error fetching animated workshops:', error);
    return {
      totalClosed: 0,
      closedPresentiel: 0,
      closedDistanciel: 0,
      positiveFeedbackCount: 0,
    };
  }

  const workshops = workshopsRaw?.filter((w: any) =>
    w.workshop_family?.code === familyCode && !w.workshop_type?.is_formation
  );

  const totalClosed = workshops?.length || 0;
  const closedPresentiel = workshops?.filter((w: any) => !w.is_remote).length || 0;
  const closedDistanciel = workshops?.filter((w: any) => w.is_remote).length || 0;

  let positiveFeedbackCount = 0;
  if (workshops && workshops.length > 0) {
    const workshopIds = workshops.map((w: any) => w.id);

    const { data: participations, error: participationsError } = await supabase
      .from('participations')
      .select('id')
      .in('workshop_id', workshopIds);

    if (!participationsError && participations) {
      const participationIds = participations.map((p: any) => p.id);

      const { data: responses, error: responsesError } = await supabase
        .from('questionnaire_responses')
        .select('responses, participation_id')
        .in('participation_id', participationIds);

      if (!responsesError && responses) {
        responses.forEach((response: any) => {
          const responsesData = response.responses;
          if (responsesData && typeof responsesData === 'object') {
            const globalRating = responsesData.global_rating || responsesData.rating || 0;
            if (globalRating >= 3) {
              positiveFeedbackCount++;
            }
          }
        });
      }
    }
  }

  return {
    totalClosed,
    closedPresentiel,
    closedDistanciel,
    positiveFeedbackCount,
  };
}

export async function checkProEligibility(
  userId: string,
  familyCode: string
): Promise<TrainingEligibility> {
  const attendedTrainings = await getUserAttendedTrainings(userId, familyCode);

  if (!attendedTrainings.has('formation_retex')) {
    return {
      isEligible: false,
      reason: 'Vous devez d\'abord compléter la formation Retex',
      prerequisites: {
        formationRetexCompleted: false,
      },
    };
  }

  const stats = await getAnimatedWorkshopStats(userId, familyCode);

  const prerequisites = {
    formationRetexCompleted: true,
    closedWorkshopsCount: stats.totalClosed,
    hasPresentiel: stats.closedPresentiel >= 1,
    hasDistanciel: stats.closedDistanciel >= 1,
    positiveFeedbackCount: stats.positiveFeedbackCount,
  };

  if (stats.totalClosed < 3) {
    return {
      isEligible: false,
      reason: `Vous devez animer au moins 3 ateliers ${familyCode} (vous en avez animé ${stats.totalClosed})`,
      prerequisites,
    };
  }

  if (stats.closedPresentiel < 1) {
    return {
      isEligible: false,
      reason: 'Vous devez avoir animé au moins 1 atelier en présentiel',
      prerequisites,
    };
  }

  if (stats.closedDistanciel < 1) {
    return {
      isEligible: false,
      reason: 'Vous devez avoir animé au moins 1 atelier à distance',
      prerequisites,
    };
  }

  if (stats.positiveFeedbackCount < 6) {
    return {
      isEligible: false,
      reason: `Vous devez avoir au moins 6 retours positifs (vous en avez ${stats.positiveFeedbackCount})`,
      prerequisites,
    };
  }

  return {
    isEligible: true,
    prerequisites,
  };
}

export async function getEligibleTrainings(
  userId: string,
  familyCode: string
): Promise<string[]> {
  // Fetch user's role levels and build roles array
  const { data: userRoleLevels, error: userError } = await supabase
    .from('user_role_levels')
    .select(`
      role_level:role_levels(
        internal_key,
        workshop_family:workshop_families(code)
      )
    `)
    .eq('user_id', userId);

  if (userError) return [];

  const roles: string[] = [];
  if (userRoleLevels) {
    userRoleLevels.forEach((rl: any) => {
      const familyCode = rl.role_level?.workshop_family?.code;
      const internalKey = rl.role_level?.internal_key;
      if (familyCode && internalKey) {
        roles.push(`${familyCode}_${internalKey}`);
      }
    });
  }
  const attendedTrainings = await getUserAttendedTrainings(userId, familyCode);

  const eligible: string[] = [];

  if (!attendedTrainings.has('formation')) {
    eligible.push('formation');
  }

  if (attendedTrainings.has('formation') && !attendedTrainings.has('formation_retex')) {
    eligible.push('formation_retex');
  }

  if (attendedTrainings.has('formation_retex') && !attendedTrainings.has('formation_pro_1')) {
    const proEligibility = await checkProEligibility(userId, familyCode);
    if (proEligibility.isEligible) {
      eligible.push('formation_pro_1');
    }
  }

  if (attendedTrainings.has('formation_pro_1') && !attendedTrainings.has('formation_pro_2')) {
    eligible.push('formation_pro_2');
  }

  const proRole = `${familyCode}_pro`;
  if (roles.includes(proRole) && !attendedTrainings.has('formation_formateur')) {
    eligible.push('formation_formateur');
  }

  return eligible;
}

export async function fetchEligibleTrainingWorkshops(
  userId: string,
  familyCode: string
): Promise<Workshop[]> {
  const eligibleTypes = await getEligibleTrainings(userId, familyCode);

  if (eligibleTypes.length === 0) return [];

  const { data: workshopsRaw, error } = await supabase
    .from('workshops')
    .select(`
      *,
      workshop_family:workshop_families!workshops_workshop_family_id_fkey(code),
      workshop_type:workshop_types!workshops_workshop_type_id_fkey(code, is_formation)
    `)
    .eq('lifecycle_status', 'active')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  if (error) {
    console.error('Error fetching eligible training workshops:', error);
    return [];
  }

  const data = workshopsRaw?.filter((w: any) => {
    if (!w.workshop_family || w.workshop_family.code !== familyCode) return false;
    if (!w.workshop_type?.code) return false;

    const typeCode = w.workshop_type.code.replace(`${familyCode.toLowerCase()}_`, '');
    return eligibleTypes.includes(typeCode);
  });

  return data as Workshop[];
}
