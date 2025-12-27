import { useState, useEffect, useCallback } from 'react';
import type {
  WorkshopFamily,
  WorkshopType,
  ClientLanguage,
} from '@/lib/database.types';
import type { RoleLevelWithRequirements } from '@/services/client-config';
import {
  fetchWorkshopFamilies,
  fetchWorkshopTypes,
  fetchRoleLevels,
  fetchClientLanguages,
} from '@/services/client-config';

export function useWorkshopFamilies(clientId: string | undefined) {
  const [families, setFamilies] = useState<WorkshopFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFamilies = useCallback(async () => {
    if (!clientId) {
      console.log('[useWorkshopFamilies] No clientId provided, skipping load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useWorkshopFamilies] Loading families for client:', clientId);
      const data = await fetchWorkshopFamilies(clientId);
      console.log('[useWorkshopFamilies] Loaded families:', data.length, data);
      setFamilies(data);
    } catch (err) {
      console.error('[useWorkshopFamilies] Error loading workshop families:', err);
      setError('Erreur lors du chargement des familles d\'ateliers');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  return { families, loading, error, refetch: loadFamilies };
}

export function useWorkshopTypes(clientId: string | undefined, familyId?: string) {
  const [types, setTypes] = useState<WorkshopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWorkshopTypes(clientId, familyId);
      setTypes(data);
    } catch (err) {
      console.error('Error loading workshop types:', err);
      setError('Erreur lors du chargement des types d\'ateliers');
    } finally {
      setLoading(false);
    }
  }, [clientId, familyId]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  return { types, loading, error, refetch: loadTypes };
}

export function useRoleLevels(clientId: string | undefined, familyId?: string) {
  const [roleLevels, setRoleLevels] = useState<RoleLevelWithRequirements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoleLevels = useCallback(async () => {
    if (!clientId) {
      console.log('[useRoleLevels] No clientId provided, skipping load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useRoleLevels] Loading role levels for client:', clientId, 'family:', familyId);
      const data = await fetchRoleLevels(clientId, familyId);
      console.log('[useRoleLevels] Loaded role levels:', data.length, data);
      setRoleLevels(data);
    } catch (err) {
      console.error('[useRoleLevels] Error loading role levels:', err);
      setError('Erreur lors du chargement des niveaux de rôles');
    } finally {
      setLoading(false);
    }
  }, [clientId, familyId]);

  useEffect(() => {
    loadRoleLevels();
  }, [loadRoleLevels]);

  return { roleLevels, loading, error, refetch: loadRoleLevels };
}

export function useClientLanguages(clientId: string | undefined, familyId?: string | null) {
  const [languages, setLanguages] = useState<ClientLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLanguages = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchClientLanguages(clientId, familyId);
      setLanguages(data);
    } catch (err) {
      console.error('Error loading client languages:', err);
      setError('Erreur lors du chargement des langues');
    } finally {
      setLoading(false);
    }
  }, [clientId, familyId]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  return { languages, loading, error, refetch: loadLanguages };
}

export function useClientConfig(clientId: string | undefined) {
  const families = useWorkshopFamilies(clientId);
  const types = useWorkshopTypes(clientId);
  const roleLevels = useRoleLevels(clientId);
  const languages = useClientLanguages(clientId);

  const loading = families.loading || types.loading || roleLevels.loading || languages.loading;
  const error = families.error || types.error || roleLevels.error || languages.error;

  const refetchAll = useCallback(() => {
    families.refetch();
    types.refetch();
    roleLevels.refetch();
    languages.refetch();
  }, [families, types, roleLevels, languages]);

  return {
    families: families.families,
    types: types.types,
    roleLevels: roleLevels.roleLevels,
    languages: languages.languages,
    loading,
    error,
    refetch: refetchAll,
  };
}
