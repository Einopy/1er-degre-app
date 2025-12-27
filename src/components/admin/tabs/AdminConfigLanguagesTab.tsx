import { useState } from 'react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientLanguages, useWorkshopFamilies } from '@/hooks/use-client-config';
import type { ClientLanguage } from '@/lib/database.types';
import {
  createClientLanguage,
  updateClientLanguage,
  deleteClientLanguage,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Plus, Pencil, Trash2, Globe } from 'lucide-react';
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

const ISO_LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ko', name: '한국어' },
];

export function AdminConfigLanguagesTab() {
  const { activeClient } = useActiveClient();
  const [filterFamilyId, setFilterFamilyId] = useState<string | 'all'>('all');
  const { languages, loading: loadingLanguages, error: errorLanguages, refetch } = useClientLanguages(
    activeClient?.id,
    filterFamilyId === 'all' ? undefined : filterFamilyId
  );
  const { families, loading: loadingFamilies } = useWorkshopFamilies(activeClient?.id);
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<ClientLanguage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    language_code: '',
    language_name: '',
    workshop_family_id: null as string | null,
    is_active: true,
    display_order: 0,
  });

  const handleCreate = () => {
    setSelectedLanguage(null);
    setFormData({
      language_code: '',
      language_name: '',
      workshop_family_id: null,
      is_active: true,
      display_order: languages.length,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (language: ClientLanguage) => {
    setSelectedLanguage(language);
    setFormData({
      language_code: language.language_code,
      language_name: language.language_name,
      workshop_family_id: language.workshop_family_id,
      is_active: language.is_active,
      display_order: language.display_order,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (language: ClientLanguage) => {
    setSelectedLanguage(language);
    setDeleteDialogOpen(true);
  };

  const handleLanguageCodeChange = (code: string) => {
    const isoLang = ISO_LANGUAGES.find(l => l.code === code);
    setFormData({
      ...formData,
      language_code: code,
      language_name: isoLang?.name || '',
    });
  };

  const handleSubmit = async () => {
    if (!activeClient) return;

    if (!formData.language_code || !formData.language_name) {
      toast({
        title: 'Erreur',
        description: 'Le code et le nom de la langue sont requis.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (selectedLanguage) {
        await updateClientLanguage(selectedLanguage.id, {
          language_name: formData.language_name,
          workshop_family_id: formData.workshop_family_id,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        toast({
          title: 'Langue mise à jour',
          description: 'La langue a été mise à jour avec succès.',
        });
      } else {
        await createClientLanguage({
          ...formData,
          client_id: activeClient.id,
        });
        toast({
          title: 'Langue créée',
          description: 'La langue a été créée avec succès.',
        });
      }

      setEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving language:', error);
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
    if (!selectedLanguage) return;

    try {
      setIsSubmitting(true);
      await deleteClientLanguage(selectedLanguage.id);
      toast({
        title: 'Langue supprimée',
        description: 'La langue a été supprimée avec succès.',
      });
      setDeleteDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting language:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer cette langue.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFamilyName = (familyId: string | null) => {
    if (!familyId) return <Badge variant="secondary">Toutes les familles</Badge>;
    const family = families.find(f => f.id === familyId);
    return family ? <Badge variant="outline">{family.name}</Badge> : <Badge variant="secondary">-</Badge>;
  };

  if (loadingLanguages || loadingFamilies) {
    return <LoadingSpinner />;
  }

  if (errorLanguages) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{errorLanguages}</p>
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
              <CardTitle>Langues supportées</CardTitle>
              <CardDescription>
                Gérez les langues disponibles pour les ateliers de votre organisation
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle langue
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="filter-family">Filtrer par famille:</Label>
            <Select value={filterFamilyId} onValueChange={setFilterFamilyId}>
              <SelectTrigger id="filter-family" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les langues</SelectItem>
                <SelectItem value="global">Langues globales uniquement</SelectItem>
                {families.map(family => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {languages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune langue configurée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code ISO</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {languages.map((language) => (
                  <TableRow key={language.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {language.language_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {language.language_name}
                    </TableCell>
                    <TableCell>{getFamilyName(language.workshop_family_id)}</TableCell>
                    <TableCell>
                      {language.is_active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell>{language.display_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(language)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(language)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLanguage ? 'Modifier la langue' : 'Nouvelle langue'}
            </DialogTitle>
            <DialogDescription>
              Configurez les informations de la langue
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code ISO *</Label>
              <Select
                value={formData.language_code}
                onValueChange={handleLanguageCodeChange}
                disabled={!!selectedLanguage}
              >
                <SelectTrigger id="code">
                  <SelectValue placeholder="Sélectionner un code ISO" />
                </SelectTrigger>
                <SelectContent>
                  {ISO_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.code} - {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLanguage && (
                <p className="text-xs text-muted-foreground">
                  Le code ISO ne peut pas être modifié
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nom de la langue *</Label>
              <Input
                id="name"
                value={formData.language_name}
                onChange={(e) => setFormData({ ...formData, language_name: e.target.value })}
                placeholder="ex: Français, English, Deutsch"
                readOnly={!!formData.language_code && ISO_LANGUAGES.some(l => l.code === formData.language_code)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="family">Famille d'atelier</Label>
              <Select
                value={formData.workshop_family_id || 'all'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    workshop_family_id: value === 'all' ? null : value,
                  })
                }
              >
                <SelectTrigger id="family">
                  <SelectValue placeholder="Sélectionner une famille" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les familles</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Laissez "Toutes les familles" si cette langue s'applique à toutes les familles
              </p>
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
              Êtes-vous sûr de vouloir supprimer la langue "{selectedLanguage?.language_name}" ?
              Cette action est irréversible.
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
