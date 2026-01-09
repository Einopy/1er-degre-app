import { supabase } from '@/lib/supabase';
import type { Workshop, Participation, WorkshopLocation, User, WorkshopFamily, WorkshopType } from '@/lib/database.types';
import { trackDateChange, trackLocationChange, logHistoryEvent } from './workshop-changes';
import { fetchPersonalTemplate, fetchOfficialTemplate } from './email-templates';

export interface OrganizerWorkshopSummary extends Workshop {
  organizer_user: User | null;
  co_organizers_users?: User[];
  participant_count: number;
  attended_count: number;
  total_revenue: number;
  remaining_seats: number;
  workshop_family?: WorkshopFamily | null;
  workshop_type?: WorkshopType | null;
}

export interface ParticipantWithUser extends Participation {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}

export async function fetchOrganizerWorkshops(
  organizerId: string
): Promise<OrganizerWorkshopSummary[]> {
  // First, get workshop IDs where user is co-organizer
  const { data: coOrgWorkshops } = await supabase
    .from('workshop_co_organizers')
    .select('workshop_id')
    .eq('user_id', organizerId);
  
  const coOrgWorkshopIds = (coOrgWorkshops || []).map(w => w.workshop_id);

  // Fetch all workshops where user is either organizer or co-organizer
  let query = supabase
    .from('workshops')
    .select(
      `
      *,
      organizer_user:users!workshops_organizer_fkey(*),
      participations(status, payment_status, price_paid, attended),
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
    `
    )
    .order('start_at', { ascending: false });

  // Filter by organizer OR co-organizer
  if (coOrgWorkshopIds.length > 0) {
    query = query.or(`organizer.eq.${organizerId},id.in.(${coOrgWorkshopIds.join(',')})`);
  } else {
    query = query.eq('organizer', organizerId);
  }

  const { data: allWorkshops, error } = await query;

  if (error) throw error;

  const workshopsWithStats = await Promise.all((allWorkshops || []).map(async (workshop: any) => {
    const participations = workshop.participations || [];
    const activeParticipations = participations.filter((p: any) =>
      ['inscrit', 'paye', 'en_attente'].includes(p.status)
    );

    const participant_count = activeParticipations.length;
    const attended_count = participations.filter((p: any) => p.attended === true).length;
    const total_revenue = participations
      .filter((p: any) => p.payment_status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.price_paid || 0), 0);
    const remaining_seats = workshop.audience_number - participant_count;

    // Fetch co-organizers user data from workshop_co_organizers table
    let coOrganizersUsers: User[] = [];
    const { data: coOrgData } = await supabase
      .from('workshop_co_organizers')
      .select('user:users(id, email, first_name, last_name, phone, is_super_admin)')
      .eq('workshop_id', workshop.id);
    
    if (coOrgData && coOrgData.length > 0) {
      coOrganizersUsers = coOrgData
        .map((co: any) => co.user)
        .filter((u: any): u is User => u !== null);
    }

    return {
      ...workshop,
      organizer_user: workshop.organizer_user || null,
      co_organizers_users: coOrganizersUsers,
      participant_count,
      attended_count,
      total_revenue,
      remaining_seats,
    } as OrganizerWorkshopSummary;
  }));

  return workshopsWithStats;
}

export async function fetchWorkshopParticipants(
  workshopId: string
): Promise<ParticipantWithUser[]> {
  const { data, error } = await supabase
    .from('participations')
    .select(
      `
      *,
      user:users(id, email, first_name, last_name, phone)
    `
    )
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []) as ParticipantWithUser[];
}

export async function updateParticipantAttendance(
  participationId: string,
  attended: boolean
): Promise<void> {
  const { error } = await (supabase
    .from('participations') as any)
    .update({ attended })
    .eq('id', participationId);

  if (error) throw error;
}

