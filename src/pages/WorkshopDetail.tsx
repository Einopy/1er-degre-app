import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { OrganizerDisplay } from '@/components/workshops/OrganizerDisplay';
import { TicketSelection } from '@/components/workshops/TicketSelection';
import { fetchWorkshopById, type WorkshopDetail } from '@/services/workshops';
import type { WorkshopLocation } from '@/lib/database.types';
import {
  calculateWorkshopDuration,
  formatDuration,
  formatPrice,
  getTicketTypes,
  getWorkshopTypeLabel,
  getClassificationLabel,
} from '@/lib/workshop-utils';
import {
  Calendar,
  MapPin,
  Monitor,
  Users,
  Globe,
  Clock,
  AlertCircle,
  ChevronLeft,
  Video,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { canManageWorkshop } from '@/lib/organizer-utils';

export function WorkshopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkshop = async () => {
      if (!id) {
        setError('ID de l\'atelier manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchWorkshopById(id);

        if (!data) {
          setError('Atelier introuvable');
        } else {
          if (profile && canManageWorkshop(profile, data)) {
            navigate(`/organizer/workshops/${id}`, { replace: true });
            return;
          }

          setWorkshop(data);
          const ticketTypes = getTicketTypes(data.workshop_type_id, data.classification_status);
          if (ticketTypes.length > 0) {
            setSelectedTicket(ticketTypes[0].type);
          }
        }
      } catch (err) {
        console.error('Error loading workshop:', err);
        setError('Une erreur est survenue lors du chargement de l\'atelier.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkshop();
  }, [id, profile, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto px-4 py-8 max-w-7xl w-full">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto px-4 py-8 max-w-7xl w-full">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Retour aux ateliers
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error || 'Atelier introuvable'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const location = workshop.location as WorkshopLocation | null;
  const startDate = new Date(workshop.start_at);
  const endDate = new Date(workshop.end_at);
  const duration = calculateWorkshopDuration(
    workshop.start_at,
    workshop.end_at,
    workshop.extra_duration_minutes || undefined
  );
  const remainingSeats = workshop.remaining_seats ?? 0;
  const isLowSeats = remainingSeats > 0 && remainingSeats <= 5;
  const isFull = remainingSeats === 0;
  const ticketTypes = getTicketTypes(workshop.workshop_type_id, workshop.classification_status);
  const selectedTicketInfo = ticketTypes.find((t) => t.type === selectedTicket);

  const handleRegister = () => {
    navigate(`/workshops/${id}/register`);
  };

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      <div className="mx-auto px-4 py-8 max-w-7xl w-full">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour aux ateliers
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={workshop.workshop_family_id === 'FDFP' ? 'default' : 'secondary'}>
                    {workshop.workshop_family_id}
                  </Badge>
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    {workshop.language}
                  </Badge>
                  <Badge variant="outline">{getWorkshopTypeLabel(workshop.workshop_type_id)}</Badge>
                  {workshop.is_remote ? (
                    <Badge variant="outline">
                      <Monitor className="h-3 w-3 mr-1" />
                      À distance
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      Présentiel
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{workshop.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <span>{getClassificationLabel(workshop.classification_status)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(workshop.modified_date_flag || workshop.modified_location_flag) && (
                  <Alert variant="default" className="border-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atelier modifié</AlertTitle>
                    <AlertDescription>
                      {workshop.modified_date_flag && workshop.modified_location_flag
                        ? 'La date et le lieu de cet atelier ont été modifiés.'
                        : workshop.modified_date_flag
                        ? 'La date de cet atelier a été modifiée.'
                        : 'Le lieu de cet atelier a été modifié.'}
                    </AlertDescription>
                  </Alert>
                )}

                {workshop.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Description</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {workshop.description}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          {format(startDate, 'EEEE d MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">Durée</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(duration)}
                          {duration.hasExtraTime && duration.extraMinutes && duration.extraMinutes > 0 && (
                            <span className="text-xs text-primary ml-2">
                              (+{duration.extraMinutes}min)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">Places disponibles</p>
                        <p
                          className={`text-sm ${
                            isFull
                              ? 'text-destructive'
                              : isLowSeats
                              ? 'text-orange-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {remainingSeats} / {workshop.audience_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {!workshop.is_remote && location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium">{location.venue_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.street}
                            {location.street2 && <>, {location.street2}</>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {location.postal_code} {location.city}
                          </p>
                          {location.region && (
                            <p className="text-sm text-muted-foreground">{location.region}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {workshop.is_remote && workshop.visio_link && (
                      <div className="flex items-start gap-3">
                        <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium">Lien visioconférence</p>
                          <a
                            href={workshop.visio_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Rejoindre la session
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {workshop.mural_link && (
                      <div className="flex items-start gap-3">
                        <ExternalLink className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium">Espace collaboratif</p>
                          <a
                            href={workshop.mural_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Accéder au Mural
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <OrganizerDisplay
                  organizer={workshop.organizer_user}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <TicketSelection
                    ticketTypes={ticketTypes}
                    selectedTicket={selectedTicket}
                    onTicketSelect={setSelectedTicket}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {selectedTicketInfo
                          ? selectedTicketInfo.price === 0
                            ? 'Gratuit'
                            : formatPrice(selectedTicketInfo.price)
                          : '-'}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleRegister}
                      disabled={isFull || !selectedTicket}
                    >
                      {isFull ? 'Complet' : 'S\'inscrire'}
                    </Button>

                    {isLowSeats && !isFull && (
                      <p className="text-sm text-center text-orange-600">
                        Plus que {remainingSeats} place{remainingSeats > 1 ? 's' : ''} !
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Politique d'annulation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Annulation gratuite jusqu'à 72 heures avant le début de l'atelier.
                  </p>
                  <p>
                    En cas de modification de la date ou du lieu par l'organisateur, vous pouvez
                    annuler gratuitement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">
                  {selectedTicketInfo
                    ? selectedTicketInfo.price === 0
                      ? 'Gratuit'
                      : formatPrice(selectedTicketInfo.price)
                    : '-'}
                </span>
              </div>
              <Button
                size="lg"
                onClick={handleRegister}
                disabled={isFull || !selectedTicket}
                className="flex-1"
              >
                {isFull ? 'Complet' : 'S\'inscrire'}
              </Button>
            </div>
            {isLowSeats && !isFull && (
              <p className="text-sm text-center text-orange-600 mt-2">
                Plus que {remainingSeats} place{remainingSeats > 1 ? 's' : ''} !
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
