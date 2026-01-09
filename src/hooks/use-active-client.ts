import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminClients, getAllClients } from '@/lib/client-utils';
import { getUserClients } from '@/services/user-roles';
import type { Client } from '@/lib/database.types';

const ACTIVE_CLIENT_KEY = '1erdegre_active_client_id';
const DEFAULT_CLIENT_SLUG = '1er_degre';

export function useActiveClient() {
  const { profile, permissions } = useAuth();
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [adminClients, setAdminClients] = useState<Client[]>([]);
  const [userClients, setUserClients] = useState<Client[]>([]);
  const [defaultClient, setDefaultClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [profile?.id, permissions?.isSuperAdmin, permissions?.isAdmin]);

  const loadClients = async () => {
    setLoading(true);
    try {
      if (profile && (permissions?.isAdmin || permissions?.isSuperAdmin)) {
        // Admin flow - load admin clients
        const clients = await getAdminClients(profile);
        setAdminClients(clients);

        if (clients.length > 0) {
          const savedClientId = localStorage.getItem(ACTIVE_CLIENT_KEY);

          if (savedClientId && clients.some(c => c.id === savedClientId)) {
            setActiveClientIdState(savedClientId);
          } else {
            setActiveClientIdState(clients[0].id);
            localStorage.setItem(ACTIVE_CLIENT_KEY, clients[0].id);
          }
        }
      } else if (profile?.id) {
        // Regular user flow - load clients from role_levels
        const userClientsList = await getUserClients(profile.id);

        if (userClientsList.length > 0) {
          setUserClients(userClientsList);

          const savedClientId = localStorage.getItem(ACTIVE_CLIENT_KEY);

          if (savedClientId && userClientsList.some((c: any) => c.id === savedClientId)) {
            setActiveClientIdState(savedClientId);
          } else {
            setActiveClientIdState(userClientsList[0].id);
            localStorage.setItem(ACTIVE_CLIENT_KEY, userClientsList[0].id);
          }
        } else {
          // No role levels - fall back to default client for public access
          const allClients = await getAllClients();
          const defaultCli = allClients.find(c => c.slug === DEFAULT_CLIENT_SLUG) || allClients[0] || null;
          setDefaultClient(defaultCli);
          if (defaultCli) {
            setActiveClientIdState(defaultCli.id);
          }
        }
      } else {
        // Not logged in - show default client
        const allClients = await getAllClients();
        const defaultCli = allClients.find(c => c.slug === DEFAULT_CLIENT_SLUG) || allClients[0] || null;
        setDefaultClient(defaultCli);
        if (defaultCli) {
          setActiveClientIdState(defaultCli.id);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveClientId = (clientId: string) => {
    setActiveClientIdState(clientId);
    localStorage.setItem(ACTIVE_CLIENT_KEY, clientId);
  };

  const activeClient = (permissions?.isAdmin || permissions?.isSuperAdmin)
    ? adminClients.find(c => c.id === activeClientId) || null
    : userClients.find(c => c.id === activeClientId) || defaultClient;

  const availableClients = (permissions?.isAdmin || permissions?.isSuperAdmin) ? adminClients : userClients;
  const hasMultipleClients = availableClients.length > 1;

  return {
    activeClientId,
    activeClient,
    availableClients,
    hasMultipleClients,
    setActiveClientId,
    loading,
  };
}
