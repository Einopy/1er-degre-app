import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, AlertCircle, CheckCircle2, XCircle, UserCircle, Monitor, Users2 } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkshopWithDetails } from '@/services/admin-data';
import type { OrganizerWorkshopSummary } from '@/services/organizer-workshops';
import 'flag-icons/css/flag-icons.min.css';

type WorkshopCardData = WorkshopWithDetails | OrganizerWorkshopSummary;

interface MediumWorkshopCardProps {
  workshop: WorkshopCardData;
}

type StatusConfig = {
  variant: 'success' | 'warning' | 'destructive' | 'info';
  label: string;
  icon: typeof AlertCircle;
};

function getWorkshopStatusConfig(workshop: WorkshopCardData): StatusConfig {
  if (workshop.lifecycle_status === 'canceled') {
    return {
      variant: 'destructive',
      label: 'Annulé',
      icon: XCircle
    };
  }

  if (workshop.lifecycle_status === 'closed') {
    return {
      variant: 'info',
      label: 'Clôturé',
      icon: CheckCircle2
    };
  }

  const now = new Date();
  const workshopDate = parseISO(workshop.start_at);
  const isPast = workshopDate < now;
  const hoursSincePast = isPast ? differenceInHours(now, workshopDate) : 0;
  const needsClosing = isPast && hoursSincePast > 48 && workshop.lifecycle_status === 'active';

  if (needsClosing) {
    return {
      variant: 'warning',
      label: 'À clôturer',
      icon: AlertCircle
    };
  }

  return {
    variant: 'success',
    label: 'Actif',
    icon: CheckCircle2
  };
}

export const MediumWorkshopCard = memo(function MediumWorkshopCard({
  workshop,
}: MediumWorkshopCardProps) {
  const navigate = useNavigate();
  const statusConfig = getWorkshopStatusConfig(workshop);
  const workshopDate = parseISO(workshop.start_at);

  const handleClick = () => {
    navigate(`/organizer/workshops/${workshop.id}`);
  };

  const location = workshop.location as { city?: string; venue_name?: string; street?: string } | null;
  const locationDisplay = workshop.is_remote
    ? 'À distance'
    : location?.city || 'Lieu non défini';

  const isWorkshopWithDetails = 'participants_count' in workshop;
  const organizerName = workshop.organizer_user
    ? `${workshop.organizer_user.first_name} ${workshop.organizer_user.last_name}`
    : 'Non assigné';

  const truncateTitle = (title: string, maxLength: number = 78) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  const isTitleTruncated = workshop.title.length > 78;
  const displayTitle = truncateTitle(workshop.title);

  const getWorkshopTypeLabel = (type: string): string => {
    // Extract suffix from codes like "fdfp_workshop" -> "workshop"
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

  // Get workshop family code from joined data
  const workshopFamilyCode = 'workshop_family' in workshop && workshop.workshop_family
    ? workshop.workshop_family.code || workshop.workshop_family.name
    : 'Non défini';

  // Get workshop type label from joined data (use generic label, not family-specific)
  const workshopTypeLabel = 'workshop_type' in workshop && workshop.workshop_type
    ? getWorkshopTypeLabel(workshop.workshop_type.code || workshop.workshop_type_id)
    : getWorkshopTypeLabel(workshop.workshop_type_id);

  const coOrganizerNames = isWorkshopWithDetails && workshop.co_organizers_users
    ? workshop.co_organizers_users.map((user) => `${user.first_name} ${user.last_name}`)
    : [];

  const getLanguageFlagCode = (language: string): string => {
    const flagMap: Record<string, string> = {
      'fr': 'fr',
      'en': 'gb',
      'de': 'de',
      'zh': 'cn',
    };
    return flagMap[language.toLowerCase()] || 'fr';
  };

  return (
    <div
      className="border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                variant={statusConfig.variant}
                icon={statusConfig.icon}
                label={statusConfig.label}
                className="flex-shrink-0"
              />
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
              <div className="flex items-center gap-1.5 text-foreground text-sm ml-auto">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">
                  {format(workshopDate, 'dd MMM yyyy', { locale: fr })} · {format(workshopDate, 'HH:mm')}
                </span>
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold text-base leading-tight pr-4">
                    {displayTitle}
                  </h3>
                </TooltipTrigger>
                {isTitleTruncated && (
                  <TooltipContent side="top" className="max-w-md">
                    <p>{workshop.title}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <UserCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{organizerName}</span>
                </div>

                {coOrganizerNames.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-foreground cursor-help">
                          <Users2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">
                            {coOrganizerNames.length === 1
                              ? coOrganizerNames[0]
                              : coOrganizerNames.length === 2
                              ? coOrganizerNames.join(', ')
                              : `${coOrganizerNames[0]} +${coOrganizerNames.length - 1}`}
                          </span>
                        </div>
                      </TooltipTrigger>
                      {coOrganizerNames.length > 2 && (
                        <TooltipContent side="top" className="max-w-md">
                          <p>Co-organisateurs: {coOrganizerNames.join(', ')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {workshop.is_remote ? (
                    <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  <span>{locationDisplay}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0 ml-auto">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">
                  {isWorkshopWithDetails
                    ? (workshop as WorkshopWithDetails).participants_count
                    : (workshop as OrganizerWorkshopSummary).participant_count}/{workshop.audience_number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
