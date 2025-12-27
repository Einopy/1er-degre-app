import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  Monitor,
  Users,
  Euro,
  Edit,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/workshop-utils';
import type { OrganizerWorkshopSummary } from '@/services/organizer-workshops';
import { updateWorkshopStatus } from '@/services/organizer-workshops';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface WorkshopsListProps {
  workshops: OrganizerWorkshopSummary[];
  currentUserId: string;
  onWorkshopUpdated: () => void;
}

export function WorkshopsList({ workshops, currentUserId, onWorkshopUpdated }: WorkshopsListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedWorkshop, setSelectedWorkshop] = useState<OrganizerWorkshopSummary | null>(null);
  const [actionType, setActionType] = useState<'publish' | 'close' | 'cancel' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeWorkshops = workshops.filter(
    (w) => w.lifecycle_status === 'active' && new Date(w.start_at) > new Date()
  );
  const closedWorkshops = workshops.filter((w) => w.lifecycle_status === 'closed');
  const canceledWorkshops = workshops.filter((w) => w.lifecycle_status === 'canceled');
  const pastActiveWorkshops = workshops.filter(
    (w) => w.lifecycle_status === 'active' && new Date(w.start_at) <= new Date()
  );

  const handleStatusChange = async () => {
    if (!selectedWorkshop || !actionType) return;

    try {
      setIsProcessing(true);
      const newStatus = actionType === 'publish' ? 'active' : actionType === 'close' ? 'closed' : 'canceled';
      await updateWorkshopStatus(selectedWorkshop.id, newStatus, currentUserId);

      toast({
        title: 'Statut mis à jour',
        description: `L'atelier a été ${
          actionType === 'publish' ? 'publié' : actionType === 'close' ? 'clôturé' : 'annulé'
        } avec succès.`,
      });

      onWorkshopUpdated();
      setSelectedWorkshop(null);
      setActionType(null);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut de l\'atelier.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      active: { variant: 'default', label: 'Actif', icon: CheckCircle },
      closed: { variant: 'secondary', label: 'Clôturé', icon: XCircle },
      canceled: { variant: 'destructive', label: 'Annulé', icon: AlertCircle },
    };
    const { variant, label, icon: Icon } = variants[status] || variants.active;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const WorkshopCard = ({ workshop }: { workshop: OrganizerWorkshopSummary }) => {
    const isPast = new Date(workshop.start_at) <= new Date();

    return (
      <Card key={workshop.id}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-xl">{workshop.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(workshop.lifecycle_status)}
                <Badge variant="outline">{workshop.workshop_family_id}</Badge>
                <Badge variant="secondary">{workshop.workshop_type_id}</Badge>
                {workshop.modified_date_flag && (
                  <Badge variant="destructive">Date modifiée</Badge>
                )}
                {workshop.modified_location_flag && (
                  <Badge variant="destructive">Lieu modifié</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(workshop.start_at), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
            {workshop.is_remote ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>À distance</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Présentiel</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Participants
              </div>
              <p className="text-2xl font-bold">
                {workshop.participant_count}/{workshop.audience_number}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                Présents
              </div>
              <p className="text-2xl font-bold">{workshop.attended_count}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Euro className="h-4 w-4" />
                Revenu
              </div>
              <p className="text-2xl font-bold">{formatPrice(workshop.total_revenue)}</p>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/organizer/workshops/${workshop.id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Gérer
            </Button>

            {workshop.lifecycle_status === 'active' && !isPast && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedWorkshop(workshop);
                  setActionType('cancel');
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}

            {workshop.lifecycle_status === 'active' && isPast && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedWorkshop(workshop);
                  setActionType('close');
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Clôturer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (workshops.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Vous n'avez pas encore d'ateliers. Créez votre premier atelier pour commencer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {activeWorkshops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Ateliers à venir</h2>
          <div className="grid gap-4">
            {activeWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </div>
      )}

      {pastActiveWorkshops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Ateliers terminés (à clôturer)</h2>
          <div className="grid gap-4">
            {pastActiveWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </div>
      )}

      {closedWorkshops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Ateliers clôturés</h2>
          <div className="grid gap-4">
            {closedWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </div>
      )}

      {canceledWorkshops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Ateliers annulés</h2>
          <div className="grid gap-4">
            {canceledWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!selectedWorkshop} onOpenChange={() => setSelectedWorkshop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'close' && 'Clôturer cet atelier'}
              {actionType === 'cancel' && 'Annuler cet atelier'}
              {actionType === 'publish' && 'Publier cet atelier'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'close' &&
                'Cette action marquera l\'atelier comme terminé. Il apparaîtra dans la section "À Facturer".'}
              {actionType === 'cancel' &&
                'Cette action annulera l\'atelier. Les participants seront notifiés et pourront demander un remboursement.'}
              {actionType === 'publish' &&
                'Cette action rendra l\'atelier visible au public pour les inscriptions.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={isProcessing}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
