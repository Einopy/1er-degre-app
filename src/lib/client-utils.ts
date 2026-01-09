import type { User, Client, ClientAdmin } from './database.types';
import { supabase } from './supabase';
import { USER_COLUMNS_COMPACT } from './user-columns';

export async function getAdminClientIds(user: User | null): Promise<string[]> {
  if (!user) return [];

  try {
    const { data, error } = await (supabase
      .from('client_admins') as any)
      .select('client_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching admin clients:', error);
      return [];
    }

    return (data || []).map((ca: any) => ca.client_id);
  } catch (error) {
    console.error('Error in getAdminClientIds:', error);
    return [];
  }
}

export async function isClientAdmin(user: User | null, clientId: string): Promise<boolean> {
  if (!user) return false;

  try {
    const { data, error } = await (supabase
      .from('client_admins') as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      console.error('Error checking client admin status:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Error in isClientAdmin:', error);
    return false;
  }
}

export async function getAdminClients(user: User | null): Promise<Client[]> {
  if (!user) return [];

  try {
    const { data, error } = await (supabase
      .from('client_admins') as any)
      .select('client:clients(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching admin clients:', error);
      return [];
    }

    return ((data || []) as any[])
      .map((ca: any) => ca.client)
      .filter((client: any): client is Client => client !== null);
  } catch (error) {
    console.error('Error in getAdminClients:', error);
    return [];
  }
}

export async function getAllClients(): Promise<Client[]> {
  try {
    const { data, error } = await (supabase
      .from('clients') as any)
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching all clients:', error);
      return [];
    }

    return (data || []) as Client[];
  } catch (error) {
    console.error('Error in getAllClients:', error);
    return [];
  }
}

export async function getClientBySlug(slug: string): Promise<Client | null> {
  try {
    const { data, error } = await (supabase
      .from('clients') as any)
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching client by slug:', error);
      return null;
    }

    return data as Client | null;
  } catch (error) {
    console.error('Error in getClientBySlug:', error);
    return null;
  }
}

