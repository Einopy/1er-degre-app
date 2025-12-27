import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarPlus, History, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchOrganizerWorkshops, type OrganizerWorkshopSummary } from '@/services/organizer-workshops';
import { WorkshopWizard } from '@/components/organizer/wizard/WorkshopWizard';
import { fetchPendingCoOrganizerAlerts, dismissCoOrganizerAlert, type CoOrganizerAlert } from '@/services/co-organizers';
import { MediumWorkshopCard } from '@/components/admin/MediumWorkshopCard';

export function Home() {
  const { profile, permissions, permissionsLoading } = useAuth();
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<OrganizerWorkshopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [showDeclareWizard, setShowDeclareWizard] = useState(false);
  const [coOrganizerAlerts, setCoOrganizerAlerts] = useState<CoOrganizerAlert[]>([]);

  const isOrganizer = permissions?.canManageWorkshops || permissions?.isAdmin || permissions?.isSuperAdmin || false;

  useEffect(() => {
    if (profile?.id && !permissionsLoading) {
      if (isOrganizer) {
        loadWorkshops();
        loadCoOrganizerAlerts();
      } else {
        setIsLoading(false);
      }
    }
  }, [profile?.id, isOrganizer, permissionsLoading]);

  const loadWorkshops = async () => {
    if (!profile?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOrganizerWorkshops(profile.id);
      setWorkshops(data);
    } catch (err: any) {
      setError('Erreur lors du chargement de vos ateliers');
      console.error('Error loading workshops:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCoOrganizerAlerts = async () => {
    if (!profile?.id) return;

    try {
      const alerts = await fetchPendingCoOrganizerAlerts(profile.id);
      setCoOrganizerAlerts(alerts);
    } catch (err: any) {
      console.error('Error loading co-organizer alerts:', err);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissCoOrganizerAlert(alertId);
      setCoOrganizerAlerts(alerts => alerts.filter(a => a.id !== alertId));
    } catch (err: any) {
      console.error('Error dismissing alert:', err);
    }
  };


  const now = new Date();

  // Combine upcoming and to-close workshops into one list
  const activeWorkshops = workshops.filter(
    (w) => w.lifecycle_status === 'active'
  );

  // Sort by end date - workshops that need closing first, then upcoming
  const sortedActiveWorkshops = activeWorkshops.sort((a, b) => {
    const aEnd = new Date(a.end_at);
    const bEnd = new Date(b.end_at);

    // If both are past (need closing), sort by most recent first
    if (aEnd < now && bEnd < now) {
      return bEnd.getTime() - aEnd.getTime();
    }

    // If only a is past, it comes first
    if (aEnd < now) return -1;
    if (bEnd < now) return 1;

    // Both are upcoming, sort by start date (earliest first)
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });

  const activeCount = sortedActiveWorkshops.length;
  const toCloseCount = sortedActiveWorkshops.filter(w => new Date(w.end_at) < now).length;


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour {profile?.first_name} !
        </h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue sur votre espace 1er degré
        </p>
      </div>

      {coOrganizerAlerts.length > 0 && (
        <div className="space-y-3">
          {coOrganizerAlerts.map((alert) => (
            <Alert key={alert.id} className="bg-blue-50 border-blue-200">
              <AlertDescription className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span>
                    Vous avez été ajouté co-organisateur de{' '}
                    <button
                      onClick={() => navigate(`/organizer/workshops/${alert.workshop_id}`)}
                      className="font-semibold underline hover:text-primary"
                    >
                      {alert.workshop.title}
                    </button>{' '}
                    le {format(new Date(alert.created_at), 'd MMM yyyy', { locale: fr })} — ouvrir l'atelier.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismissAlert(alert.id)}
                  className="shrink-0"
                  aria-label="Fermer l'alerte"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>
              Créez et gérez vos ateliers
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button onClick={() => setShowPlanWizard(true)} size="lg">
              <CalendarPlus className="h-5 w-5 mr-2" />
              Planifier un atelier
            </Button>
            <Button onClick={() => setShowDeclareWizard(true)} variant="outline" size="lg">
              <History className="h-5 w-5 mr-2" />
              Déclarer un atelier passé
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoading || permissionsLoading) ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isOrganizer ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Mes ateliers</CardTitle>
                  {toCloseCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {toCloseCount} atelier{toCloseCount > 1 ? 's' : ''} à clôturer
                    </p>
                  )}
                </div>
                {activeCount > 0 && (
                  <Badge variant="secondary">{activeCount}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeCount === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>{profile?.first_name}, vous n'avez pas d'atelier actif.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedActiveWorkshops.map((workshop) => (
                    <MediumWorkshopCard key={workshop.id} workshop={workshop} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Découvrez nos ateliers et inscrivez-vous pour commencer votre parcours.
            </p>
            <Button asChild className="mt-4">
              <a href="/">Explorer les ateliers</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {isOrganizer && (
        <>
          <WorkshopWizard
            open={showPlanWizard}
            onOpenChange={(open) => {
              setShowPlanWizard(open);
              if (!open) loadWorkshops();
            }}
            isPastWorkshop={false}
          />
          <WorkshopWizard
            open={showDeclareWizard}
            onOpenChange={(open) => {
              setShowDeclareWizard(open);
              if (!open) loadWorkshops();
            }}
            isPastWorkshop={true}
          />
        </>
      )}
    </div>
  );
}
