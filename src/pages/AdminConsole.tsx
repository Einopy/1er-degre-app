import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Shield,
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Clock,
  Package,
  Building2,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { AdminDashboardTab } from '@/components/admin/tabs/AdminDashboardTab';
import { AdminWorkshopsTab } from '@/components/admin/tabs/AdminWorkshopsTab';
import { AdminOrganizersTab } from '@/components/admin/tabs/AdminOrganizersTab';
import { AdminUsersTab } from '@/components/admin/tabs/AdminUsersTab';
import { AdminWaitingListTab } from '@/components/admin/tabs/AdminWaitingListTab';
import { AdminOrdersTab } from '@/components/admin/tabs/AdminOrdersTab';

export function AdminConsole() {
  const { permissions, permissionsLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
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
              Vous n'avez pas les permissions administrateur pour accéder à cette console.
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
            <Shield className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              Console admin
            </h1>
            {activeClient && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {activeClient.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Gestion et supervision de la plateforme
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
        <AnimatedTabsList defaultValue={activeTab} className="grid w-full grid-cols-6 h-20 bg-muted/50 p-1.5 gap-1.5">
          <AnimatedTabsTrigger
            value="dashboard"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-blue-600 data-[state=inactive]:text-muted-foreground"
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Dashboard</span>
          </AnimatedTabsTrigger>

          <AnimatedTabsTrigger
            value="workshops"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-green-600 data-[state=inactive]:text-muted-foreground"
          >
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Ateliers</span>
          </AnimatedTabsTrigger>

          <AnimatedTabsTrigger
            value="organizers"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-purple-600 data-[state=inactive]:text-muted-foreground"
          >
            <UserCog className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Animateurs</span>
          </AnimatedTabsTrigger>

          <AnimatedTabsTrigger
            value="users"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-red-600 data-[state=inactive]:text-muted-foreground"
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Participants</span>
          </AnimatedTabsTrigger>

          <AnimatedTabsTrigger
            value="waitlist"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-yellow-600 data-[state=inactive]:text-muted-foreground"
          >
            <Clock className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Listes d'attente</span>
          </AnimatedTabsTrigger>

          <AnimatedTabsTrigger
            value="orders"
            className="flex-col gap-2 h-full px-2 data-[state=active]:text-orange-600 data-[state=inactive]:text-muted-foreground"
          >
            <Package className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Commandes</span>
          </AnimatedTabsTrigger>
        </AnimatedTabsList>

        <div className="mt-6">
          <AnimatedTabsContent value="dashboard" className="m-0">
            <AdminDashboardTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="workshops" className="m-0">
            <AdminWorkshopsTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="organizers" className="m-0">
            <AdminOrganizersTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="users" className="m-0">
            <AdminUsersTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="waitlist" className="m-0">
            <AdminWaitingListTab />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="orders" className="m-0">
            <AdminOrdersTab />
          </AnimatedTabsContent>
        </div>
      </AnimatedTabs>
    </div>
  );
}