export async function getClientAdmins(clientId: string): Promise<(ClientAdmin & { user: User })[]> {
  try {
    const { data, error } = await (supabase
      .from('client_admins') as any)
      .select(`
        *,
        user:users(
          id,
          auth_user_id,
          email,
          first_name,
          last_name,
          phone,
          birthdate,
          language_animation,
          language_animation_codes,
          outside_animation,
          signed_contract,
          signed_contract_year,
          stripe_customer_id,
          billing_address,
          shipping_address,
          status_labels,
          is_super_admin,
          consent_transactional,
          consent_marketing
        )
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client admins:', error);
      return [];
    }

    return (data || []) as (ClientAdmin & { user: User })[];
  } catch (error) {
    console.error('Error in getClientAdmins:', error);
    return [];
  }
}

export async function addClientAdmin(clientId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('client_admins') as any)
      .insert({
        client_id: clientId,
        user_id: userId,
        role: 'admin',
      });

    if (error) {
      console.error('Error adding client admin:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addClientAdmin:', error);
    return false;
  }
}

export async function removeClientAdmin(clientId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('client_admins') as any)
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing client admin:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeClientAdmin:', error);
    return false;
  }
}

export async function createClient(client: {
  slug: string;
  name: string;
  logo_url?: string;
  is_active?: boolean;
}): Promise<Client | null> {
  try {
    const { data, error } = await (supabase
      .from('clients') as any)
      .insert(client)
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return null;
    }

    return data as Client;
  } catch (error) {
    console.error('Error in createClient:', error);
    return null;
  }
}

export async function updateClient(
  clientId: string,
  updates: Partial<Pick<Client, 'name' | 'slug' | 'logo_url' | 'primary_logo_url' | 'secondary_logo_url' | 'favicon_url' | 'is_active'>>
): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('clients') as any)
      .update(updates)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateClient:', error);
    return false;
  }
}

export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('clients') as any)
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteClient:', error);
    return false;
  }
}

export async function uploadClientLogo(file: File, clientId: string): Promise<string | null> {
  try {
    console.log('Starting logo upload:', { fileName: file.name, fileSize: file.size, clientId });

    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Uploading to path:', filePath);

    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error details:', {
        message: error.message,
        error: error,
      });
      return null;
    }

    if (!data || !data.path) {
      console.error('Upload succeeded but no path returned');
      return null;
    }

    console.log('Upload successful, getting public URL for:', data.path);

    const { data: publicUrlData } = supabase.storage
      .from('client-logos')
      .getPublicUrl(data.path);

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadClientLogo:', error);
    return null;
  }
}

export async function deleteClientLogo(logoUrl: string): Promise<boolean> {
  try {
    const path = logoUrl.split('/client-logos/').pop();
    if (!path) return false;

    const { error } = await supabase.storage
      .from('client-logos')
      .remove([path]);

    if (error) {
      console.error('Error deleting logo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteClientLogo:', error);
    return false;
  }
}

export async function uploadPrimaryLogo(file: File, clientId: string): Promise<string | null> {
  try {
    console.log('Starting primary logo upload:', { fileName: file.name, fileSize: file.size, clientId });

    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}_primary_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Uploading to path:', filePath);

    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error details:', {
        message: error.message,
        error: error,
      });
      return null;
    }

    if (!data || !data.path) {
      console.error('Upload succeeded but no path returned');
      return null;
    }

    console.log('Upload successful, getting public URL for:', data.path);

    const { data: publicUrlData } = supabase.storage
      .from('client-logos')
      .getPublicUrl(data.path);

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadPrimaryLogo:', error);
    return null;
  }
}

export async function uploadSecondaryLogo(file: File, clientId: string): Promise<string | null> {
  try {
    console.log('Starting secondary logo upload:', { fileName: file.name, fileSize: file.size, clientId });

    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}_secondary_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Uploading to path:', filePath);

    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error details:', {
        message: error.message,
        error: error,
      });
      return null;
    }

    if (!data || !data.path) {
      console.error('Upload succeeded but no path returned');
      return null;
    }

    console.log('Upload successful, getting public URL for:', data.path);

    const { data: publicUrlData } = supabase.storage
      .from('client-logos')
      .getPublicUrl(data.path);

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadSecondaryLogo:', error);
    return null;
  }
}

export async function uploadFavicon(file: File, clientId: string): Promise<string | null> {
  try {
    console.log('Starting favicon upload:', { fileName: file.name, fileSize: file.size, clientId });

    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}_favicon_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log('Uploading to path:', filePath);

    const { data, error } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error details:', {
        message: error.message,
        error: error,
      });
      return null;
    }

    if (!data || !data.path) {
      console.error('Upload succeeded but no path returned');
      return null;
    }

    console.log('Upload successful, getting public URL for:', data.path);

    const { data: publicUrlData } = supabase.storage
      .from('client-logos')
      .getPublicUrl(data.path);

    console.log('Public URL generated:', publicUrlData.publicUrl);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadFavicon:', error);
    return null;
  }
}

export async function createUserWithAdmin(
  clientId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const existingUser = await (supabase
      .from('users') as any)
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser.data) {
      return {
        success: false,
        error: 'Un utilisateur avec cet email existe déjà',
      };
    }

    const { data: userData, error: userError } = await (supabase
      .from('users') as any)
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        roles: ['admin'],
        consent_transactional: true,
        consent_marketing: false,
        status_labels: [],
        signed_contract: false,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return {
        success: false,
        error: 'Erreur lors de la création de l\'utilisateur',
      };
    }

    const addAdminResult = await addClientAdmin(clientId, userData.id);

    if (!addAdminResult) {
      return {
        success: false,
        error: 'Utilisateur créé mais erreur lors de l\'ajout comme admin',
      };
    }

    return {
      success: true,
      userId: userData.id,
    };
  } catch (error) {
    console.error('Error in createUserWithAdmin:', error);
    return {
      success: false,
      error: 'Erreur inattendue lors de la création',
    };
  }
}

export async function searchUsersByEmail(query: string): Promise<User[]> {
  try {
    const { data, error } = await (supabase
      .from('users') as any)
      .select(USER_COLUMNS_COMPACT)
      .ilike('email', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return (data || []) as User[];
  } catch (error) {
    console.error('Error in searchUsersByEmail:', error);
    return [];
  }
}

export async function getUsersNotAdminForClient(clientId: string, searchQuery?: string): Promise<User[]> {
  try {
    const { data: clientAdmins, error: adminError } = await (supabase
      .from('client_admins') as any)
      .select('user_id')
      .eq('client_id', clientId);

    if (adminError) {
      console.error('Error fetching client admins:', adminError);
      return [];
    }

    const adminUserIds = (clientAdmins || []).map((ca: any) => ca.user_id);

    let query = supabase.from('users').select(USER_COLUMNS_COMPACT);

    if (adminUserIds.length > 0) {
      query = query.not('id', 'in', `(${adminUserIds.join(',')})`);
    }

    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('email', `%${searchQuery}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return (data || []) as User[];
  } catch (error) {
    console.error('Error in getUsersNotAdminForClient:', error);
    return [];
  }
}

