import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAdminDashboard } from '@/hooks/use-admin-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { ErrorAlert } from '@/components/admin/ErrorAlert';
import { EmptyState } from '@/components/admin/EmptyState';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MediumWorkshopCard } from '@/components/admin/MediumWorkshopCard';
import { CompactItemCard } from '@/components/admin/CompactItemCard';
import { ExpandableSection } from '@/components/admin/ExpandableSection';
import { DashboardChart } from '@/components/admin/DashboardChart';
import { WorkshopFamilyBadge } from '@/components/admin/WorkshopFamilyBadge';
import {
  fetchActiveWorkshops,
  fetchRecentCompletedWorkshops,
  fetchRecentParticipants,
  fetchRecentOrganizers,
  type WorkshopWithDetails,
  type RecentParticipant,
  type RecentOrganizer,
} from '@/services/admin-data';
import { getOrganizerStatusLabel, getHighestOrganizerRole } from '@/lib/badge-utils';

type TabType = 'active' | 'completed' | 'participants' | 'organizers';

interface TabDataCache {
  activeWorkshops?: WorkshopWithDetails[];
  recentCompleted?: WorkshopWithDetails[];
  recentParticipants?: RecentParticipant[];
  recentOrganizers?: RecentOrganizer[];
}

export function AdminDashboardTab() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const { stats, loading, error } = useAdminDashboard(6);

  const [tabDataCache, setTabDataCache] = useState<TabDataCache>({});
  const [loadingTabData, setLoadingTabData] = useState(false);
  const loadingRef = useRef<Set<TabType>>(new Set());

  const loadTabData = useCallback(async (tab: TabType) => {
    if (loadingRef.current.has(tab)) {
      return;
    }

    const cacheKey = {
      active: 'activeWorkshops',
      completed: 'recentCompleted',
      participants: 'recentParticipants',
      organizers: 'recentOrganizers',
    }[tab] as keyof TabDataCache;

    if (tabDataCache[cacheKey]) {
      return;
    }

    loadingRef.current.add(tab);
    setLoadingTabData(true);

    try {
      let data: any;
      switch (tab) {
        case 'active':
          data = await fetchActiveWorkshops();
          setTabDataCache(prev => ({ ...prev, activeWorkshops: data }));
          break;
        case 'completed':
          data = await fetchRecentCompletedWorkshops(10);
          setTabDataCache(prev => ({ ...prev, recentCompleted: data }));
          break;
        case 'participants':
          data = await fetchRecentParticipants(10);
          setTabDataCache(prev => ({ ...prev, recentParticipants: data }));
          break;
        case 'organizers':
          data = await fetchRecentOrganizers(10);
          setTabDataCache(prev => ({ ...prev, recentOrganizers: data }));
          break;
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
    } finally {
      loadingRef.current.delete(tab);
      setLoadingTabData(false);
    }
  }, [tabDataCache]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = useMemo(() => [
    { id: 'active', label: 'Ateliers actifs', icon: <Calendar className="h-4 w-4" />, count: stats?.activeWorkshops },
    { id: 'completed', label: 'Ateliers effectués', icon: <CalendarCheck className="h-4 w-4" /> },
    { id: 'participants', label: 'Participants', icon: <Users className="h-4 w-4" /> },
    { id: 'organizers', label: 'Organisateurs', icon: <TrendingUp className="h-4 w-4" /> },
  ], [stats]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    switch (activeTab) {
      case 'completed':
        return stats.workshopsOverTime;
      case 'participants':
        return stats.participantsOverTime;
      case 'organizers':
        return stats.organizersOverTime;
      default:
        return [];
    }
  }, [activeTab, stats]);

  const chartConfig = useMemo(() => {
    switch (activeTab) {
      case 'completed':
        return {
          title: 'Ateliers effectués',
          dataLabel: 'ateliers',
        };
      case 'participants':
        return {
          title: 'Participants présents',
          dataLabel: 'participants',
        };
      case 'organizers':
        return {
          title: 'Nouveaux organisateurs',
          dataLabel: 'organisateurs',
        };
      default:
        return { title: '', dataLabel: '' };
    }
  }, [activeTab]);

  const activeWorkshops = tabDataCache.activeWorkshops || [];
  const recentCompleted = tabDataCache.recentCompleted || [];
  const recentParticipants = tabDataCache.recentParticipants || [];
  const recentOrganizers = tabDataCache.recentOrganizers || [];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!stats) return null;


  return (
    <div className="space-y-0">
      <div className="flex items-end gap-0 w-full relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap relative flex-1 transition-colors',
              activeTab === tab.id
                ? 'text-foreground bg-card border-l border-r border-t border-border rounded-t-lg border-b-0 z-10'
                : 'text-muted-foreground bg-transparent hover:bg-muted/50 hover:text-foreground rounded-t-lg border-b border-border z-0'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <Card className={cn(
        "border border-border relative z-10 rounded-lg shadow-none",
        activeTab === 'active' && "rounded-tl-none border-t-0",
        activeTab === 'completed' && "rounded-tl-none rounded-tr-none border-t-0",
        activeTab === 'participants' && "rounded-tl-none rounded-tr-none border-t-0",
        activeTab === 'organizers' && "rounded-tr-none border-t-0"
      )}>
        <CardContent className="p-6">
          {loadingTabData ? (
            <LoadingSpinner />
          ) : (
            <>
              {activeTab === 'active' && (
                <div>
                  {activeWorkshops.length === 0 ? (
                    <EmptyState message="Aucun atelier actif pour le moment" />
                  ) : (
                    <div className="space-y-2">
                      {activeWorkshops.map((workshop) => (
                        <MediumWorkshopCard key={workshop.id} workshop={workshop} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'completed' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {recentCompleted.length === 0 ? (
                      <EmptyState message="Aucun atelier clôturé" />
                    ) : (
                      recentCompleted.map((workshop) => (
                        <MediumWorkshopCard key={workshop.id} workshop={workshop} />
                      ))
                    )}
                  </div>

                  {chartData.length > 0 && (
                    <DashboardChart
                      data={chartData}
                      title={chartConfig.title}
                      dataLabel={chartConfig.dataLabel}
                      families={stats?.availableWorkshopFamilies}
                    />
                  )}
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="space-y-4">
                  <ExpandableSection
                    maxCollapsed={3}
                    maxExpanded={10}
                    emptyMessage="Aucun participant récent"
                  >
                    {recentParticipants.map((participant) => (
                      <CompactItemCard key={participant.id}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <WorkshopFamilyBadge family={participant.workshop_family} className="text-xs whitespace-nowrap shrink-0" />
                            <p className="text-sm font-semibold truncate">
                              {participant.user
                                ? `${participant.user.first_name} ${participant.user.last_name}`
                                : 'Utilisateur inconnu'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              {participant.workshop_title}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <Badge
                              variant={participant.status === 'paye' ? 'default' : 'secondary'}
                              className="text-xs whitespace-nowrap"
                            >
                              {participant.status === 'paye' ? 'Payé' : 'Inscrit'}
                            </Badge>

                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(parseISO(participant.created_at), 'dd MMM', { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </CompactItemCard>
                    ))}
                  </ExpandableSection>

                  <DashboardChart
                    data={chartData}
                    title={chartConfig.title}
                    dataLabel={chartConfig.dataLabel}
                  />
                </div>
              )}

              {activeTab === 'organizers' && (
                <div className="space-y-4">
                  <ExpandableSection
                    maxCollapsed={3}
                    maxExpanded={10}
                    emptyMessage="Aucun nouvel organisateur"
                  >
                    {recentOrganizers.map((organizer, index) => {
                      const highestRole = getHighestOrganizerRole(organizer.user.roles, organizer.workshop_family);
                      const roleLabel = highestRole ? getOrganizerStatusLabel(highestRole) : '';

                      return (
                        <CompactItemCard key={`${organizer.user.id}-${organizer.workshop_family}-${index}`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <WorkshopFamilyBadge family={organizer.workshop_family} className="text-xs whitespace-nowrap shrink-0" />
                              <p className="text-sm font-semibold truncate">
                                {organizer.user.first_name} {organizer.user.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex-1">
                                {organizer.user.email}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {roleLabel && (
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {roleLabel}
                                </Badge>
                              )}

                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(parseISO(organizer.became_organizer_at), 'dd MMM', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </CompactItemCard>
                      );
                    })}
                  </ExpandableSection>

                  <DashboardChart
                    data={chartData}
                    title={chartConfig.title}
                    dataLabel={chartConfig.dataLabel}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
