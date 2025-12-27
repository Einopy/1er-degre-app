import { useState } from 'react';
import { useWaitlist } from '@/hooks/use-admin-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, MapPin } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function AdminWaitingListTab() {
  const [search, setSearch] = useState('');
  const { entries, loading, error } = useWaitlist();

  const filteredEntries = entries.filter((entry) => {
    const query = search.toLowerCase();
    return (
      entry.email.toLowerCase().includes(query) ||
      entry.city.toLowerCase().includes(query) ||
      (entry.user && (
        entry.user.first_name.toLowerCase().includes(query) ||
        entry.user.last_name.toLowerCase().includes(query)
      ))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des listes d'attente</h2>
        <p className="text-muted-foreground">
          Toutes les demandes en attente ({filteredEntries.length})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste d'attente</CardTitle>
          <CardDescription>
            Gérer les inscriptions en attente pour les ateliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par email ou ville..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : filteredEntries.length === 0 ? (
              <EmptyState message="Aucune entrée dans la liste d'attente" />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Famille</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Atelier notifié</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{entry.email}</div>
                            {entry.user && (
                              <div className="text-xs text-muted-foreground">
                                {entry.user.first_name} {entry.user.last_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.workshop_family}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{entry.city}</div>
                              <div className="text-xs text-muted-foreground">
                                Rayon: {entry.radius_km} km
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.status === 'waiting'
                                ? 'default'
                                : entry.status === 'notified'
                                ? 'secondary'
                                : entry.status === 'converted'
                                ? 'outline'
                                : 'destructive'
                            }
                          >
                            {entry.status === 'waiting' && 'En attente'}
                            {entry.status === 'notified' && 'Notifié'}
                            {entry.status === 'converted' && 'Converti'}
                            {entry.status === 'expired' && 'Expiré'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.workshop && entry.notified_at ? (
                            <div className="text-sm">
                              <div className="font-medium">{entry.workshop.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(entry.notified_at), 'dd MMM yyyy', { locale: fr })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Non notifié</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