export async function refundParticipation(
  participationId: string,
  workshopId: string,
  userId: string
): Promise<void> {
  const { data: participation, error: fetchError } = await supabase
    .from('participations')
    .select('*, user:users(first_name, last_name, email)')
    .eq('id', participationId)
    .maybeSingle();

  if (fetchError || !participation) {
    throw new Error('Participation not found');
  }

  const { error } = await (supabase
    .from('participations') as any)
    .update({
      status: 'rembourse',
      payment_status: 'refunded',
    })
    .eq('id', participationId);

  if (error) throw error;

  const user = (participation as any).user;
  const participantUserId = (participation as any).user_id;
  await logHistoryEvent(
    workshopId,
    'refund',
    `Remboursement effectué pour ${user.first_name} ${user.last_name}`,
    {
      participation_id: participationId,
      user_email: user.email,
      amount: (participation as any).price_paid,
    },
    userId,
    participantUserId
  );
}

export async function updateWorkshopStatus(
  workshopId: string,
  status: 'active' | 'closed' | 'canceled',
  userId: string
): Promise<void> {
  const { data: workshop, error: fetchError } = await supabase
    .from('workshops')
    .select('lifecycle_status')
    .eq('id', workshopId)
    .maybeSingle();

  if (fetchError || !workshop) {
    throw new Error('Workshop not found');
  }

  const workshopData = workshop as any;

  const { error } = await (supabase
    .from('workshops') as any)
    .update({ lifecycle_status: status })
    .eq('id', workshopId);

  if (error) throw error;

  const statusLabels: Record<string, string> = {
    active: 'Actif',
    closed: 'Clôturé',
    canceled: 'Annulé',
  };

  const oldStatusLabel = statusLabels[workshopData.lifecycle_status] || workshopData.lifecycle_status;
  const newStatusLabel = statusLabels[status] || status;

  await logHistoryEvent(
    workshopId,
    'status_change',
    `Statut changé de ${oldStatusLabel} à ${newStatusLabel}`,
    { old_status: workshopData.lifecycle_status, new_status: status },
    userId,
    null
  );
}

export async function updateWorkshopInvoiceNumber(
  workshopId: string,
  invoiceNumber: string
): Promise<void> {
  const { error } = await (supabase
    .from('workshops') as any)
    .update({ invoice_number: invoiceNumber })
    .eq('id', workshopId);

  if (error) throw error;
}

async function populateEmailFieldsFromTemplates(
  workshopData: Partial<Workshop>,
  organizerId: string
): Promise<Partial<Workshop>> {
  const workshopFamilyId = workshopData.workshop_family_id || '';
  const language = workshopData.language || 'fr';

  const prePersonalTemplate = await fetchPersonalTemplate(organizerId, workshopFamilyId, language, 'pre');
  const postPersonalTemplate = await fetchPersonalTemplate(organizerId, workshopFamilyId, language, 'post');

  let preSubject = '';
  let preHtml = '';
  let postSubject = '';
  let postHtml = '';

  if (prePersonalTemplate) {
    preSubject = prePersonalTemplate.subject;
    preHtml = prePersonalTemplate.html_content;
  } else {
    const preOfficialTemplate = await fetchOfficialTemplate(workshopFamilyId, language, 'pre');
    if (preOfficialTemplate) {
      preSubject = preOfficialTemplate.subject;
      preHtml = preOfficialTemplate.html_content;
    }
  }

  if (postPersonalTemplate) {
    postSubject = postPersonalTemplate.subject;
    postHtml = postPersonalTemplate.html_content;
  } else {
    const postOfficialTemplate = await fetchOfficialTemplate(workshopFamilyId, language, 'post');
    if (postOfficialTemplate) {
      postSubject = postOfficialTemplate.subject;
      postHtml = postOfficialTemplate.html_content;
    }
  }

  return {
    ...workshopData,
    mail_pre_subject: preSubject || null,
    mail_pre_html: preHtml || null,
    mail_post_subject: postSubject || null,
    mail_post_html: postHtml || null,
  };
}

export async function createWorkshop(
  workshop: Partial<Workshop>,
  organizerId?: string
): Promise<Workshop> {
  let workshopToInsert = workshop;

  if (organizerId) {
    workshopToInsert = await populateEmailFieldsFromTemplates(workshop, organizerId);
  }

  const { data, error } = await (supabase
    .from('workshops') as any)
    .insert(workshopToInsert)
    .select()
    .single();

  if (error) throw error;
  return data as Workshop;
}

