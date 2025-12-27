import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@/lib/database.types';

interface OrganizerDisplayProps {
  organizer: User | null;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function OrganizerDisplay({ organizer }: OrganizerDisplayProps) {
  if (!organizer) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Organisateur</h3>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(organizer.first_name, organizer.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {organizer.first_name} {organizer.last_name}
          </p>
          <p className="text-sm text-muted-foreground">Organisateur principal</p>
        </div>
      </div>
    </div>
  );
}
