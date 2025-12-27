import { useState } from 'react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopTypes, useWorkshopFamilies } from '@/hooks/use-client-config';
import type { WorkshopType } from '@/lib/database.types';
import {
  createWorkshopType,
  updateWorkshopType,
  deleteWorkshopType,
} from '@/services/client-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Plus, Pencil, Trash2, GraduationCap, Wrench } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AdminConfigTypesTab() {
  const { activeClient } = useActiveClient();
  const { types, loading: loadingTypes, error: errorTypes, refetch } = useWorkshopTypes(activeClient?.id);
  const { families, loading: loadingFamilies } = useWorkshopFamilies(activeClient?.id);
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WorkshopType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    label: '',
    workshop_family_id: null as string | null,
    default_duration_minutes: 180,
    is_formation: false,
    is_active: true,
    display_order: 0,
  });

  const handleCreate = () => {
    setSelectedType(null);
    setFormData({
      code: '',
      label: '',
      workshop_family_id: null,
      default_duration_minutes: 180,
      is_formation: false,
      is_active: true,
      display_order: types.length,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (type: WorkshopType) => {
    setSelectedType(type);
    setFormData({
      code: type.code,
      label: type.label,
      workshop_family_id: type.workshop_family_id,
      default_duration_minutes: type.default_duration_minutes,
      is_formation: type.is_formation,
      is_active: type.is_active,
      display_order: type.display_order,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (type: WorkshopType) => {
    setSelectedType(type);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeClient) return;

    try {
      setIsSubmitting(true);

      if (selectedType) {
        await updateWorkshopType(selectedType.id, {
          label: formData.label,
          workshop_family_id: formData.workshop_family_id,
          default_duration_minutes: formData.default_duration_minutes,
          is_formation: formData.is_formation,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        toast({
          title: 'Type mis à jour',
          description: 'Le type d\'atelier a été mis à jour avec succès.',
        });
      } else {
        await createWorkshopType({
          ...formData,
          client_id: activeClient.id,
        });
        toast({
          title: 'Type créé',
          description: 'Le type d\'atelier a été créé avec succès.',
        });
      }

      setEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving workshop type:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'enregistrement.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedType) return;

    try {
      setIsSubmitting(true);
      await deleteWorkshopType(selectedType.id);
      toast({
        title: 'Type supprimé',
        description: 'Le type d\'atelier a été supprimé avec succès.',
      });
      setDeleteDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting workshop type:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer ce type. Il est peut-être utilisé par des ateliers.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFamilyName = (familyId: string | null) => {
    if (!familyId) return <Badge variant="outline">Transversal</Badge>;
    const family = families.find(f => f.id === familyId);
    return family ? <Badge>{family.name}</Badge> : <Badge variant="secondary">-</Badge>;
  };

  if (loadingTypes || loadingFamilies) {
    return <LoadingSpinner />;
  }

  if (errorTypes) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{errorTypes}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Types d'ateliers</CardTitle>
              <CardDescription>
                Gérez les différents types d'ateliers et formations pour votre organisation
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {types.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun type d'atelier configuré
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <Badge variant="outline">{type.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{type.label}</TableCell>
                    <TableCell>{getFamilyName(type.workshop_family_id)}</TableCell>
                    <TableCell>{type.default_duration_minutes} min</TableCell>
                    <TableCell>
                      {type.is_formation ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <GraduationCap className="h-3 w-3" />
                          Formation
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Wrench className="h-3 w-3" />
                          Atelier
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.is_active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedType ? 'Modifier le type' : 'Nouveau type d\'atelier'}
            </DialogTitle>
            <DialogDescription>
              Configurez les informations du type d'atelier
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ex: workshop, formation, formation_pro_1"
                disabled={!!selectedType}
              />
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  Le code ne peut pas être modifié
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: Atelier, Formation, Formation Pro 1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="family">Famille d'atelier</Label>
              <Select
                value={formData.workshop_family_id || 'transversal'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    workshop_family_id: value === 'transversal' ? null : value,
                  })
                }
              >
                <SelectTrigger id="family">
                  <SelectValue placeholder="Sélectionner une famille" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transversal">Transversal (toutes familles)</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Laissez "Transversal" si ce type s'applique à toutes les familles
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Durée par défaut (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.default_duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_duration_minutes: parseInt(e.target.value) || 180,
                    })
                  }
                  min={1}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="order">Ordre d'affichage</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="formation"
                checked={formData.is_formation}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_formation: checked as boolean })
                }
              />
              <Label htmlFor="formation" className="cursor-pointer">
                C'est une formation (pas un atelier classique)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="active">Actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le type "{selectedType?.label}" ?
              Cette action est irréversible et peut affecter les ateliers existants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