export async function createPlannedWorkshop(
  workshopData: Partial<Workshop>,
  organizerId: string
): Promise<Workshop> {
  const workshop = await createWorkshop({
    ...workshopData,
    lifecycle_status: 'active',
    modified_date_flag: false,
    modified_location_flag: false,
  }, organizerId);

  // Get organizer name for history log
  const { data: organizerData } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', organizerId)
    .single();

  const organizerName = organizerData 
    ? `${organizerData.first_name} ${organizerData.last_name}`
    : 'Organisateur';

  await logHistoryEvent(
    workshop.id,
    'status_change',
    `${organizerName} a créé l'atelier`,
    {
      workshop_family_id: workshop.workshop_family_id,
      workshop_type_id: workshop.workshop_type_id,
      classification: workshop.classification_status,
      capacity: workshop.audience_number,
      language: workshop.language,
      is_remote: workshop.is_remote,
      start_at: workshop.start_at,
      end_at: workshop.end_at,
    },
    organizerId,
    null
  );

  return workshop;
}

export async function createDeclaredWorkshop(
  workshopData: Partial<Workshop>,
  organizerId: string
): Promise<Workshop> {
  const workshop = await createWorkshop({
    ...workshopData,
    lifecycle_status: 'closed',
    modified_date_flag: false,
    modified_location_flag: false,
  }, organizerId);

  await logHistoryEvent(
    workshop.id,
    'status_change',
    'Atelier passé déclaré',
    {
      workshop_family_id: workshop.workshop_family_id,
      workshop_type_id: workshop.workshop_type_id,
      classification: workshop.classification_status,
      capacity: workshop.audience_number,
      language: workshop.language,
      is_remote: workshop.is_remote,
      start_at: workshop.start_at,
      end_at: workshop.end_at,
    },
    organizerId,
    null
  );

  return workshop;
}

const IMMUTABLE_FIELDS = ['workshop_type_id', 'workshop_family_id', 'classification_status'];
const ORGANIZER_ONLY_FIELDS = ['organizer', 'co_organizers'];

