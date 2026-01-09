import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopFamilies } from '@/hooks/use-client-config';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Home,
  User,
  Database,
  GraduationCap,
  FolderOpen,
  Store,
  List,
  HelpCircle,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  FileText,
  Wrench,
  Crown,
  LayoutDashboard,
  Cog,
} from 'lucide-react';

export function AppSidebar() {
  const { profile, permissions, signOut } = useAuth();
  const { activeClient } = useActiveClient();
  const location = useLocation();
  const { families } = useWorkshopFamilies(activeClient?.id);

  const isActiveRoute = (path: string) => location.pathname === path;
  const isActiveParent = (paths: string[]) => paths.some((p) => location.pathname === p);
  const isParcoursActive = location.pathname.startsWith('/parcours');

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Sidebar className="bg-muted/20 border-r">
      <SidebarHeader className="border-b p-4">
        <Link to="/home" className="flex items-center gap-2">
          {activeClient?.secondary_logo_url ? (
            <div className="flex items-center gap-2">
              <img
                src={activeClient.secondary_logo_url}
                alt={activeClient.name}
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <span className="font-bold text-green-600">1er degré</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/home')}>
                  <Link
                    to="/home"
                    onClick={() => {
                      console.log(
                        '[SIDEBAR] click Home, current pathname =',
                        location.pathname
                      );
                    }}
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen={isActiveParent(['/profile', '/profile/workshops'])}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <User className="h-4 w-4" />
                      <span>Mon profil</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActiveRoute('/profile/workshops')}>
                          <Link to="/profile/workshops">
                            <FileText className="h-4 w-4" />
                            <span>Mes ateliers animés</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActiveRoute('/profile')}>
                          <Link to="/profile">
                            <User className="h-4 w-4" />
                            <span>Éditer mon profil</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/accounting')}>
                  <Link to="/accounting">
                    <Database className="h-4 w-4" />
                    <span>Ma compta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Mon Parcours - dynamique selon les familles */}
              {families.length === 0 ? (
                // Aucune famille - lien vers parcours qui affichera un message
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isParcoursActive}>
                    <Link to="/parcours">
                      <GraduationCap className="h-4 w-4" />
                      <span>Mon Parcours</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : families.length === 1 ? (
                // Une seule famille - lien direct
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isParcoursActive}>
                    <Link to={`/parcours/${families[0].code}`}>
                      <GraduationCap className="h-4 w-4" />
                      <span>Mon Parcours</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                // Plusieurs familles - menu dépliable
                <Collapsible defaultOpen={isParcoursActive}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <GraduationCap className="h-4 w-4" />
                        <span>Mon Parcours</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {families.map((family) => (
                          <SidebarMenuSubItem key={family.id}>
                            <SidebarMenuSubButton 
                              asChild 
                              isActive={isActiveRoute(`/parcours/${family.code}`)}
                            >
                              <Link to={`/parcours/${family.code}`}>
                                <span>{family.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              <Collapsible defaultOpen={isActiveParent(['/resources/fdfp', '/resources/hd'])}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <FolderOpen className="h-4 w-4" />
                      <span>Mes ressources</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActiveRoute('/resources/fdfp')}>
                          <Link to="/resources/fdfp">
                            <Wrench className="h-4 w-4" />
                            <span>FDFP</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isActiveRoute('/resources/hd')}>
                          <Link to="/resources/hd">
                            <Wrench className="h-4 w-4" />
                            <span>HD</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/shop')}>
                  <Link to="/shop">
                    <Store className="h-4 w-4" />
                    <span>La boutique</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/')}>
                  <Link to="/">
                    <List className="h-4 w-4" />
                    <span>Liste des ateliers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(permissions?.isSuperAdmin || permissions?.isAdmin) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {permissions?.isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActiveRoute('/super-admin')}>
                      <Link to="/super-admin">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <span>Super Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {permissions?.isAdmin && (
                  <Collapsible className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Shield className="h-4 w-4" />
                          <span>Admin</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActiveRoute('/admin') || isActiveRoute('/admin/dashboard')}>
                              <Link to="/admin">
                                <LayoutDashboard className="h-4 w-4" />
                                <span>Console Admin</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={isActiveRoute('/admin/config')}>
                              <Link to="/admin/config">
                                <Cog className="h-4 w-4" />
                                <span>Configuration</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/support')}>
                  <Link to="/support">
                    <HelpCircle className="h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveRoute('/settings')}>
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-600 text-white text-xs">
                {getInitials(profile?.first_name, profile?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 shrink-0 hover:bg-gray-100 text-black"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}