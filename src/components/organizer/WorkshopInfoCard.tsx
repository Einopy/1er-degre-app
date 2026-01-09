import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Video,
  ExternalLink,
  Clock,
  Users,
  Edit,
  Save,
  X,
  Copy,
  Check,
  XCircle,
  CheckCircle,
  Monitor,
  Home,
  RotateCcw,
} from 'lucide-react';
import { format, addMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workshop, WorkshopLocation } from '@/lib/database.types';
import { updateWorkshopAsOrganizer } from '@/services/organizer-workshops';
import { useToast } from '@/hooks/use-toast';
import { LocationFieldsGroup } from './LocationFieldsGroup';
import { LanguageSelectorCSS } from './wizard/LanguageSelectorCSS';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import 'flag-icons/css/flag-icons.min.css';

interface WorkshopInfoCardProps {
  workshop: Workshop;
  participantCount: number;
  currentUserId: string;
  onUpdate: () => void;
  organizerName?: string;
  coOrganizerNames?: Array<{ id: string; name: string }>;
}

export function WorkshopInfoCard({
  workshop,
  participantCount,
  currentUserId,
  onUpdate,
  organizerName,
  coOrganizerNames = [],
}: WorkshopInfoCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isMainOrganizer = currentUserId === workshop.organizer;

  // Helper functions for badges
  const getWorkshopTypeLabel = (type: string): string => {
    const parts = type.split('_');
    const suffix = parts.length > 1 ? parts[parts.length - 1] : type;

    const typeMap: Record<string, string> = {
      'workshop': 'Atelier',
      'formation': 'Formation',
      'pro': 'Formation Pro',
      'formateur': 'Formation Formateur',
      'retex': 'Formation Retex',
    };
    return typeMap[suffix] || type;
  };

  const getLanguageFlagCode = (language: string): string => {
    const flagMap: Record<string, string> = {
      'fr': 'fr',
      'en': 'gb',
      'de': 'de',
      'zh': 'cn',
    };
    return flagMap[language.toLowerCase()] || 'fr';
  };

  // Get workshop family code
  const workshopFamilyCode = (workshop as any).workshop_family
    ? (workshop as any).workshop_family.code || (workshop as any).workshop_family.name
    : 'Non défini';

  // Get workshop type label
  const workshopTypeLabel = (workshop as any).workshop_type
    ? getWorkshopTypeLabel((workshop as any).workshop_type.code || workshop.workshop_type_id)
    : getWorkshopTypeLabel(workshop.workshop_type_id);

  const [editData, setEditData] = useState({
    title: workshop.title,
    description: workshop.description || '',
    language: workshop.language,
    audience_number: workshop.audience_number,
    is_remote: workshop.is_remote,
    organizer: workshop.organizer,
    co_organizers: workshop.co_organizers || [],
    start_at: workshop.start_at,
    extra_duration_minutes: workshop.extra_duration_minutes || 0,
    visio_link: workshop.visio_link || '',
    mural_link: workshop.mural_link || '',
    location: workshop.location as WorkshopLocation | null,
  });

  const location = workshop.location as WorkshopLocation | null;
  const startDate = new Date(workshop.start_at);
  const endDate = new Date(workshop.end_at);
  const extraMinutes = workshop.extra_duration_minutes || 0;

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
    const address = `${location.street}, ${location.city}, ${location.postal_code}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const handleEdit = () => {
    setEditData({
      title: workshop.title,
      description: workshop.description || '',
      language: workshop.language,
      audience_number: workshop.audience_number,
      is_remote: workshop.is_remote,
      organizer: workshop.organizer,
      co_organizers: workshop.co_organizers || [],
      start_at: workshop.start_at,
      extra_duration_minutes: workshop.extra_duration_minutes || 0,
      visio_link: workshop.visio_link || '',
      mural_link: workshop.mural_link || '',
      location: workshop.location as WorkshopLocation | null,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const hasChanges = () => {
    return (
      editData.title !== workshop.title ||
      editData.description !== (workshop.description || '') ||
      editData.language !== workshop.language ||
      editData.audience_number !== workshop.audience_number ||
      editData.is_remote !== workshop.is_remote ||
      editData.organizer !== workshop.organizer ||
      JSON.stringify(editData.co_organizers) !== JSON.stringify(workshop.co_organizers || []) ||
      editData.start_at !== workshop.start_at ||
      editData.extra_duration_minutes !== (workshop.extra_duration_minutes || 0) ||
      editData.visio_link !== (workshop.visio_link || '') ||
      editData.mural_link !== (workshop.mural_link || '') ||
      JSON.stringify(editData.location) !== JSON.stringify(workshop.location)
    );
  };

  const calculateEndTime = (startAt: string, extraMins: number) => {
    const start = parseISO(startAt);
    const baseDuration = (new Date(workshop.end_at).getTime() - new Date(workshop.start_at).getTime()) / (1000 * 60);
    const totalDuration = baseDuration + extraMins;
    const end = addMinutes(start, totalDuration);
    return end.toISOString();
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      toast({
        description: 'Aucune modification détectée',
      });
      return;
    }

    try {
      setIsSaving(true);
      const updates: Partial<Workshop> = {};

      if (editData.title !== workshop.title) updates.title = editData.title;
      if (editData.description !== (workshop.description || '')) updates.description = editData.description;
      if (editData.language !== workshop.language) updates.language = editData.language;
      if (editData.audience_number !== workshop.audience_number) updates.audience_number = editData.audience_number;
      if (editData.is_remote !== workshop.is_remote) updates.is_remote = editData.is_remote;
      if (editData.organizer !== workshop.organizer) updates.organizer = editData.organizer;
      if (JSON.stringify(editData.co_organizers) !== JSON.stringify(workshop.co_organizers || [])) {
        updates.co_organizers = editData.co_organizers;
      }
      if (editData.start_at !== workshop.start_at) {
        updates.start_at = editData.start_at;
        updates.end_at = calculateEndTime(editData.start_at, editData.extra_duration_minutes);
      }
      if (editData.extra_duration_minutes !== (workshop.extra_duration_minutes || 0)) {
        updates.extra_duration_minutes = editData.extra_duration_minutes;
        updates.end_at = calculateEndTime(editData.start_at, editData.extra_duration_minutes);
      }
      if (editData.is_remote) {
        if (editData.visio_link !== (workshop.visio_link || '')) updates.visio_link = editData.visio_link;
        if (editData.mural_link !== (workshop.mural_link || '')) updates.mural_link = editData.mural_link;
        if (updates.is_remote !== undefined) {
          updates.location = null;
        }
      } else {
        if (JSON.stringify(editData.location) !== JSON.stringify(workshop.location)) {
          updates.location = editData.location as any;
        }
        if (updates.is_remote !== undefined) {
          updates.visio_link = null;
          updates.mural_link = null;
        }
      }

      await updateWorkshopAsOrganizer(workshop.id, updates, currentUserId, isMainOrganizer);

      toast({
        title: 'Atelier modifié',
        description: 'Les modifications ont été enregistrées avec succès.',
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier l\'atelier.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIncrementDuration = () => {
    setEditData({
      ...editData,
      extra_duration_minutes: editData.extra_duration_minutes + 15,
    });
  };

  const handleResetDuration = () => {
    setEditData({
      ...editData,
      extra_duration_minutes: 0,
    });
  };

  if (isEditing) {
    const baseDuration = (new Date(workshop.end_at).getTime() - new Date(workshop.start_at).getTime()) / (1000 * 60);
    const totalDuration = baseDuration + editData.extra_duration_minutes;
    const endTime = addMinutes(parseISO(editData.start_at), totalDuration);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Edit className="h-5 w-5" />
            Modifier l'atelier
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {isMainOrganizer && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Organisateurs (modifiable uniquement par l'organisateur principal)
              </h3>

              <div className="space-y-2">
                <Label>Organisateur principal</Label>
                <Input value={workshop.organizer} disabled />
                <p className="text-xs text-muted-foreground">
                  L'organisateur ne peut pas être modifié
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-sm">Détails de l'atelier</h3>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre de l'atelier</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Titre de l'atelier"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description de l'atelier"
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Langue</Label>
              <LanguageSelectorCSS
                value={editData.language as 'fr' | 'en' | 'de' | 'zh'}
                onValueChange={(value) => setEditData({ ...editData, language: value })}
                className="scale-75 origin-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacité</Label>
              <Input
                id="edit-capacity"
                type="number"
                min={participantCount}
                value={editData.audience_number}
                onChange={(e) => setEditData({ ...editData, audience_number: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Participants actuels : {participantCount}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={editData.is_remote ? 'outline' : 'default'}
                  onClick={() => setEditData({ ...editData, is_remote: false })}
                  className="flex-1"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Présentiel
                </Button>
                <Button
                  type="button"
                  variant={editData.is_remote ? 'default' : 'outline'}
                  onClick={() => setEditData({ ...editData, is_remote: true })}
                  className="flex-1"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Distanciel
                </Button>
              </div>
            </div>
          </div>

          {!editData.is_remote && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localisation
              </h3>
              <LocationFieldsGroup
                location={editData.location}
                onChange={(location) => setEditData({ ...editData, location })}
              />
            </div>
          )}

          {editData.is_remote && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Liens
              </h3>

              <div className="space-y-2">
                <Label htmlFor="edit-visio">Lien visioconférence</Label>
                <Input
                  id="edit-visio"
                  value={editData.visio_link}
                  onChange={(e) => setEditData({ ...editData, visio_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mural">Lien Mural</Label>
                <Input
                  id="edit-mural"
                  value={editData.mural_link}
                  onChange={(e) => setEditData({ ...editData, mural_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires
            </h3>

            <div className="space-y-2">
              <Label htmlFor="edit-start">Date et heure de début</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editData.start_at.substring(0, 16)}
                onChange={(e) => setEditData({ ...editData, start_at: e.target.value + ':00.000Z' })}
              />
            </div>

            <div className="space-y-2">
              <Label>Heure de fin</Label>
              <div className="flex gap-2 items-stretch">
                <div className="flex-1 rounded-md border bg-muted/50 px-3 flex items-center justify-center h-10">
                  <span className="text-lg font-semibold">
                    {format(endTime, 'HH:mm')}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleIncrementDuration}
                  className="shrink-0 h-10"
                >
                  15 mins
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDuration}
                  disabled={editData.extra_duration_minutes === 0}
                  className="shrink-0 h-10 px-3"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
          >
            {isSaving ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const googleMapsUrl = getMapsLink();

  return (
    <Card>
      <CardHeader className="pb-4 space-y-2.5 px-6 pt-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="flex-shrink-0 px-2.5 py-1">
            {workshopFamilyCode}
          </Badge>
          <Badge variant="outline" className="flex-shrink-0 px-2.5 py-1">
            {workshopTypeLabel}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative h-5 w-5 rounded-full overflow-hidden cursor-help hover:scale-110 transition-transform flex-shrink-0 border border-border">
                  <span
                    className={`fi fi-${getLanguageFlagCode(workshop.language)} absolute`}
                    style={{
                      width: '150%',
                      height: '150%',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    aria-hidden="true"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Langue: {workshop.language}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {workshop.lifecycle_status === 'canceled' && (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Annulé
            </Badge>
          )}
          {workshop.lifecycle_status === 'closed' && (
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Clôturé
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-0 px-6 pb-6">
        <div className="space-y-1.5 text-left">
          <h3 className="font-semibold text-lg leading-tight text-left">{workshop.title}</h3>
          {workshop.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 text-left">
              {workshop.description}
            </p>
          )}
        </div>

        <div className="h-px bg-border" />

        {(organizerName || coOrganizerNames.length > 0) && (
          <>
            <div className="text-sm space-y-1 text-left">
              {organizerName && (
                <p className="text-muted-foreground text-left">
                  <span className="font-medium">Organisateur:</span> {organizerName}
                  {currentUserId === workshop.organizer && <span className="text-primary"> (moi)</span>}
                </p>
              )}
              {coOrganizerNames.length > 0 && (
                <p className="text-muted-foreground text-left">
                  <span className="font-medium">Co-organisateur{coOrganizerNames.length > 1 ? 's' : ''}:</span> {coOrganizerNames.map((coOrg, idx) => {
                    const isMe = coOrg.id === currentUserId;
                    return (
                      <span key={coOrg.id}>
                        {coOrg.name}{isMe && <span className="text-primary"> (moi)</span>}
                        {idx < coOrganizerNames.length - 1 ? ', ' : ''}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>

            <div className="h-px bg-border" />
          </>
        )}

        <div className="space-y-3 text-sm text-left">
          <div className="flex items-start gap-2.5 text-left">
            <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
            <span className="font-medium text-left">
              {format(startDate, 'EEEE d MMMM yyyy', { locale: fr })} · {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
              {extraMinutes > 0 && <span className="text-primary"> (+{extraMinutes}min)</span>}
            </span>
          </div>

          {!workshop.is_remote && location && (
            <>
              <div className="flex items-start gap-2.5 text-left">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-left">{location.venue_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-left">
                <Home className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 text-left">
                  {googleMapsUrl ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {location.street}, {location.city}, {location.postal_code}
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-left">
                      {location.street}, {location.city}, {location.postal_code}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {workshop.is_remote && (
            <>
              {workshop.visio_link && (
                <div className="flex items-center gap-2.5 text-left">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={workshop.visio_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1 text-left"
                  >
                    Visioconférence
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(workshop.visio_link!, 'visio')}
                  >
                    {copiedField === 'visio' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
              {workshop.mural_link && (
                <div className="flex items-center gap-2.5 text-left">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={workshop.mural_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate flex-1 text-left"
                  >
                    Mural
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(workshop.mural_link!, 'mural')}
                  >
                    {copiedField === 'mural' ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-2.5 text-left">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-left">
              {participantCount} / {workshop.audience_number} participants
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-6">
        <Button
          variant="outline"
          onClick={handleEdit}
          disabled={workshop.lifecycle_status === 'canceled'}
        >
          <Edit className="h-4 w-4 mr-2" />
          Modifier l'atelier
        </Button>
      </CardFooter>
    </Card>
  );
}