export async function updateWorkshopAsOrganizer(
  workshopId: string,
  updates: Partial<Workshop>,
  userId: string,
  isMainOrganizer: boolean = false
): Promise<Workshop> {
  const immutableFieldsInUpdate = Object.keys(updates).filter(key =>
    IMMUTABLE_FIELDS.includes(key)
  );

  if (immutableFieldsInUpdate.length > 0) {
    throw new Error(
      `Cannot modify immutable fields after creation: ${immutableFieldsInUpdate.join(', ')}`
    );
  }

  const organizerOnlyFieldsInUpdate = Object.keys(updates).filter(key =>
    ORGANIZER_ONLY_FIELDS.includes(key)
  );

  if (organizerOnlyFieldsInUpdate.length > 0 && !isMainOrganizer) {
    throw new Error(
      `Only the main organizer can modify: ${organizerOnlyFieldsInUpdate.join(', ')}`
    );
  }

  const { data: originalWorkshop, error: fetchError } = await supabase
    .from('workshops')
    .select('*, participations(status)')
    .eq('id', workshopId)
    .maybeSingle();

  if (fetchError || !originalWorkshop) {
    throw new Error('Workshop not found');
  }

  const original = originalWorkshop as any;

  if (updates.audience_number !== undefined) {
    const activeParticipations = (original.participations || []).filter(
      (p: any) => ['inscrit', 'paye', 'en_attente'].includes(p.status)
    );
    const currentParticipantCount = activeParticipations.length;

    if (updates.audience_number < currentParticipantCount) {
      throw new Error(
        `Cannot reduce capacity below current participant count (${currentParticipantCount})`
      );
    }
  }

  const hasDateChange =
    (updates.start_at && updates.start_at !== original.start_at) ||
    (updates.end_at && updates.end_at !== original.end_at);

  const hasLocationChange =
    (updates.location && JSON.stringify(updates.location) !== JSON.stringify(original.location)) ||
    (updates.visio_link && updates.visio_link !== original.visio_link) ||
    (updates.mural_link && updates.mural_link !== original.mural_link);

  if (hasDateChange) {
    await trackDateChange(
      workshopId,
      original.start_at,
      original.end_at,
      updates.start_at || original.start_at,
      updates.end_at || original.end_at,
      userId
    );
  }

  if (hasLocationChange) {
    await trackLocationChange(
      workshopId,
      original.location as WorkshopLocation | null,
      (updates.location as WorkshopLocation | null) || (original.location as WorkshopLocation | null),
      original.is_remote,
      updates.is_remote !== undefined ? updates.is_remote : original.is_remote,
      userId
    );
  }

  const hasCoOrganizerChange =
    updates.co_organizers &&
    JSON.stringify(updates.co_organizers) !== JSON.stringify(original.co_organizers || []);

  if (hasCoOrganizerChange && updates.co_organizers) {
    const oldCoOrganizers = original.co_organizers || [];
    const newCoOrganizers = updates.co_organizers;

    const addedCoOrganizers = newCoOrganizers.filter(
      (id: string) => !oldCoOrganizers.includes(id)
    );

    if (addedCoOrganizers.length > 0) {
      const alerts = addedCoOrganizers.map((coOrgId: string) => ({
        user_id: coOrgId,
        workshop_id: workshopId,
      }));

      await (supabase.from('workshop_co_organizer_alerts') as any).insert(alerts);
    }
  }

  const { data, error } = await (supabase
    .from('workshops') as any)
    .update(updates)
    .eq('id', workshopId)
    .select()
    .single();

  if (error) throw error;

  // Log field edits for non-date, non-location changes
  // Date and location changes are already logged by trackDateChange and trackLocationChange
  const fieldsToSkip = ['updated_at', 'start_at', 'end_at', 'location', 'date_change_history', 'location_change_history', 'modified_date_flag', 'modified_location_flag'];

  for (const [key, value] of Object.entries(updates)) {
    if (!fieldsToSkip.includes(key)) {
      const oldValue = original[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        // Create user-friendly descriptions
        let description = `${key} modifié`;
        if (key === 'language') {
          const oldLang = oldValue ? String(oldValue).toUpperCase() : 'N/A';
          const newLang = String(value).toUpperCase();
          description = `Langue changée de ${oldLang} à ${newLang}`;
        } else if (key === 'title') {
          description = `Titre modifié`;
        } else if (key === 'description') {
          description = `Description modifiée`;
        } else if (key === 'audience_number') {
          description = `Capacité changée de ${oldValue} à ${value} participants`;
        } else if (key === 'is_remote') {
          description = value ? `Format changé en distanciel` : `Format changé en présentiel`;
        } else if (key === 'visio_link') {
          description = `Lien visioconférence modifié`;
        } else if (key === 'mural_link') {
          description = `Lien Mural modifié`;
        } else if (key === 'organizer') {
          description = `Organisateur principal changé`;
        } else if (key === 'co_organizers') {
          description = `Co-organisateurs modifiés`;
        } else if (key === 'extra_duration_minutes') {
          description = `Durée prolongée de ${value} minutes`;
        }

        await logHistoryEvent(
          workshopId,
          'field_edit',
          description,
          { field: key, old_value: oldValue, new_value: value },
          userId,
          null
        );
      }
    }
  }

  return data as Workshop;
}

export async function updateWorkshop(
  workshopId: string,
  updates: Partial<Workshop>,
  originalWorkshop?: Workshop
): Promise<Workshop> {
  let finalUpdates = { ...updates };

  if (originalWorkshop) {
    if (
      updates.start_at &&
      updates.start_at !== originalWorkshop.start_at
    ) {
      finalUpdates.modified_date_flag = true;
    }
    if (
      updates.end_at &&
      updates.end_at !== originalWorkshop.end_at
    ) {
      finalUpdates.modified_date_flag = true;
    }

    if (
      updates.location &&
      JSON.stringify(updates.location) !== JSON.stringify(originalWorkshop.location)
    ) {
      finalUpdates.modified_location_flag = true;
    }

    if (
      updates.is_remote !== undefined &&
      updates.is_remote !== originalWorkshop.is_remote
    ) {
      finalUpdates.modified_location_flag = true;
    }
  }

  const { data, error } = await (supabase
    .from('workshops') as any)
    .update(finalUpdates)
    .eq('id', workshopId)
    .select()
    .single();

  if (error) throw error;
  return data as Workshop;
}

