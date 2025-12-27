import { useState, useMemo } from 'react';
import { useOrganizers } from '@/hooks/use-admin-data';
import { useWorkshopFamilies, useRoleLevels } from '@/hooks/use-client-config';
import { useActiveClient } from '@/hooks/use-active-client';
import { updateAnimatorEmail, updateAnimatorRoles, updateAnimatorProfile, type AnimatorProfileUpdate } from '@/services/admin-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import type { OrganizerStats } from '@/services/admin-data';

interface ExpandedAnimator {
  id: string;
  isExpanded: boolean;
}

const CERTIFICATION_CONFIG = {
  public: { label: 'Animateur', emoji: '🎯', color: 'green' },
  pro: { label: 'Animateur Pro', emoji: '⭐', color: 'blue' },
  trainer: { label: 'Formateur', emoji: '🏆', color: 'amber' },
  instructor: { label: 'Instructeur', emoji: '🎖️', color: 'gray' },
};

const STATUS_CONFIG = {
  inscrit: { label: 'Inscrit', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  paye: { label: 'Payé', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  rembourse: { label: 'Remboursé', variant: 'secondary' as const, color: 'bg-amber-100 text-amber-800' },
  annule: { label: 'Annulé', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
  en_attente: { label: 'En attente', variant: 'outline' as const, color: 'bg-gray-50 text-gray-600' },
  echange: { label: 'Échange', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
};

export function AdminOrganizersTab() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { organizers, loading, error, reload } = useOrganizers();
  const { activeClientId } = useActiveClient();
  const { families: workshopFamilies } = useWorkshopFamilies(activeClientId || undefined);
  const { roleLevels } = useRoleLevels(activeClientId || undefined);

  console.log('[AdminOrganizersTab] activeClientId:', activeClientId);
  console.log('[AdminOrganizersTab] workshopFamilies:', workshopFamilies);
  console.log('[AdminOrganizersTab] roleLevels:', roleLevels);
  console.log('[AdminOrganizersTab] organizers:', organizers);
  const [expandedRows, setExpandedRows] = useState<ExpandedAnimator[]>([]);
  const [editingAnimator, setEditingAnimator] = useState<OrganizerStats | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editLanguageAnimation, setEditLanguageAnimation] = useState('');
  const [editSignedContract, setEditSignedContract] = useState(false);
  const [editSignedContractYear, setEditSignedContractYear] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const uniqueRoleKeys = useMemo(() => {
    const keys = new Set<string>();
    roleLevels.forEach(rl => {
      if (rl.internal_key) keys.add(rl.internal_key);
    });
    return Array.from(keys).sort((a, b) => {
      const order: Record<string, number> = { 'public': 1, 'pro': 2, 'trainer': 3, 'instructor': 4 };
      return (order[a] || 999) - (order[b] || 999);
    });
  }, [roleLevels]);

  const filteredOrganizers = organizers.filter((org) => {
    const query = search.toLowerCase();
    const matchesSearch =
      org.user.first_name.toLowerCase().includes(query) ||
      org.user.last_name.toLowerCase().includes(query) ||
      org.user.email.toLowerCase().includes(query);

    // When both family and role are selected, check for the specific combination
    if (familyFilter !== 'all' && roleFilter !== 'all') {
      const specificRole = `${familyFilter}_${roleFilter}`;
      return matchesSearch && org.animatorRoles.includes(specificRole);
    }

    // When only family is selected
    if (familyFilter !== 'all') {
      const matchesFamily = org.animatorRoles.some(r => r.startsWith(`${familyFilter}_`));
      return matchesSearch && matchesFamily;
    }

    // When only role is selected
    if (roleFilter !== 'all') {
      const matchesRole = org.animatorRoles.some(r => r.endsWith(`_${roleFilter}`));
      return matchesSearch && matchesRole;
    }

    // When neither filter is selected (all)
    return matchesSearch;
  });

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const existing = prev.find((r) => r.id === id);
      if (existing) {
        return prev.map((r) => (r.id === id ? { ...r, isExpanded: !r.isExpanded } : r));
      }
      return [...prev, { id, isExpanded: true }];
    });
  };

  const isRowExpanded = (id: string) => {
    return expandedRows.find((r) => r.id === id)?.isExpanded || false;
  };

  const handleWorkshopClick = (workshopId: string) => {
    navigate(`/organizer/workshops/${workshopId}`);
  };

  const handleEditClick = (org: OrganizerStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnimator(org);
    setEditEmail(org.user.email);
    setEditFirstName(org.user.first_name);
    setEditLastName(org.user.last_name);
    setEditPhone(org.user.phone || '');
    setEditBirthdate(org.user.birthdate || '');
    setEditLanguageAnimation(org.user.language_animation || '');
    setEditSignedContract(org.user.signed_contract);
    setEditSignedContractYear(org.user.signed_contract_year?.toString() || '');
    setEditRoles(org.animatorRoles);
  };

  const handleRoleToggle = (role: string) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveChanges = async () => {
    if (!editingAnimator) return;

    setIsSaving(true);
    try {
      if (editEmail !== editingAnimator.user.email) {
        await updateAnimatorEmail(editingAnimator.user.id, editEmail);
      }

      if (JSON.stringify(editRoles.sort()) !== JSON.stringify(editingAnimator.animatorRoles.sort())) {
        await updateAnimatorRoles(editingAnimator.user.id, editRoles);
      }

      const profileUpdates: AnimatorProfileUpdate = {};
      if (editFirstName !== editingAnimator.user.first_name) profileUpdates.first_name = editFirstName;
      if (editLastName !== editingAnimator.user.last_name) profileUpdates.last_name = editLastName;
      if (editPhone !== (editingAnimator.user.phone || '')) profileUpdates.phone = editPhone || null;
      if (editBirthdate !== (editingAnimator.user.birthdate || '')) profileUpdates.birthdate = editBirthdate || null;
      if (editLanguageAnimation !== (editingAnimator.user.language_animation || '')) profileUpdates.language_animation = editLanguageAnimation || null;
      if (editSignedContract !== editingAnimator.user.signed_contract) profileUpdates.signed_contract = editSignedContract;
      if (editSignedContractYear !== (editingAnimator.user.signed_contract_year?.toString() || '')) {
        profileUpdates.signed_contract_year = editSignedContractYear ? parseInt(editSignedContractYear) : null;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await updateAnimatorProfile(editingAnimator.user.id, profileUpdates);
      }

      toast({
        title: 'Modifications enregistrées',
        description: 'Les informations de l\'animateur ont été mises à jour.',
      });

      setEditingAnimator(null);
      reload();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les modifications.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCertificationCards = (roleKeys: string[], familyCode: string) => {
    if (roleKeys.length === 0) {
      return null;
    }

    const levelOrder: Record<string, number> = {
      'public': 1,
      'pro': 2,
      'trainer': 3,
      'instructor': 4,
    };

    const sortedRoleKeys = [...roleKeys].sort((a, b) => {
      return (levelOrder[a] || 999) - (levelOrder[b] || 999);
    });

    return (
      <div className="grid grid-cols-2 gap-2">
        {sortedRoleKeys.map((roleKey) => {
          const config = CERTIFICATION_CONFIG[roleKey as keyof typeof CERTIFICATION_CONFIG];
          const roleLevel = roleLevels.find(rl =>
            rl.internal_key === roleKey &&
            rl.workshop_family?.code === familyCode
          );

          if (!config) return null;

          const colorClasses = {
            green: 'bg-green-50 border-green-200 text-green-900',
            blue: 'bg-blue-50 border-blue-200 text-blue-900',
            amber: 'bg-amber-50 border-amber-200 text-amber-900',
            gray: 'bg-gray-50 border-gray-200 text-gray-700',
          };

          return (
            <div
              key={`${familyCode}-${roleKey}`}
              className={`relative px-4 py-2.5 rounded-lg border transition-all w-full ${colorClasses[config.color as keyof typeof colorClasses]}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.emoji}</span>
                <span className="text-sm font-semibold leading-tight">
                  {roleLevel?.label || config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des animateurs</h2>
        <p className="text-muted-foreground">
          Utilisateurs avec permissions d'animation ({filteredOrganizers.length})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des animateurs</CardTitle>
          <CardDescription>
            Voir et gérer les permissions d'animation FDFP et HD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <SelectWithClear
                value={familyFilter}
                onValueChange={setFamilyFilter}
                defaultLabel="Famille"
                className="w-[106px] flex-shrink-0"
              >
                <SelectItem value="all">Famille</SelectItem>
                {workshopFamilies.map(family => (
                  <SelectItem key={family.code} value={family.code}>
                    {family.code}
                  </SelectItem>
                ))}
              </SelectWithClear>
              <SelectWithClear
                value={roleFilter}
                onValueChange={setRoleFilter}
                defaultLabel="Rôle"
                className="w-[150px] flex-shrink-0"
              >
                <SelectItem value="all">Rôle</SelectItem>
                {uniqueRoleKeys.map(roleKey => {
                  const roleLevel = roleLevels.find(rl => rl.internal_key === roleKey);
                  return (
                    <SelectItem key={roleKey} value={roleKey}>
                      {roleLevel?.label || roleKey}
                    </SelectItem>
                  );
                })}
              </SelectWithClear>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-red-600 font-semibold">Erreur de chargement</div>
                <div className="text-sm text-muted-foreground">{error}</div>
                <Button onClick={reload} variant="outline" size="sm">
                  Réessayer
                </Button>
              </div>
            ) : organizers.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <EmptyState message="Aucun animateur trouvé" />
                <div className="text-sm text-muted-foreground">
                  Aucun utilisateur avec des permissions d'animation n'a été trouvé.
                </div>
                <div className="text-xs text-muted-foreground">
                  Astuce : Vérifiez la console du navigateur pour plus de détails sur la requête.
                </div>
                <Button onClick={reload} variant="outline" size="sm">
                  Recharger
                </Button>
              </div>
            ) : filteredOrganizers.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <EmptyState message="Aucun animateur ne correspond aux filtres" />
                <div className="text-sm text-muted-foreground">
                  {organizers.length} animateur(s) total, mais aucun ne correspond aux critères de recherche.
                </div>
                <Button
                  onClick={() => {
                    setSearch('');
                    setFamilyFilter('all');
                    setRoleFilter('all');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="whitespace-nowrap"># ateliers</TableHead>
                      <TableHead className="whitespace-nowrap">Dernier atelier</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizers.map((org) => {
                      const expanded = isRowExpanded(org.user.id);
                      const familyCounts = Object.keys(org.workshopCountsByFamily);
                      const hasMultipleFamilies = familyCounts.length > 1;

                      return (
                        <>
                          <TableRow
                            key={org.user.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => toggleRowExpansion(org.user.id)}
                          >
                            <TableCell>
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{org.user.first_name}</TableCell>
                            <TableCell className="font-medium">{org.user.last_name}</TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">{org.user.email}</div>
                            </TableCell>
                            <TableCell>
                              {hasMultipleFamilies ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-medium cursor-help underline decoration-dotted">
                                        {org.workshopsCount}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        {Object.entries(org.workshopCountsByFamily).map(([familyId, count]) => (
                                          <p key={familyId}>{familyId}: {count} ateliers</p>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-sm font-medium">{org.workshopsCount}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {org.lastWorkshopDate ? (
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(org.lastWorkshopDate), 'dd/MM/yy', {
                                    locale: fr,
                                  })}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Aucun</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => handleEditClick(org, e)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {expanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-accent/20">
                                <div className="p-4 space-y-6">
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-semibold">Certifications</h4>

                                    <div className="grid md:grid-cols-2 gap-6">
                                      {Object.entries(org.rolesByFamily).map(([familyCode, roleKeys]) => {
                                        const cards = getCertificationCards(roleKeys, familyCode);
                                        if (!cards) return null;

                                        return (
                                          <div key={familyCode} className="space-y-3">
                                            <Badge variant="outline" className="flex-shrink-0 px-2.5 py-1">
                                              {familyCode}
                                            </Badge>
                                            {cards}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <h4 className="text-sm font-semibold">Historique des participations</h4>

                                    {org.participations.length === 0 ? (
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
                                            {org.participations
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

      <Dialog open={!!editingAnimator} onOpenChange={() => setEditingAnimator(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'animateur</DialogTitle>
            <DialogDescription>
              Modifiez les informations personnelles et les certifications de l'animateur
            </DialogDescription>
          </DialogHeader>

          {editingAnimator && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-first-name">Prénom</Label>
                    <Input
                      id="edit-first-name"
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-last-name">Nom</Label>
                    <Input
                      id="edit-last-name"
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Téléphone</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-birthdate">Date de naissance</Label>
                  <Input
                    id="edit-birthdate"
                    type="date"
                    value={editBirthdate}
                    onChange={(e) => setEditBirthdate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informations d'animation
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-language-animation">Langue d'animation</Label>
                  <Select value={editLanguageAnimation || 'none'} onValueChange={setEditLanguageAnimation}>
                    <SelectTrigger id="edit-language-animation">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="Français">Français</SelectItem>
                      <SelectItem value="Anglais">Anglais</SelectItem>
                      <SelectItem value="Espagnol">Espagnol</SelectItem>
                      <SelectItem value="Allemand">Allemand</SelectItem>
                      <SelectItem value="Italien">Italien</SelectItem>
                      <SelectItem value="Portugais">Portugais</SelectItem>
                      <SelectItem value="Chinois">Chinois</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Contrat
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-signed-contract"
                      checked={editSignedContract}
                      onCheckedChange={(checked) => setEditSignedContract(checked as boolean)}
                    />
                    <Label htmlFor="edit-signed-contract" className="cursor-pointer">
                      Contrat signé
                    </Label>
                  </div>
                  {editSignedContract && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="edit-contract-year">Année du contrat</Label>
                      <Input
                        id="edit-contract-year"
                        type="number"
                        value={editSignedContractYear}
                        onChange={(e) => setEditSignedContractYear(e.target.value)}
                        placeholder="2024"
                        min="2000"
                        max="2100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Certifications
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  {workshopFamilies.map(family => {
                    const familyRoleLevels = roleLevels.filter(rl => rl.workshop_family?.code === family.code);
                    if (familyRoleLevels.length === 0) return null;

                    return (
                      <div key={family.code} className="space-y-3">
                        <h4 className="text-sm font-medium">{family.code}</h4>
                        <div className="space-y-2 pl-4">
                          {familyRoleLevels
                            .sort((a, b) => (a.level || 0) - (b.level || 0))
                            .map((roleLevel) => {
                              const fullRoleKey = `${family.code}_${roleLevel.internal_key}`;
                              return (
                                <div key={fullRoleKey} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={fullRoleKey}
                                    checked={editRoles.includes(fullRoleKey)}
                                    onCheckedChange={() => handleRoleToggle(fullRoleKey)}
                                  />
                                  <label
                                    htmlFor={fullRoleKey}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                                  >
                                    {roleLevel.label}
                                    <Badge variant="outline" className="text-xs">{family.code}</Badge>
                                  </label>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingAnimator(null)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
