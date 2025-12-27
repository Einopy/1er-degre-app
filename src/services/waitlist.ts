import { supabase } from '@/lib/supabase';

export interface WaitlistFormData {
  email: string;
  workshopFamily: string;
  city: string;
}

export async function createWaitlistEntry(
  data: WaitlistFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const entry = {
      email: data.email,
      workshop_family: data.workshopFamily,
      city: data.city,
      radius_km: 35,
      status: 'waiting' as const,
      tenant_id: '1er-Degré',
    };

    const { error } = await supabase
      .from('waitlist_entries')
      .insert(entry as any);

    if (error) {
      console.error('Error creating waitlist entry:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createWaitlistEntry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