export async function addParticipant(
  workshopId: string,
  userId: string,
  ticketType: 'normal' | 'reduit' | 'gratuit' | 'pro',
  pricePaid: number,
  organizerId: string,
  attended?: boolean,
  skipHistoryLog: boolean = false
): Promise<Participation> {
  const { data: workshop, error: workshopError } = await supabase
    .from('workshops')
    .select('audience_number, client_id, participations(status)')
    .eq('id', workshopId)
    .maybeSingle();

  if (workshopError || !workshop) {
    throw new Error('Workshop not found');
  }

  const workshopData = workshop as any;
  const activeParticipations = (workshopData.participations || []).filter(
    (p: any) => ['inscrit', 'paye', 'en_attente'].includes(p.status)
  );

  if (activeParticipations.length >= workshopData.audience_number) {
    throw new Error('Workshop is full. No remaining seats available.');
  }

  const status = pricePaid > 0 ? 'paye' : 'inscrit';
  const paymentStatus = pricePaid > 0 ? 'paid' : 'none';

  const { data, error } = await (supabase
    .from('participations') as any)
    .insert({
      workshop_id: workshopId,
      user_id: userId,
      client_id: workshopData.client_id,
      status,
      payment_status: paymentStatus,
      ticket_type: ticketType,
      price_paid: pricePaid,
      attended: attended !== undefined ? attended : null,
      confirmation_date: new Date().toISOString(),
      date_confirmation_version: 0,
      location_confirmation_version: 0,
    })
    .select()
    .single();

  if (error) throw error;

  if (!skipHistoryLog) {
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (user) {
      const userData = user as any;
      await logHistoryEvent(
        workshopId,
        'participant_add',
        `${userData.first_name} ${userData.last_name} ajouté à l'atelier`,
        {
          user_id: userId,
          user_email: userData.email,
          ticket_type: ticketType,
          price_paid: pricePaid,
          status,
        },
        organizerId,
        userId
      );
    }
  }

  return data as Participation;
}

export async function addParticipantsBatch(
  workshopId: string,
  participants: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  }>,
  ticketType: 'normal' | 'reduit' | 'gratuit' | 'pro',
  pricePaid: number,
  organizerId: string,
  attended?: boolean
): Promise<Participation[]> {
  const results: Participation[] = [];

  for (const participant of participants) {
    const participation = await addParticipant(
      workshopId,
      participant.userId,
      ticketType,
      pricePaid,
      organizerId,
      attended,
      true
    );
    results.push(participation);
  }

  if (participants.length > 0) {
    const { data: organizer } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', organizerId)
      .maybeSingle();

    const organizerName = organizer
      ? `${(organizer as any).first_name} ${(organizer as any).last_name}`
      : 'L\'organisateur';

    const participantNames = participants.map(p => `${p.firstName} ${p.lastName}`);
    let description: string;

    if (participantNames.length === 1) {
      description = `${organizerName} a ajouté à l'atelier : ${participantNames[0]}`;
    } else if (participantNames.length === 2) {
      description = `${organizerName} a ajouté à l'atelier : ${participantNames[0]} et ${participantNames[1]}`;
    } else {
      const lastParticipant = participantNames[participantNames.length - 1];
      const otherParticipants = participantNames.slice(0, participantNames.length - 1).join(', ');
      description = `${organizerName} a ajouté à l'atelier : ${otherParticipants} et ${lastParticipant}`;
    }

    await logHistoryEvent(
      workshopId,
      'participant_add',
      description,
      {
        participant_count: participants.length,
        participants: participants.map(p => ({
          user_id: p.userId,
          name: `${p.firstName} ${p.lastName}`,
          email: p.email,
        })),
        ticket_type: ticketType,
        price_paid: pricePaid,
      },
      organizerId,
      null
    );
  }

  return results;
}

