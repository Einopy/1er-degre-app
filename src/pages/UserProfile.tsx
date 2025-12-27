import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader2, User as UserIcon, Shield, Award } from 'lucide-react';

export function UserProfile() {
  const { profile, permissions, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    birthdate: profile?.birthdate || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      if (!profile?.id) throw new Error('Profile ID is required');

      const { error } = await (supabase
        .from('users') as any)
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          birthdate: formData.birthdate || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      setIsEditing(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      birthdate: profile?.birthdate || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
            <p className="text-muted-foreground mt-2">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Rôles et Permissions</CardTitle>
                  <CardDescription>
                    Vos rôles système et permissions d'animation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Rôles système
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {permissions?.isSuperAdmin && (
                      <Badge variant="destructive">
                        <Shield className="h-3 w-3 mr-1" />
                        Super Administrateur
                      </Badge>
                    )}
                    {permissions?.isAdmin && (
                      <Badge variant="destructive">
                        <Shield className="h-3 w-3 mr-1" />
                        Administrateur
                      </Badge>
                    )}
                    {!permissions?.isSuperAdmin && !permissions?.isAdmin && (
                      <span className="text-sm text-muted-foreground">Utilisateur standard</span>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Permissions d'animation
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {permissions?.roleLevels && permissions.roleLevels.length > 0 ? (
                      permissions.roleLevels.map((rl: any) => (
                        <Badge key={rl.id} variant="outline">
                          {rl.role_level?.workshop_family?.code} - {rl.role_level?.label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Aucune permission d'animation
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle>Informations personnelles</CardTitle>
                    <CardDescription>
                      Vos coordonnées et informations de contact
                    </CardDescription>
                  </div>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Modifier
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert
                  variant={message.type === 'error' ? 'destructive' : 'default'}
                  className="mb-6"
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    {isEditing ? (
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-sm font-medium py-2">{profile.first_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    {isEditing ? (
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="text-sm font-medium py-2">{profile.last_name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <p className="text-sm font-medium py-2 text-muted-foreground">
                    {profile.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="text-sm font-medium py-2">
                      {profile.phone || 'Non renseigné'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">Date de naissance</Label>
                  {isEditing ? (
                    <Input
                      id="birthdate"
                      name="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="text-sm font-medium py-2">
                      {profile.birthdate
                        ? new Date(profile.birthdate).toLocaleDateString('fr-FR')
                        : 'Non renseignée'}
                    </p>
                  )}
                </div>

                {isEditing && (
                  <>
                    <Separator />
                    <div className="flex gap-3">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        Annuler
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
    </div>
  );
}
