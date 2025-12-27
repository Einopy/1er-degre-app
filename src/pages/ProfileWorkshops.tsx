import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { fetchOrganizerWorkshops, type OrganizerWorkshopSummary } from '@/services/organizer-workshops';
import { MediumWorkshopCard } from '@/components/admin/MediumWorkshopCard';

type FilterStatus = 'all' | 'closed' | 'canceled';

export function ProfileWorkshops() {
  const { profile, permissions, permissionsLoading } = useAuth();
  const [workshops, setWorkshops] = useState<OrganizerWorkshopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const isOrganizer = permissions?.canManageWorkshops || permissions?.isAdmin || permissions?.isSuperAdmin || false;

  useEffect(() => {
    if (profile?.id && !permissionsLoading) {
      if (isOrganizer) {
        loadWorkshops();
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

      const historicalWorkshops = data.filter(
        (w) => w.lifecycle_status === 'closed' || w.lifecycle_status === 'canceled'
      );

      setWorkshops(historicalWorkshops);
    } catch (err: any) {
      setError('Erreur lors du chargement de vos ateliers');
      console.error('Error loading workshops:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkshops = workshops.filter((workshop) => {
    if (filterStatus === 'all') return true;
    return workshop.lifecycle_status === filterStatus;
  });

  if (!isOrganizer) {
    return (
      <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette section.
            </p>
          </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes ateliers animés</h1>
        <p className="text-muted-foreground mt-2">
          Historique de tous vos ateliers clôturés et annulés
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
          className="min-w-[80px]"
        >
          Tous
        </Button>
        <Button
          variant={filterStatus === 'closed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('closed')}
          className="min-w-[95px]"
        >
          Clôturés
        </Button>
        <Button
          variant={filterStatus === 'canceled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('canceled')}
          className="min-w-[95px]"
        >
          Annulés
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredWorkshops.length === 0 ? (
        <Card className="min-h-[300px] flex items-center justify-center">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filterStatus === 'all' && 'Vous n\'avez pas encore d\'ateliers clôturés ou annulés.'}
              {filterStatus === 'closed' && 'Vous n\'avez pas d\'ateliers clôturés.'}
              {filterStatus === 'canceled' && 'Vous n\'avez pas d\'ateliers annulés.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredWorkshops.map((workshop) => (
            <MediumWorkshopCard
              key={workshop.id}
              workshop={workshop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
