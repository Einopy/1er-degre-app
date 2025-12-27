import { supabase } from '@/lib/supabase';
import type { Workshop, User, WorkshopFamily, WorkshopType } from '@/lib/database.types';

export interface WorkshopWithRelations extends Workshop {
  workshop_family?: WorkshopFamily | null;
  workshop_type?: WorkshopType | null;
}

export interface WorkshopFilters {
  families?: string[];
  city?: string;
  language?: string;
  isRemote?: boolean | 'all';
  startDate?: Date;
  endDate?: Date;
  partySize?: number;
}

export interface WorkshopListResult {
  workshops: WorkshopWithRelations[];
  totalCount: number;
}

export interface WorkshopDetail extends WorkshopWithRelations {
  organizer_user: User | null;
  ticket_counts: {
    normal: number;
    reduit: number;
    gratuit: number;
    pro: number;
  };
}

export async function fetchWorkshops(
  filters: WorkshopFilters = {},
  page: number = 1,
  pageSize: number = 12
): Promise<WorkshopListResult> {
  try {
    let query = supabase
      .from('workshops')
      .select(`
        *,
        participations(status),
        workshop_family:workshop_families!workshops_workshop_family_id_fkey(
          id,
          code,
          name,
          card_illustration_url
        ),
        workshop_type:workshop_types!workshops_workshop_type_id_fkey(
          id,
          code,
          label,
          is_formation,
          default_duration_minutes
        )
      `, { count: 'exact' });

    query = query.eq('lifecycle_status', 'active');
    query = query.gte('start_at', new Date().toISOString());

    // Note: Family filter will be applied post-query since we need to filter by joined table data

    if (filters.city) {
      query = query.ilike('location->>city', `%${filters.city}%`);
    }

    if (filters.language) {
      query = query.eq('language', filters.language);
    }

    if (filters.isRemote !== 'all' && filters.isRemote !== undefined) {
      query = query.eq('is_remote', filters.isRemote);
    }

    if (filters.startDate) {
      query = query.gte('start_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('start_at', filters.endDate.toISOString());
    }

    query = query.order('start_at', { ascending: true });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching workshops:', error);
      throw error;
    }

    const workshopsWithSeats = (data || []).map((workshop: any) => {
      const activeParticipations = workshop.participations?.filter(
        (p: any) => ['inscrit', 'paye', 'en_attente'].includes(p.status)
      ) || [];

      const remaining_seats = workshop.audience_number - activeParticipations.length;

      return {
        ...workshop,
        remaining_seats,
      } as WorkshopWithRelations;
    });

    let filteredWorkshops = workshopsWithSeats;

    // Filter by workshop family
    if (filters.families && filters.families.length > 0) {
      filteredWorkshops = filteredWorkshops.filter((w) =>
        w.workshop_family && filters.families!.includes(w.workshop_family.code)
      );
    }

    // Filter out formation workshops (only show regular workshops)
    filteredWorkshops = filteredWorkshops.filter((w) =>
      w.workshop_type && !w.workshop_type.is_formation
    );

    if (filters.partySize && filters.partySize > 0) {
      filteredWorkshops = filteredWorkshops.filter(
        (w) => (w.remaining_seats ?? 0) >= filters.partySize!
      );
    }

    return {
      workshops: filteredWorkshops,
      totalCount: count ?? 0,
    };
  } catch (error) {
    console.error('Error in fetchWorkshops:', error);
    throw error;
  }
}

export async function getAvailableLanguages(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('workshops')
      .select('language')
      .eq('lifecycle_status', 'active')
      .gte('start_at', new Date().toISOString());

    if (error) throw error;

    const uniqueLanguages = [...new Set((data as any)?.map((w: any) => w.language) || [])] as string[];
    return uniqueLanguages.filter(Boolean).sort();
  } catch (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
}

export async function getAvailableCities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('workshops')
      .select('location')
      .eq('lifecycle_status', 'active')
      .eq('is_remote', false)
      .gte('start_at', new Date().toISOString());

    if (error) throw error;

    const cities = (data || [])
      .map((w: any) => {
        try {
          const location = w.location as { city?: string } | null;
          return location?.city;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    const uniqueCities = [...new Set(cities)];
    return uniqueCities.sort((a, b) => a.localeCompare(b, 'fr'));
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}

export async function fetchWorkshopById(id: string): Promise<WorkshopDetail | null> {
  try {
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select(`
        *,
        participations(status, ticket_type),
        workshop_family:workshop_families!workshops_workshop_family_id_fkey(
          id,
          code,
          name,
          card_illustration_url
        ),
        workshop_type:workshop_types!workshops_workshop_type_id_fkey(
          id,
          code,
          label,
          is_formation,
          default_duration_minutes
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (workshopError) {
      console.error('Error fetching workshop:', workshopError);
      throw workshopError;
    }

    if (!workshop) {
      return null;
    }

    const workshopData = workshop as any;
    const activeParticipations = workshopData.participations?.filter(
      (p: any) => ['inscrit', 'paye', 'en_attente'].includes(p.status)
    ) || [];

    const remaining_seats = workshopData.audience_number - activeParticipations.length;

    const ticket_counts = {
      normal: 0,
      reduit: 0,
      gratuit: 0,
      pro: 0,
    };

    activeParticipations.forEach((p: any) => {
      if (p.ticket_type && ticket_counts.hasOwnProperty(p.ticket_type)) {
        ticket_counts[p.ticket_type as keyof typeof ticket_counts]++;
      }
    });

    const { data: organizerUser, error: organizerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', workshopData.organizer)
      .maybeSingle();

    if (organizerError) {
      console.error('Error fetching organizer:', organizerError);
      throw organizerError;
    }

    if (!organizerUser) {
      console.error('Organizer not found for workshop:', workshopData.id, 'organizer id:', workshopData.organizer);
    }

    return {
      ...workshopData,
      remaining_seats,
      organizer_user: organizerUser || null,
      ticket_counts,
    } as WorkshopDetail;
  } catch (error) {
    console.error('Error in fetchWorkshopById:', error);
    throw error;
  }
}
