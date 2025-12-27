import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin } from '@/lib/organizer-utils';
import {
  getAllClients,
  getClientAdmins,
  createClient,
  updateClient,
  removeClientAdmin,
  addClientAdmin,
  getUsersNotAdminForClient,
  createUserWithAdmin,
  uploadPrimaryLogo,
  uploadSecondaryLogo,
  uploadFavicon,
  deleteClientLogo,
} from '@/lib/client-utils';
import type { Client, User } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Crown, Plus, Edit, Users, Loader2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

export function SuperAdminConsole() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false);
  const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAdmins, setClientAdmins] = useState<(User & { clientAdminId: string })[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [primaryLogoFile, setPrimaryLogoFile] = useState<File | null>(null);
  const [primaryLogoPreview, setPrimaryLogoPreview] = useState<string | null>(null);
  const [secondaryLogoFile, setSecondaryLogoFile] = useState<File | null>(null);
  const [secondaryLogoPreview, setSecondaryLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const [newClientForm, setNewClientForm] = useState({
    slug: '',
    name: '',
  });

  const [editClientForm, setEditClientForm] = useState({
    slug: '',
    name: '',
    logo_url: '',
    primary_logo_url: '',
    secondary_logo_url: '',
    favicon_url: '',
    is_active: true,
  });

  const userIsSuperAdmin = isSuperAdmin(profile);

  useEffect(() => {
    if (userIsSuperAdmin) {
      loadClients();
    } else {
      setLoading(false);
    }
  }, [userIsSuperAdmin]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientForm.slug || !newClientForm.name) {
      toast.error('Le slug et le nom sont requis');
      return;
    }

    try {
      const result = await createClient({
        slug: newClientForm.slug.toLowerCase().replace(/\s+/g, '_'),
        name: newClientForm.name,
        is_active: true,
      });

      if (result) {
        toast.success('Client créé avec succès');
        setCreateDialogOpen(false);
        setNewClientForm({ slug: '', name: '' });
        loadClients();
      } else {
        toast.error('Erreur lors de la création du client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création du client');
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient || !editClientForm.name) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      setUploadingLogo(true);
      let finalPrimaryLogoUrl = editClientForm.primary_logo_url;
      let finalSecondaryLogoUrl = editClientForm.secondary_logo_url;
      let finalFaviconUrl = editClientForm.favicon_url;

      if (primaryLogoFile) {
        if (editClientForm.primary_logo_url && editClientForm.primary_logo_url.includes('client-logos')) {
          await deleteClientLogo(editClientForm.primary_logo_url);
        }

        const uploadedUrl = await uploadPrimaryLogo(primaryLogoFile, selectedClient.id);
        if (uploadedUrl) {
          finalPrimaryLogoUrl = uploadedUrl;
        } else {
          toast.error('Erreur lors de l\'upload du logo principal');
          setUploadingLogo(false);
          return;
        }
      }

      if (secondaryLogoFile) {
        if (editClientForm.secondary_logo_url && editClientForm.secondary_logo_url.includes('client-logos')) {
          await deleteClientLogo(editClientForm.secondary_logo_url);
        }

        const uploadedUrl = await uploadSecondaryLogo(secondaryLogoFile, selectedClient.id);
        if (uploadedUrl) {
          finalSecondaryLogoUrl = uploadedUrl;
        } else {
          toast.error('Erreur lors de l\'upload du logo secondaire');
          setUploadingLogo(false);
          return;
        }
      }

      if (faviconFile) {
        if (editClientForm.favicon_url && editClientForm.favicon_url.includes('client-logos')) {
          await deleteClientLogo(editClientForm.favicon_url);
        }

        const uploadedUrl = await uploadFavicon(faviconFile, selectedClient.id);
        if (uploadedUrl) {
          finalFaviconUrl = uploadedUrl;
        } else {
          toast.error('Erreur lors de l\'upload du favicon');
          setUploadingLogo(false);
          return;
        }
      }

      const success = await updateClient(selectedClient.id, {
        name: editClientForm.name,
        primary_logo_url: finalPrimaryLogoUrl || undefined,
        secondary_logo_url: finalSecondaryLogoUrl || undefined,
        favicon_url: finalFaviconUrl || undefined,
        is_active: editClientForm.is_active,
      });

      if (success) {
        toast.success('Client mis à jour avec succès');
        setEditDialogOpen(false);
        setSelectedClient(null);
        setPrimaryLogoFile(null);
        setPrimaryLogoPreview(null);
        setSecondaryLogoFile(null);
        setSecondaryLogoPreview(null);
        setFaviconFile(null);
        setFaviconPreview(null);
        loadClients();
      } else {
        toast.error('Erreur lors de la mise à jour du client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour du client');
    } finally {
      setUploadingLogo(false);
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setEditClientForm({
      slug: client.slug,
      name: client.name,
      logo_url: client.logo_url || '',
      primary_logo_url: client.primary_logo_url || '',
      secondary_logo_url: client.secondary_logo_url || '',
      favicon_url: client.favicon_url || '',
      is_active: client.is_active,
    });
    setPrimaryLogoFile(null);
    setPrimaryLogoPreview(null);
    setSecondaryLogoFile(null);
    setSecondaryLogoPreview(null);
    setFaviconFile(null);
    setFaviconPreview(null);
    setEditDialogOpen(true);
  };

  const handlePrimaryLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5MB');
        return;
      }

      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        toast.error('Format de fichier non supporté. Utilisez JPG, PNG, WebP ou SVG.');
        return;
      }

      setPrimaryLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrimaryLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecondaryLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5MB');
        return;
      }

      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        toast.error('Format de fichier non supporté. Utilisez JPG, PNG, WebP ou SVG.');
        return;
      }

      setSecondaryLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSecondaryLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5MB');
        return;
      }

      if (!['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        toast.error('Format de fichier non supporté pour favicon. Utilisez ICO ou PNG.');
        return;
      }

      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAdminsDialog = async (client: Client) => {
    setSelectedClient(client);
    setAdminsDialogOpen(true);
    setLoadingAdmins(true);

    try {
      const admins = await getClientAdmins(client.id);
      setClientAdmins(
        admins.map(ca => ({
          ...ca.user,
          clientAdminId: ca.id,
        }))
      );
    } catch (error) {
      console.error('Error loading client admins:', error);
      toast.error('Erreur lors du chargement des admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const openAddAdminDialog = (client: Client) => {
    setSelectedClient(client);
    setAddAdminDialogOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setIsCreatingNewUser(false);
    setNewUserForm({ email: '', firstName: '', lastName: '' });
  };

  const handleSearchUsers = async () => {
    if (!selectedClient || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    try {
      const users = await getUsersNotAdminForClient(selectedClient.id, searchQuery);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAddExistingAdmin = async (userId: string) => {
    if (!selectedClient) return;

    try {
      const success = await addClientAdmin(selectedClient.id, userId);
      if (success) {
        toast.success('Admin ajouté avec succès');
        setAddAdminDialogOpen(false);
        openAdminsDialog(selectedClient);
      } else {
        toast.error('Erreur lors de l\'ajout de l\'admin');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Erreur lors de l\'ajout de l\'admin');
    }
  };

  const handleCreateNewAdmin = async () => {
    if (!selectedClient) return;

    if (!newUserForm.email || !newUserForm.firstName || !newUserForm.lastName) {
      toast.error('Tous les champs sont requis');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      toast.error('Email invalide');
      return;
    }

    try {
      const result = await createUserWithAdmin(
        selectedClient.id,
        newUserForm.email,
        newUserForm.firstName,
        newUserForm.lastName
      );

      if (result.success) {
        toast.success('Utilisateur créé et ajouté comme admin');
        setAddAdminDialogOpen(false);
        openAdminsDialog(selectedClient);
      } else {
        toast.error(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Erreur lors de la création de l\'admin');
    }
  };

  if (!userIsSuperAdmin) {
    return (
      <div className="py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Accès refusé
            </CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions Super Admin pour accéder à cette console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cette section est réservée aux Super Administrateurs.
            </p>
            <Button asChild>
              <Link to="/home">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            Super Admin Console
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestion des clients et attribution des administrateurs
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clients de la plateforme</CardTitle>
          <CardDescription>
            Liste de tous les clients ({clients.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{client.slug}</code>
                    </TableCell>
                    <TableCell>
                      {client.is_active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdminsDialog(client)}
                          title="Voir les admins"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddAdminDialog(client)}
                          title="Ajouter un admin"
                        >
                          <UserPlus className="h-4 w-4" />
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau client</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau client à la plateforme
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Nom du client *</Label>
              <Input
                id="client-name"
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                placeholder="ex: La Fresque du Climat"
              />
            </div>
            <div>
              <Label htmlFor="client-slug">Slug *</Label>
              <Input
                id="client-slug"
                value={newClientForm.slug}
                onChange={(e) =>
                  setNewClientForm({
                    ...newClientForm,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                  })
                }
                placeholder="ex: fresque_climat"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identifiant unique (minuscules, chiffres, - et _)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateClient}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Mettre à jour les informations du client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-client-name">Nom du client *</Label>
              <Input
                id="edit-client-name"
                value={editClientForm.name}
                onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-client-slug">Slug</Label>
              <Input
                id="edit-client-slug"
                value={editClientForm.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Le slug ne peut pas être modifié</p>
            </div>
            <div className="space-y-2">
              <Label>Logo principal (page publique)</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    onChange={handlePrimaryLogoFileChange}
                    className="flex-1"
                  />
                  {primaryLogoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPrimaryLogoFile(null);
                        setPrimaryLogoPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Logo affiché en haut à gauche de la liste des ateliers. Formats: JPG, PNG, WebP, SVG (max 5MB)
                </p>
                {primaryLogoPreview ? (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-xs font-medium mb-1.5">Aperçu:</p>
                    <img
                      src={primaryLogoPreview}
                      alt="Preview"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : editClientForm.primary_logo_url ? (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-xs font-medium mb-1.5">Logo actuel:</p>
                    <img
                      src={editClientForm.primary_logo_url}
                      alt="Current primary logo"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo secondaire (sidebar)</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    onChange={handleSecondaryLogoFileChange}
                    className="flex-1"
                  />
                  {secondaryLogoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSecondaryLogoFile(null);
                        setSecondaryLogoPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Logo compact affiché dans la barre latérale. Formats: JPG, PNG, WebP, SVG (max 5MB)
                </p>
                {secondaryLogoPreview ? (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-xs font-medium mb-1.5">Aperçu:</p>
                    <img
                      src={secondaryLogoPreview}
                      alt="Preview"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : editClientForm.secondary_logo_url ? (
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-xs font-medium mb-1.5">Logo actuel:</p>
                    <img
                      src={editClientForm.secondary_logo_url}
                      alt="Current secondary logo"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg,image/jpg"
                    onChange={handleFaviconFileChange}
                    className="flex-1"
                  />
                  {faviconFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFaviconFile(null);
                        setFaviconPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Icône affichée dans l'onglet du navigateur. Formats: ICO, PNG (recommandé: 32x32 ou 16x16 pixels, max 5MB)
                </p>
                {faviconPreview ? (
                  <div className="border rounded-lg p-2 bg-muted/20">
                    <p className="text-xs font-medium mb-1">Aperçu:</p>
                    <img
                      src={faviconPreview}
                      alt="Preview"
                      className="max-h-8 object-contain"
                    />
                  </div>
                ) : editClientForm.favicon_url ? (
                  <div className="border rounded-lg p-2 bg-muted/20">
                    <p className="text-xs font-medium mb-1">Favicon actuel:</p>
                    <img
                      src={editClientForm.favicon_url}
                      alt="Current favicon"
                      className="max-h-8 object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-client-active"
                checked={editClientForm.is_active}
                onChange={(e) =>
                  setEditClientForm({ ...editClientForm, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="edit-client-active">Client actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={uploadingLogo}>
              Annuler
            </Button>
            <Button onClick={handleUpdateClient} disabled={uploadingLogo}>
              {uploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminsDialogOpen} onOpenChange={setAdminsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Administrateurs de {selectedClient?.name}</DialogTitle>
            <DialogDescription>
              Gérer les utilisateurs avec accès admin à ce client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingAdmins ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : clientAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun administrateur assigné à ce client</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                {clientAdmins.map(admin => (
                  <div
                    key={admin.clientAdminId}
                    className="flex items-center justify-between p-4 border-b last:border-b-0"
                  >
                    <div>
                      <p className="font-medium">
                        {admin.first_name} {admin.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (selectedClient) {
                          const success = await removeClientAdmin(selectedClient.id, admin.id);
                          if (success) {
                            toast.success('Admin supprimé');
                            openAdminsDialog(selectedClient);
                          }
                        }
                      }}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur à {selectedClient?.name}</DialogTitle>
            <DialogDescription>
              Rechercher un utilisateur existant ou créer un nouveau compte admin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={!isCreatingNewUser ? 'default' : 'outline'}
                onClick={() => setIsCreatingNewUser(false)}
                className="flex-1"
              >
                Ajouter existant
              </Button>
              <Button
                variant={isCreatingNewUser ? 'default' : 'outline'}
                onClick={() => setIsCreatingNewUser(true)}
                className="flex-1"
              >
                Créer nouveau
              </Button>
            </div>

            {!isCreatingNewUser ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher par email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                  />
                  <Button onClick={handleSearchUsers} disabled={loadingSearch}>
                    {loadingSearch ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Chercher'
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddExistingAdmin(user.id)}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery && !loadingSearch ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucun utilisateur trouvé</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-user-email">Email *</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="new-user-firstname">Prénom *</Label>
                  <Input
                    id="new-user-firstname"
                    value={newUserForm.firstName}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, firstName: e.target.value })
                    }
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <Label htmlFor="new-user-lastname">Nom *</Label>
                  <Input
                    id="new-user-lastname"
                    value={newUserForm.lastName}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, lastName: e.target.value })
                    }
                    placeholder="Dupont"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    L'utilisateur recevra un email d'activation pour configurer son mot de passe.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdminDialogOpen(false)}>
              Annuler
            </Button>
            {isCreatingNewUser && (
              <Button onClick={handleCreateNewAdmin}>
                Créer et ajouter
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
