import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Workshop, WorkshopLocation, User, WorkshopFamily, WorkshopType } from '@/lib/database.types';
import { Calendar, MapPin, Monitor, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { canManageWorkshop } from '@/lib/organizer-utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface WorkshopCardProps {
  workshop: Workshop & {
    workshop_family?: WorkshopFamily | null;
    workshop_type?: WorkshopType | null;
  };
  currentUser?: User | null;
}

export function WorkshopCard({ workshop, currentUser }: WorkshopCardProps) {
  const navigate = useNavigate();
  const location = workshop.location as WorkshopLocation | null;
  const startDate = new Date(workshop.start_at);

  const remainingSeats = workshop.remaining_seats ?? 0;
  const isOrganizer = currentUser ? canManageWorkshop(currentUser, workshop) : false;

  const [organizerName, setOrganizerName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: organizer } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', workshop.organizer)
        .maybeSingle();

      if (organizer) {
        const org = organizer as { first_name: string; last_name: string };
        setOrganizerName(`${org.first_name} ${org.last_name}`);
      }

      const imagePath = workshop.card_illustration_url || workshop.workshop_family?.card_illustration_url;
      if (imagePath) {
        const bucket = workshop.card_illustration_url ? 'workshop-images' : 'client-logos';
        const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
        setImageUrl(data.publicUrl);
      }
    };

    fetchData();
  }, [workshop.organizer, workshop.card_illustration_url, workshop.workshop_family]);

  const displayLocation = workshop.is_remote
    ? 'À distance'
    : location?.city || 'Lieu non défini';

  return (
    <Card
      className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate(isOrganizer ? `/organizer/workshops/${workshop.id}` : `/workshops/${workshop.id}`)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={workshop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
            <span className="text-6xl opacity-40">
              🎨
            </span>
          </div>
        )}
        {remainingSeats === 0 && !isOrganizer && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="font-semibold">
              COMPLET
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex-1 p-6 space-y-3">
        <div className="space-y-2">
          <h3 className="font-bold text-xl leading-tight line-clamp-2">
            {workshop.title}
          </h3>

          {organizerName && (
            <p className="text-sm text-muted-foreground">
              {organizerName}
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-semibold">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(startDate, 'd MMMM yyyy', { locale: fr })} · {format(startDate, 'HH:mm')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            {workshop.is_remote ? (
              <Monitor className="h-4 w-4 flex-shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{displayLocation}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {workshop.audience_number - remainingSeats}/{workshop.audience_number} places
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">
              {workshop.workshop_family?.name || 'N/A'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {workshop.language.toUpperCase()}
            </Badge>
          </div>

          <Button
            size="sm"
            disabled={remainingSeats === 0 && !isOrganizer}
            onClick={(e) => {
              e.stopPropagation();
              navigate(isOrganizer ? `/organizer/workshops/${workshop.id}` : `/workshops/${workshop.id}`);
            }}
          >
            {isOrganizer ? 'Gérer' : remainingSeats === 0 ? 'Complet' : 'Réserver'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
