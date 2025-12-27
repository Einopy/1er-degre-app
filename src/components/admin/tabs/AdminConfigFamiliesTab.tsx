import { useState } from 'react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopFamilies } from '@/hooks/use-client-config';
import type { WorkshopFamily } from '@/lib/database.types';
import {
  createWorkshopFamily,
  updateWorkshopFamily,
  deleteWorkshopFamily,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
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

export function AdminConfigFamiliesTab() {
  const { activeClient } = useActiveClient();
  const { families, loading, error, refetch } = useWorkshopFamilies(activeClient?.id);
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<WorkshopFamily | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    default_duration_minutes: 180,
    card_illustration_url: '',
    is_active: true,
    display_order: 0,
  });

  const handleCreate = () => {
    setSelectedFamily(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      default_duration_minutes: 180,
      card_illustration_url: '',
      is_active: true,
      display_order: families.length,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (family: WorkshopFamily) => {
    setSelectedFamily(family);
    setFormData({
      code: family.code,
      name: family.name,
      description: family.description || '',
      default_duration_minutes: family.default_duration_minutes,
      card_illustration_url: family.card_illustration_url || '',
      is_active: family.is_active,
      display_order: family.display_order,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (family: WorkshopFamily) => {
    setSelectedFamily(family);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeClient) return;

    try {
      setIsSubmitting(true);

      if (selectedFamily) {
        await updateWorkshopFamily(selectedFamily.id, formData);
        toast({
          title: 'Famille mise à jour',
          description: 'La famille d\'ateliers a été mise à jour avec succès.',
        });
      } else {
        await createWorkshopFamily({
          ...formData,
          client_id: activeClient.id,
        });
        toast({
          title: 'Famille créée',
          description: 'La famille d\'ateliers a été créée avec succès.',
        });
      }

      setEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving workshop family:', error);
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
    if (!selectedFamily) return;

    try {
      setIsSubmitting(true);
      await deleteWorkshopFamily(selectedFamily.id);
      toast({
        title: 'Famille supprimée',
        description: 'La famille d\'ateliers a été supprimée avec succès.',
      });
      setDeleteDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting workshop family:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette famille. Elle est peut-être utilisée par des ateliers.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
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
              <CardTitle>Familles d'ateliers</CardTitle>
              <CardDescription>
                Gérez les marques et types de formations pour votre organisation
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle famille
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {families.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune famille d'ateliers configurée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Durée par défaut</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell>
                      <Badge variant="outline">{family.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{family.name}</TableCell>
                    <TableCell>{family.default_duration_minutes} min</TableCell>
                    <TableCell>
                      {family.card_illustration_url ? (
                        <ImageIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {family.is_active ? (
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
                          onClick={() => handleEdit(family)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(family)}
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
              {selectedFamily ? 'Modifier la famille' : 'Nouvelle famille d\'ateliers'}
            </DialogTitle>
            <DialogDescription>
              Configurez les informations de la famille d'ateliers
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ex: FDFP, HD"
                disabled={!!selectedFamily}
              />
              {selectedFamily && (
                <p className="text-xs text-muted-foreground">
                  Le code ne peut pas être modifié
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Fresque du Faire ensemble"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la famille d'ateliers"
                rows={3}
              />
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

            <div className="grid gap-2">
              <Label htmlFor="image">Image (illustration carte)</Label>
              <ImageUploadField
                value={formData.card_illustration_url}
                onChange={(path) => setFormData({ ...formData, card_illustration_url: path || '' })}
                bucket="client-logos"
                maxSizeMB={2}
              />
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
              Êtes-vous sûr de vouloir supprimer la famille "{selectedFamily?.name}" ?
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
