import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Video, ExternalLink, Clock, Users, Globe, AlertTriangle, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workshop, WorkshopLocation } from '@/lib/database.types';
import { getWorkshopTypeLabel, getClassificationLabel } from '@/lib/workshop-utils';
import { getUnconfirmedParticipants } from '@/services/workshop-changes';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface OverviewTabProps {
  workshop: Workshop;
  participantCount: number;
}

export function OverviewTab({ workshop, participantCount }: OverviewTabProps) {
  const { toast } = useToast();
  const [unconfirmedDate, setUnconfirmedDate] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [unconfirmedLocation, setUnconfirmedLocation] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const location = workshop.location as WorkshopLocation | null;
  const startDate = new Date(workshop.start_at);
  const endDate = new Date(workshop.end_at);
  const remainingSeats = workshop.audience_number - participantCount;

  useEffect(() => {
    if (workshop.modified_date_flag) {
      getUnconfirmedParticipants(workshop.id, 'date').then(setUnconfirmedDate);
    }
    if (workshop.modified_location_flag) {
      getUnconfirmedParticipants(workshop.id, 'location').then(setUnconfirmedLocation);
    }
  }, [workshop.id, workshop.modified_date_flag, workshop.modified_location_flag]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      description: 'Copié dans le presse-papier',
    });
  };

  const getMapsLink = () => {
    if (!location) return '';
    const address = `${location.street}, ${location.city}, ${location.postal_code}, ${location.country}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="space-y-6">
      {(workshop.modified_date_flag || workshop.modified_location_flag) && (
        <Alert variant="default" className="border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Modifications apportées</AlertTitle>
          <AlertDescription className="text-orange-800">
            Les participants seront informés qu'ils peuvent annuler sans frais ou échanger leur
            place suite à {workshop.modified_date_flag && workshop.modified_location_flag
              ? 'ces modifications'
              : workshop.modified_date_flag
              ? 'ce changement de date'
              : 'ce changement de lieu'}.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quand et Où</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                    {Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))}h
                    {workshop.extra_duration_minutes && workshop.extra_duration_minutes > 0 && (
                      <span className="text-primary ml-2">(+{workshop.extra_duration_minutes}min)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Capacité</p>
                  <p className="text-sm text-muted-foreground">
                    {participantCount} / {workshop.audience_number} participants
                    {remainingSeats > 0 && ` (${remainingSeats} places restantes)`}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!workshop.is_remote && location && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="space-y-1 flex-1">
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
                  <a
                    href={getMapsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MapPin className="h-4 w-4" />
                    Ouvrir dans Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {workshop.is_remote && (
                <>
                  {workshop.visio_link && (
                    <div className="flex items-start gap-3">
                      <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">Lien visioconférence</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={workshop.visio_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 flex-1 break-all"
                          >
                            {workshop.visio_link}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(workshop.visio_link!, 'visio')}
                          >
                            {copiedField === 'visio' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {workshop.mural_link && (
                    <div className="flex items-start gap-3">
                      <ExternalLink className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                      <div className="space-y-1 flex-1">
                        <p className="font-medium">Espace collaboratif (Mural)</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={workshop.mural_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 flex-1 break-all"
                          >
                            {workshop.mural_link}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(workshop.mural_link!, 'mural')}
                          >
                            {copiedField === 'mural' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Globe className="h-3 w-3" />
              {workshop.language}
            </Badge>
            <Badge variant={workshop.workshop_family_id === 'FDFP' ? 'default' : 'secondary'}>
              {workshop.workshop_family_id}
            </Badge>
            <Badge variant="outline">{getWorkshopTypeLabel(workshop.workshop_type_id)}</Badge>
            <Badge variant="outline">{getClassificationLabel(workshop.classification_status)}</Badge>
          </div>
        </CardContent>
      </Card>

      {unconfirmedDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-900">
              Confirmations en attente - Changement de date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {unconfirmedDate.length} participant{unconfirmedDate.length > 1 ? 's' : ''} n'
              {unconfirmedDate.length > 1 ? 'ont' : 'a'} pas encore confirmé la nouvelle date.
            </p>
            <div className="space-y-2">
              {unconfirmedDate.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-l-2 border-orange-500 pl-3 py-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.email}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {unconfirmedLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-900">
              Confirmations en attente - Changement de lieu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {unconfirmedLocation.length} participant{unconfirmedLocation.length > 1 ? 's' : ''} n'
              {unconfirmedLocation.length > 1 ? 'ont' : 'a'} pas encore confirmé le nouveau lieu.
            </p>
            <div className="space-y-2">
              {unconfirmedLocation.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-l-2 border-orange-500 pl-3 py-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{p.email}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {workshop.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {workshop.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
