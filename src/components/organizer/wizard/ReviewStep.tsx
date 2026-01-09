import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  MapPin,
  Monitor,
  Users,
  Clock,
  Edit,
  CheckCircle,
  Mail,
  Info,
} from 'lucide-react';
import type { WorkshopWizardData, WizardStep } from '@/lib/workshop-wizard-types';
import type { User, WorkshopFamily, WorkshopType } from '@/lib/database.types';
import {
  getWorkshopPrice,
  formatPrice,
} from '@/lib/workshop-utils';
import { fetchEligibleCoOrganizers } from '@/services/co-organizers';

interface ReviewStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  currentUser: User;
  families?: WorkshopFamily[];
  workshopTypes?: WorkshopType[];
  onEditStep: (step: WizardStep) => void;
  isPastWorkshop?: boolean;
}

export function ReviewStep({
  form,
  currentUser,
  families,
  workshopTypes,
  onEditStep,
  isPastWorkshop = false,
}: ReviewStepProps) {
  const { watch, setValue } = form;
  const data = watch();
  const [coOrganizerUsers, setCoOrganizerUsers] = useState<User[]>([]);

  const selectedFamily = (families || []).find(f => f.id === data.workshop_family_id);
  const selectedType = (workshopTypes || []).find(t => t.id === data.workshop_type_id);

  const baseDuration = selectedType?.default_duration_minutes || 180;
  const totalDuration = baseDuration + (data.extra_duration_minutes || 0);
  
  // Construire la date/heure de début avec start_time
  const getStartDateTime = () => {
    if (!data.start_at || !data.start_time) return data.start_at;
    const [hours, minutes] = data.start_time.split(':').map(Number);
    const dateTime = new Date(data.start_at);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  };
  
  const startDateTime = getStartDateTime();
  const endTime = startDateTime
    ? new Date(startDateTime.getTime() + totalDuration * 60000)
    : null;

  const isFormationType = selectedType?.is_formation || false;

  const priceInfo = !isFormationType && data.classification_status
    ? getWorkshopPrice('workshop', data.classification_status)
    : null;

  useEffect(() => {
    const loadCoOrganizers = async () => {
      if (!data.coOrganizers || data.coOrganizers.length === 0) {
        setCoOrganizerUsers([]);
        return;
      }

      if (!data.workshop_family_id || !data.workshop_type_id || !data.classification_status) {
        return;
      }

      try {
        const familyCode = selectedFamily?.code || '';
        const typeCode = selectedType?.code || '';

        const eligibleUsers = await fetchEligibleCoOrganizers(
          familyCode as any,
          typeCode as any,
          data.classification_status,
          currentUser.id
        );

        const selectedUsers = eligibleUsers.filter((user) =>
          data.coOrganizers?.includes(user.id)
        );
        setCoOrganizerUsers(selectedUsers);
      } catch (error) {
        console.error('Error loading co-organizers:', error);
      }
    };

    loadCoOrganizers();
  }, [data.coOrganizers, data.workshop_family_id, data.workshop_type_id, data.classification_status, currentUser.id, selectedFamily, selectedType]);

  const getInitials = (user: User) => {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Vérifiez attentivement les informations ci-dessous avant de créer l'atelier.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Informations essentielles</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditStep('family-type-language')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div>
              <p className="text-sm text-muted-foreground">Famille d'atelier</p>
              <p className="font-medium">{selectedFamily?.code || 'Non spécifiée'}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{selectedType?.label || 'Non spécifié'}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Titre</p>
              <p className="font-medium">{data.title}</p>
            </div>
            {data.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm line-clamp-3">{data.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Horaires et capacité</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditStep('schedule')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {startDateTime ? format(startDateTime, 'EEEE d MMMM yyyy', { locale: fr }) : 'Non définie'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Horaires</p>
                <p className="font-medium">
                  {data.start_time || '--:--'} -{' '}
                  {endTime ? format(endTime, 'HH:mm', { locale: fr }) : '...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Durée : {Math.floor(totalDuration / 60)}h{totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Capacité</p>
                <p className="font-medium">{data.audience_number} participants</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lieu</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditStep('location')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            {data.is_remote ? (
              <>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Atelier à distance</p>
                  </div>
                </div>
                {data.visio_link && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Lien visio</p>
                      <p className="text-sm truncate">{data.visio_link}</p>
                    </div>
                  </>
                )}
                {data.mural_link && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Lien Mural</p>
                      <p className="text-sm truncate">{data.mural_link}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Atelier présentiel</p>
                  </div>
                </div>
                {data.location && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{data.location.venue_name}</p>
                      <p className="text-sm">{data.location.street}</p>
                      {data.location.street2 && (
                        <p className="text-sm">{data.location.street2}</p>
                      )}
                      <p className="text-sm">
                        {data.location.postal_code} {data.location.city}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Organisateur et co-organisateurs</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditStep('classification-coorg')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div>
              <p className="text-sm text-muted-foreground">Organisateur principal</p>
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(currentUser)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {currentUser.first_name} {currentUser.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
            </div>
            {coOrganizerUsers.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Co-organisateurs</p>
                  <div className="space-y-2">
                    {coOrganizerUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!isFormationType && priceInfo && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tarification</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>{priceInfo.label}</span>
                    <span className="font-medium">{formatPrice(priceInfo.price)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {isPastWorkshop && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Options de suivi</h3>
            <div className="rounded-lg border p-4 space-y-4 bg-card">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label htmlFor="post-emails" className="font-medium">
                      Séquence post-atelier
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Envoyer les emails de suivi J+7, J+14 et J+21
                  </p>
                </div>
                <Switch
                  id="post-emails"
                  checked={data.enablePostWorkshopEmails !== false}
                  onCheckedChange={(checked) =>
                    setValue('enablePostWorkshopEmails', checked)
                  }
                />
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  La séquence post-atelier permet de maintenir le lien avec les participants
                  et de recueillir leurs retours.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {isPastWorkshop ? (
              <>
                En déclarant cet atelier, il sera marqué comme clôturé.
                {data.enablePostWorkshopEmails !== false &&
                  ' Les emails de suivi seront programmés aux dates appropriées.'}
              </>
            ) : (
              <>
                En planifiant cet atelier, il sera publié et visible pour les inscriptions.
                Les participants recevront une notification 72h avant le début,
                et un fichier ICS sera généré pour l'ajout au calendrier.
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
