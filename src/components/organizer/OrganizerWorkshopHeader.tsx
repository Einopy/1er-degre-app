import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Copy,
  Edit,
  XCircle,
  CheckCircle,
  Globe,
  MapPin,
  Monitor,
  Clock,
  Users,
  Lock
} from 'lucide-react';
import type { Workshop } from '@/lib/database.types';
import { downloadICS } from '@/lib/ics-generator';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface OrganizerWorkshopHeaderProps {
  workshop: Workshop;
  participantCount: number;
  onModify: () => void;
  onCancel: () => void;
}

export function OrganizerWorkshopHeader({
  workshop,
  participantCount,
  onModify,
  onCancel,
}: OrganizerWorkshopHeaderProps) {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const remainingSeats = workshop.audience_number - participantCount;
  const startDate = new Date(workshop.start_at);
  const endDate = new Date(workshop.end_at);
  const isActive = workshop.lifecycle_status === 'active';
  const isCanceled = workshop.lifecycle_status === 'canceled';
  const isClosed = workshop.lifecycle_status === 'closed';

  const baseDurationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  );
  const extraMinutes = workshop.extra_duration_minutes || 0;
  const totalMinutes = baseDurationMinutes + extraMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const handleDownloadICS = () => {
    try {
      downloadICS(workshop);
      toast({
        title: 'Invitation téléchargée',
        description: 'Le fichier .ics a été téléchargé avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier .ics.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workshops/${workshop.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Lien copié',
      description: 'Le lien d\'inscription a été copié dans le presse-papier.',
    });
  };

  const getStatusBadge = () => {
    if (isCanceled) {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <XCircle className="h-3.5 w-3.5" />
          canceled
        </Badge>
      );
    }
    if (isClosed) {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" />
          closed
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1.5">
        <CheckCircle className="h-3.5 w-3.5" />
        active
      </Badge>
    );
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2 line-clamp-2">{workshop.title}</h1>
              <div className="flex flex-wrap gap-2">
                {getStatusBadge()}
                <Badge variant="outline" className="gap-1.5">
                  <Globe className="h-3 w-3" />
                  {workshop.language}
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  {workshop.is_remote ? (
                    <>
                      <Monitor className="h-3 w-3" />
                      Distanciel
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3" />
                      Présentiel
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3 w-3" />
                  {hours}h{minutes > 0 && `${minutes}min`}
                  {extraMinutes > 0 && (
                    <span className="text-primary ml-1">(+{extraMinutes}min)</span>
                  )}
                </Badge>
                <Badge
                  variant="outline"
                  className={`gap-1.5 ${
                    remainingSeats === 0
                      ? 'border-red-500 text-red-700'
                      : remainingSeats <= 5
                      ? 'border-orange-500 text-orange-700'
                      : ''
                  }`}
                >
                  <Users className="h-3 w-3" />
                  {participantCount}/{workshop.audience_number}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="gap-1.5">
                        <Lock className="h-3 w-3" />
                        Champs verrouillés
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">Impossible de modifier après création :</p>
                        <ul className="list-disc list-inside">
                          <li>Langue</li>
                          <li>Type (Atelier/Formation)</li>
                          <li>Format (Présentiel/Distanciel)</li>
                          <li>Public cible</li>
                          <li>Classification</li>
                          <li>Capacité</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isCanceled && (
              <Button variant="outline" size="sm" onClick={onModify}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            {isActive && !isCanceled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler l'atelier
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadICS}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger l'invitation (.ics)
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copier le lien d'inscription
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cet atelier</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera l'atelier. Tous les participants seront notifiés et
              pourront demander un remboursement complet sans frais. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
