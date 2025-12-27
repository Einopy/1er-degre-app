import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Cog, Package, Settings, Shield, Languages, Building2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { AdminConfigFamiliesTab } from '@/components/admin/tabs/AdminConfigFamiliesTab';
import { AdminConfigTypesTab } from '@/components/admin/tabs/AdminConfigTypesTab';
import { AdminConfigRolesTab } from '@/components/admin/tabs/AdminConfigRolesTab';
import { AdminConfigLanguagesTab } from '@/components/admin/tabs/AdminConfigLanguagesTab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AdminConfiguration() {
  const { permissions, permissionsLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('families');
  const { activeClient, availableClients, setActiveClientId, loading: loadingClient } = useActiveClient();

  const userIsAdmin = permissions?.isAdmin || permissions?.isSuperAdmin || false;

  if (permissionsLoading || loadingClient) {
    return <LoadingSpinner />;
  }

  if (!userIsAdmin) {
    return (
      <div className="py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Accès refusé
            </CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions administrateur pour accéder à cette page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cette section est réservée aux utilisateurs avec le rôle admin.
            </p>
            <Button asChild>
              <Link to="/home">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingClient) {
    return <LoadingSpinner />;
  }

  if (!activeClient && availableClients.length === 0) {
    return (
      <div className="py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Aucun client assigné
            </CardTitle>
            <CardDescription>
              Vous n'êtes pas administrateur d'un client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Contactez un Super Admin pour être assigné à un client.
            </p>
            <Button asChild>
              <Link to="/home">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Cog className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              Configuration
            </h1>
            {activeClient && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {activeClient.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Configurez les familles d'ateliers, types, rôles et langues pour votre organisation
          </p>
        </div>

        {availableClients.length > 1 && (
          <div className="w-64">
            <Select value={activeClient?.id} onValueChange={setActiveClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <AnimatedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <AnimatedTabsList className="grid w-full grid-cols-4">
          <AnimatedTabsTrigger value="families">
            <Package className="h-4 w-4 mr-2" />
            Familles d'ateliers
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="types">
            <Settings className="h-4 w-4 mr-2" />
            Types d'ateliers
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Rôles & Parcours
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="languages">
            <Languages className="h-4 w-4 mr-2" />
            Langues
          </AnimatedTabsTrigger>
        </AnimatedTabsList>

        <div className="mt-6">
          <AnimatedTabsContent value="families" className="m-0">
            <AdminConfigFamiliesTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="types" className="m-0">
            <AdminConfigTypesTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="roles" className="m-0">
            <AdminConfigRolesTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="languages" className="m-0">
            <AdminConfigLanguagesTab />
          </AnimatedTabsContent>
        </div>
      </AnimatedTabs>
    </div>
  );
}
