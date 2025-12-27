import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/database.types';
import type { WorkshopFamily } from '@/lib/organizer-utils';
import { fetchEligibleCoOrganizers } from '@/services/co-organizers';

interface CoOrganizerPickerProps {
  workshopFamily: WorkshopFamily;
  workshopType: string;
  classificationStatus: string;
  currentUserId: string;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function CoOrganizerPicker({
  workshopFamily,
  workshopType,
  classificationStatus,
  currentUserId,
  selectedIds,
  onChange,
}: CoOrganizerPickerProps) {
  const [open, setOpen] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEligibleUsers();
  }, [workshopFamily, workshopType, classificationStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const loadEligibleUsers = async () => {
    if (!workshopFamily || !workshopType || !classificationStatus) {
      setEligibleUsers([]);
      return;
    }

    try {
      setIsLoading(true);
      const users = await fetchEligibleCoOrganizers(
        workshopFamily,
        workshopType,
        classificationStatus,
        currentUserId
      );
      setEligibleUsers(users);
    } catch (error) {
      console.error('Error loading eligible co-organizers:', error);
      setEligibleUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUsers = useMemo(() => {
    return eligibleUsers.filter((user) => selectedIds.includes(user.id));
  }, [eligibleUsers, selectedIds]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return eligibleUsers;

    const query = searchQuery.toLowerCase();
    return eligibleUsers.filter(
      (user) =>
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [eligibleUsers, searchQuery]);

  const handleSelect = (userId: string) => {
    const isSelected = selectedIds.includes(userId);
    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
    setOpen(false);
    setSearchQuery('');
  };

  const handleRemove = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  const getInitials = (user: User) => {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  };

  if (!workshopFamily || !workshopType || !classificationStatus) {
    return (
      <div className="text-sm text-muted-foreground">
        Sélectionnez d'abord le type et la classification de l'atelier pour choisir des co-organisateurs.
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-[80px]">
      <div ref={containerRef} className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
          type="button"
          onClick={() => setOpen(!open)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Chargement...
            </>
          ) : selectedIds.length === 0 ? (
            'Sélectionner des co-organisateurs'
          ) : (
            `${selectedIds.length} co-organisateur${selectedIds.length > 1 ? 's' : ''} sélectionné${selectedIds.length > 1 ? 's' : ''}`
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full bottom-full mb-2 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Aucun résultat
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelect(user.id)}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center border-t px-3">
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="pl-3 pr-1.5 py-1.5 flex items-center gap-3 max-w-[300px]"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(user.id);
                      }}
                      aria-label={`Retirer ${user.first_name} ${user.last_name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  );
}