export async function removeParticipant(
  participationId: string,
  workshopId: string,
  userId: string
): Promise<void> {
  const { data: participation, error: fetchError } = await supabase
    .from('participations')
    .select('*, user:users(first_name, last_name, email)')
    .eq('id', participationId)
    .maybeSingle();

  if (fetchError || !participation) {
    throw new Error('Participation not found');
  }

  const partData = participation as any;

  if (partData.payment_status === 'paid' && partData.status !== 'rembourse') {
    throw new Error('Cannot remove paid participant without refund. Please refund first.');
  }

  const { error } = await supabase
    .from('participations')
    .delete()
    .eq('id', participationId);

  if (error) throw error;

  const { data: organizer } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  const organizerName = organizer
    ? `${(organizer as any).first_name} ${(organizer as any).last_name}`
    : 'L\'organisateur';

  const participantUserId = partData.user_id;
  await logHistoryEvent(
    workshopId,
    'participant_remove',
    `${organizerName} a retiré de l'atelier : ${partData.user.first_name} ${partData.user.last_name}`,
    {
      participation_id: participationId,
      user_email: partData.user.email,
      participant_name: `${partData.user.first_name} ${partData.user.last_name}`,
      status: partData.status,
    },
    userId,
    participantUserId
  );
}


export async function markAllAttended(workshopId: string): Promise<void> {
  const { error } = await (supabase
    .from('participations') as any)
    .update({ attended: true })
    .eq('workshop_id', workshopId)
    .in('status', ['inscrit', 'paye']);

  if (error) throw error;
}

export async function cancelParticipation(
  participationId: string,
  workshopId: string,
  userId: string
): Promise<void> {
  const { data: participation, error: fetchError } = await supabase
    .from('participations')
    .select('*, user:users(first_name, last_name, email)')
    .eq('id', participationId)
    .maybeSingle();

  if (fetchError || !participation) {
    throw new Error('Participation not found');
  }

  const { error } = await (supabase
    .from('participations') as any)
    .update({
      status: 'annule',
    })
    .eq('id', participationId);

  if (error) throw error;

  const { data: organizer } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  const organizerName = organizer
    ? `${(organizer as any).first_name} ${(organizer as any).last_name}`
    : 'L\'organisateur';

  const user = (participation as any).user;
  const participantUserId = (participation as any).user_id;
  await logHistoryEvent(
    workshopId,
    'participant_remove',
    `${organizerName} a annulé la participation de ${user.first_name} ${user.last_name}`,
    {
      participation_id: participationId,
      user_email: user.email,
      participant_name: `${user.first_name} ${user.last_name}`,
      status: 'annule',
    },
    userId,
    participantUserId
  );
}

export async function getOrCreateUser(
  email: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingUser) {
    return (existingUser as any).id;
  }

  const { data: newUser, error: insertError } = await (supabase
    .from('users') as any)
    .insert({
      email: normalizedEmail,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      status_labels: [],
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!newUser) throw new Error('Failed to create user');

  return (newUser as any).id;
}

export async function reinscribeParticipant(
  participationId: string,
  workshopId: string,
  userId: string
): Promise<void> {
  const { data: participation, error: fetchError } = await supabase
    .from('participations')
    .select('*, user:users(first_name, last_name, email)')
    .eq('id', participationId)
    .maybeSingle();

  if (fetchError || !participation) {
    throw new Error('Participation not found');
  }

  const partData = participation as any;

  if (!['rembourse', 'annule'].includes(partData.status)) {
    throw new Error('Can only re-inscribe cancelled or refunded participants');
  }

  const { error } = await (supabase
    .from('participations') as any)
    .update({
      status: 'inscrit',
      payment_status: 'none',
    })
    .eq('id', participationId);

  if (error) throw error;

  const participantUserId = partData.user_id;
  
  // Get actor name for history log
  const { data: actorData } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', userId)
    .single();

  const actorName = actorData 
    ? `${actorData.first_name} ${actorData.last_name}`
    : 'Organisateur';

  await logHistoryEvent(
    workshopId,
    'participant_reinscribe',
    `${actorName} a réinscrit à l'atelier : ${partData.user.first_name} ${partData.user.last_name}`,
    {
      participation_id: participationId,
      user_email: partData.user.email,
      previous_status: partData.status,
      new_status: 'inscrit',
    },
    userId,
    participantUserId
  );
}

export function generateRegistrationUrl(
  workshopId: string,
  firstName: string,
  lastName: string,
  email: string
): string {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    first_name: firstName,
    last_name: lastName,
    email: email,
  });
  return `${baseUrl}/workshops/${workshopId}/register?${params.toString()}`;
}
