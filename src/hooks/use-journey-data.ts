import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WorkshopFamily, RoleLevel, RoleRequirement } from '@/lib/database.types';
import { getUserRoleLevels } from '@/services/user-roles';
import {
  getCompletedFormations,
  getAnimatedWorkshopsStats,
  getFeedbackStats,
  type ProgressionStats,
} from '@/services/user-progression';
import { fetchEligibleTrainingWorkshops } from '@/services/training-progression';
import type { Workshop } from '@/lib/database.types';

export type QuestStatus = 'obtained' | 'next' | 'locked';

export interface QuestProgress {
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
}

export interface QuestCardData {
  roleLevel: RoleLevel & { requirements?: RoleRequirement };
  status: QuestStatus;
  obtainedAt?: string;
  grantedBy?: string | null;
  requirements?: RoleRequirement;
  progress?: QuestProgress;
  availableWorkshops?: Workshop[];
}

export interface UseJourneyDataReturn {
  family: WorkshopFamily | null;
  questCards: QuestCardData[];
  stats: ProgressionStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useJourneyData(
  userId: string | undefined,
  clientId: string | undefined,
  familyCode: string | undefined
): UseJourneyDataReturn {
  const [family, setFamily] = useState<WorkshopFamily | null>(null);
  const [questCards, setQuestCards] = useState<QuestCardData[]>([]);
  const [stats, setStats] = useState<ProgressionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId || !clientId || !familyCode) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Récupérer la famille par code
      const { data: familyData, error: familyError } = await supabase
        .from('workshop_families')
        .select('*')
        .eq('client_id', clientId)
        .eq('code', familyCode)
        .maybeSingle();

      if (familyError) throw familyError;
      if (!familyData) {
        setError('Famille introuvable');
        setLoading(false);
        return;
      }

      const workshopFamily = familyData as WorkshopFamily;
      setFamily(workshopFamily);

      // 2. Récupérer tous les role_levels de la famille avec requirements
      const { data: roleLevelsData, error: roleLevelsError } = await (supabase as any)
        .from('role_levels')
        .select(`
          *,
          requirements:role_requirements(*)
        `)
        .eq('client_id', clientId)
        .eq('workshop_family_id', workshopFamily.id)
        .order('level', { ascending: true });

      if (roleLevelsError) throw roleLevelsError;

      const roleLevels: (RoleLevel & { requirements?: RoleRequirement })[] = (roleLevelsData || []).map((rl: any) => ({
        ...rl,
        requirements: Array.isArray(rl.requirements) ? rl.requirements[0] : rl.requirements,
      }));

      // 3. Récupérer les user_role_levels (source de vérité pour les rôles obtenus)
      const userRoleLevels = await getUserRoleLevels(userId, clientId, workshopFamily.id);
      const obtainedLevelIds = new Set(userRoleLevels.map(url => url.role_level_id));
      
      // Map pour accès rapide aux infos d'obtention
      const obtainedInfoMap = new Map(
        userRoleLevels.map(url => [url.role_level_id, url])
      );

      // 4. Récupérer les stats de progression
      const [completedFormationIds, workshopsStats, feedbackStats] = await Promise.all([
        getCompletedFormations(userId, clientId, workshopFamily.id),
        getAnimatedWorkshopsStats(userId, clientId, workshopFamily.id),
        getFeedbackStats(userId, clientId, workshopFamily.id),
      ]);

      const progressionStats: ProgressionStats = {
        completedFormationIds,
        totalWorkshops: workshopsStats.total,
        onlineWorkshops: workshopsStats.online,
        inPersonWorkshops: workshopsStats.inPerson,
        feedbackCount: feedbackStats.count,
        averageFeedback: feedbackStats.average,
      };
      setStats(progressionStats);

      // 5. Récupérer les formations disponibles pour la prochaine étape
      let availableWorkshops: Workshop[] = [];
      try {
        availableWorkshops = await fetchEligibleTrainingWorkshops(userId, familyCode);
      } catch (e) {
        console.warn('Could not fetch eligible workshops:', e);
      }

      // 6. Déterminer le statut de chaque niveau
      let foundNext = false;
      const cards: QuestCardData[] = roleLevels.map((roleLevel, index) => {
        const isObtained = obtainedLevelIds.has(roleLevel.id);

        if (isObtained) {
          const obtainedInfo = obtainedInfoMap.get(roleLevel.id);
          return {
            roleLevel,
            status: 'obtained' as QuestStatus,
            obtainedAt: (obtainedInfo as any)?.granted_at || (obtainedInfo as any)?.created_at,
            grantedBy: (obtainedInfo as any)?.granted_by,
          };
        }

        // Premier niveau non obtenu = "next"
        // Mais seulement si tous les niveaux précédents sont obtenus
        const previousLevelsObtained = roleLevels
          .slice(0, index)
          .every(rl => obtainedLevelIds.has(rl.id));

        if (previousLevelsObtained && !foundNext) {
          foundNext = true;

          // Calculer la progression pour ce niveau
          const requirements = roleLevel.requirements;
          const requiredTypes = requirements?.required_workshop_types
            ? (Array.isArray(requirements.required_workshop_types)
                ? requirements.required_workshop_types as string[]
                : [])
            : [];

          const completedRequired = completedFormationIds.filter(id => requiredTypes.includes(id));

          const progress: QuestProgress = {
            formations: {
              completed: completedRequired,
              required: requiredTypes,
              completedCount: completedRequired.length,
              requiredCount: requiredTypes.length,
            },
            workshopsTotal: {
              current: progressionStats.totalWorkshops,
              required: requirements?.min_workshops_total || 0,
            },
            workshopsOnline: {
              current: progressionStats.onlineWorkshops,
              required: requirements?.min_workshops_online || 0,
            },
            workshopsInPerson: {
              current: progressionStats.inPersonWorkshops,
              required: requirements?.min_workshops_in_person || 0,
            },
            feedback: {
              count: progressionStats.feedbackCount,
              requiredCount: requirements?.min_feedback_count || 0,
              average: progressionStats.averageFeedback,
              requiredAverage: requirements?.min_feedback_avg || 0,
            },
          };

          return {
            roleLevel,
            status: 'next' as QuestStatus,
            requirements,
            progress,
            availableWorkshops,
          };
        }

        return {
          roleLevel,
          status: 'locked' as QuestStatus,
        };
      });

      setQuestCards(cards);
    } catch (err: any) {
      console.error('Error loading journey data:', err);
      setError('Erreur lors du chargement de votre parcours');
    } finally {
      setLoading(false);
    }
  }, [userId, clientId, familyCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    family,
    questCards,
    stats,
    loading,
    error,
    refetch: loadData,
  };
}
