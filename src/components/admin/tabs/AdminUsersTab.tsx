import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParticipants } from '@/hooks/use-admin-data';
import { updateAnimatorEmail, updateAnimatorProfile, type AnimatorProfileUpdate } from '@/services/admin-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SelectWithClear } from '@/components/ui/select-with-clear';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { ParticipantStats } from '@/services/admin-data';

interface ExpandedParticipant {
  id: string;
  isExpanded: boolean;
}

const STATUS_CONFIG = {
  inscrit: { label: 'Inscrit', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  paye: { label: 'Payé', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  rembourse: { label: 'Remboursé', variant: 'secondary' as const, color: 'bg-amber-100 text-amber-800' },
  annule: { label: 'Annulé', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
  en_attente: { label: 'En attente', variant: 'outline' as const, color: 'bg-gray-50 text-gray-600' },
  echange: { label: 'Échange', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
};

export function AdminUsersTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const { participants, loading, error, reload } = useParticipants();
  const [expandedRows, setExpandedRows] = useState<ExpandedParticipant[]>([]);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantStats | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const filteredParticipants = participants.filter((part) => {
    const query = search.toLowerCase();
    const matchesSearch =
      part.user.first_name.toLowerCase().includes(query) ||
      part.user.last_name.toLowerCase().includes(query) ||
      part.user.email.toLowerCase().includes(query);

    if (familyFilter === 'FDFP') {
      return matchesSearch && part.participations.some(p => p.workshop.workshop_family_id === 'FDFP');
    }
    if (familyFilter === 'HD') {
      return matchesSearch && part.participations.some(p => p.workshop.workshop_family_id === 'HD');
    }

    return matchesSearch;
  });

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const existing = prev.find((r) => r.id === id);
      if (existing) {
        return prev.map((r) =>
          r.id === id ? { ...r, isExpanded: !r.isExpanded } : r
        );
      }
      return [...prev, { id, isExpanded: true }];
    });
  };

  const isRowExpanded = (id: string): boolean => {
    const row = expandedRows.find((r) => r.id === id);
    return row?.isExpanded ?? false;
  };

  const handleEditClick = (part: ParticipantStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingParticipant(part);
    setEditEmail(part.user.email);
    setEditFirstName(part.user.first_name);
    setEditLastName(part.user.last_name);
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;

    try {
      setIsSaving(true);

      if (editEmail !== editingParticipant.user.email) {
        await updateAnimatorEmail(editingParticipant.user.id, editEmail);
      }

      const profileUpdates: AnimatorProfileUpdate = {
        first_name: editFirstName,
        last_name: editLastName,
        phone: null,
        birthdate: null,
        language_animation: null,
      };

      await updateAnimatorProfile(editingParticipant.user.id, profileUpdates);

      toast({
        title: 'Succès',
        description: 'Les informations du participant ont été mises à jour',
      });

      setEditingParticipant(null);
      await reload();
    } catch (err: any) {
      console.error('Error saving participant:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.message || 'Échec de la mise à jour du participant',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkshopClick = (workshopId: string) => {
    navigate(`/organizer/workshops/${workshopId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des participants</h2>
          <p className="text-muted-foreground">
            Gérer tous les participants inscrits aux ateliers
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              Erreur: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des participants</h2>
        <p className="text-muted-foreground">
          Gérer tous les participants inscrits aux ateliers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les participants</CardTitle>
          <CardDescription>
            {filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <SelectWithClear
                value={familyFilter}
                onValueChange={setFamilyFilter}
                placeholder="Famille"
                className="w-[180px]"
              >
                <option value="all">Toutes les familles</option>
                <option value="FDFP">FDFP</option>
                <option value="HD">HD</option>
              </SelectWithClear>
            </div>

            {filteredParticipants.length === 0 ? (
              <EmptyState message="Aucun participant trouvé" />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((part) => {
                      const expanded = isRowExpanded(part.user.id);

                      return (
                        <>
                          <TableRow
                            key={part.user.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleRowExpansion(part.user.id)}
                          >
                            <TableCell>
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {part.user.first_name}
                            </TableCell>
                            <TableCell className="font-medium">
                              {part.user.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {part.user.email}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => handleEditClick(part, e)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {expanded && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-accent/20">
                                <div className="p-4 space-y-4">
                                  <h4 className="text-sm font-semibold">Historique des participations</h4>

                                  {part.participations.length === 0 ? (
                                    <div className="text-center text-muted-foreground text-sm py-8">
                                      Aucune participation enregistrée
                                    </div>
                                  ) : (
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead className="w-[80px]">Famille</TableHead>
                                            <TableHead>Titre</TableHead>
                                            <TableHead className="w-[100px]">Statut</TableHead>
                                            <TableHead className="w-[80px]">Date</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {part.participations
                                            .sort((a, b) => new Date(b.workshop.start_at).getTime() - new Date(a.workshop.start_at).getTime())
                                            .map((participation) => {
                                            const statusConfig = STATUS_CONFIG[participation.status];
                                            return (
                                              <TableRow
                                                key={participation.id}
                                                className="cursor-pointer hover:bg-muted/30"
                                                onClick={() => handleWorkshopClick(participation.workshop.id)}
                                              >
                                                <TableCell className="text-center">
                                                  {participation.attended === true ? (
                                                    <Check className="h-4 w-4 text-green-600 inline-block" />
                                                  ) : participation.attended === false ? (
                                                    <X className="h-4 w-4 text-red-600 inline-block" />
                                                  ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="outline" className="text-xs">
                                                    {participation.workshop.workshop_family_id}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                  {participation.workshop.title.length > 50
                                                    ? participation.workshop.title.substring(0, 50) + '...'
                                                    : participation.workshop.title}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge className={`text-xs ${statusConfig.color} pointer-events-none`}>
                                                    {statusConfig.label}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                  {format(new Date(participation.workshop.start_at), 'dd/MM/yy', { locale: fr })}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingParticipant} onOpenChange={() => setEditingParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le participant</DialogTitle>
            <DialogDescription>
              Modifier les informations de base du participant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">Prénom</Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Nom</Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingParticipant(null)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
