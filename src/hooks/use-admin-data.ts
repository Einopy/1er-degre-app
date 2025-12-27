// src/hooks/use-admin-data.ts

import { useState, useEffect } from 'react';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  fetchDashboardStats,
  fetchActionItems,
  fetchAdminWorkshops,
  fetchOrganizers,
  fetchUsersWithStats,
  fetchParticipants,
  fetchWaitlistEntries,
  type AdminDashboardStats,
  type ActionItem,
  type WorkshopWithDetails,
  type AdminWorkshopFilters,
  type OrganizerStats,
  type UserWithStats,
  type ParticipantStats,
  type WaitlistWithWorkshop,
} from '@/services/admin-data';

export function useAdminDashboard(monthsBack: number = 6) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, actionsData] = await Promise.all([
        fetchDashboardStats(monthsBack),
        fetchActionItems(),
      ]);
      setStats(statsData);
      setActions(actionsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsBack]);

  return { stats, actions, loading, error, reload: loadData };
}

export function useAdminWorkshops(filters: AdminWorkshopFilters = {}) {
  const [workshops, setWorkshops] = useState<WorkshopWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkshops = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminWorkshops(filters);
      setWorkshops(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load workshops');
      console.error('Error loading workshops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkshops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { workshops, loading, error, reload: loadWorkshops };
}

export function useOrganizers() {
  const { activeClientId } = useActiveClient();
  const [organizers, setOrganizers] = useState<OrganizerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizers = async (clientId: string) => {
    setLoading(true);
    try {
      const data = await fetchOrganizers(clientId);
      console.log('[useOrganizers] Loaded organizers:', data.length, data);
      setOrganizers(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading organizers:', err);
      setError(err.message || 'Failed to load organizers');
      setOrganizers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeClientId) {
      console.log('[useOrganizers] No activeClientId, skipping load');
      setOrganizers([]);
      setLoading(false);
      return;
    }

    console.log('[useOrganizers] Loading organizers for client:', activeClientId);
    loadOrganizers(activeClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClientId]);

  const reload = () => {
    if (!activeClientId) {
      console.log('[useOrganizers] reload called but no activeClientId');
      return;
    }
    loadOrganizers(activeClientId);
  };

  return { organizers, loading, error, reload };
}

export function useUsersWithStats() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersWithStats();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return { users, loading, error, reload: loadUsers };
}

export function useParticipants() {
  const [participants, setParticipants] = useState<ParticipantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const data = await fetchParticipants();
      setParticipants(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load participants');
      console.error('Error loading participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  return { participants, loading, error, reload: loadParticipants };
}

export function useWaitlist() {
  const [entries, setEntries] = useState<WaitlistWithWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWaitlist = async () => {
    setLoading(true);
    try {
      const data = await fetchWaitlistEntries();
      setEntries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load waitlist');
      console.error('Error loading waitlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlist();
  }, []);

  return { entries, loading, error, reload: loadWaitlist };
}