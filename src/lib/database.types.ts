export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          slug: string
          name: string
          logo_url: string | null
          primary_logo_url: string | null
          secondary_logo_url: string | null
          favicon_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          logo_url?: string | null
          primary_logo_url?: string | null
          secondary_logo_url?: string | null
          favicon_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          logo_url?: string | null
          primary_logo_url?: string | null
          secondary_logo_url?: string | null
          favicon_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      client_admins: {
        Row: {
          id: string
          client_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          user_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          birthdate: string | null
          language_animation: string | null
          language_animation_codes: Json
          outside_animation: string | null
          signed_contract: boolean
          signed_contract_year: number | null
          is_super_admin: boolean
          stripe_customer_id: string | null
          billing_address: Json | null
          shipping_address: Json | null
          status_labels: string[]
          consent_transactional: boolean
          consent_marketing: boolean
          consent_updated_at: string | null
          password_hash: string | null
          auth_user_id: string | null
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          birthdate?: string | null
          language_animation?: string | null
          language_animation_codes?: Json
          outside_animation?: string | null
          signed_contract?: boolean
          signed_contract_year?: number | null
          is_super_admin?: boolean
          stripe_customer_id?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          status_labels?: string[]
          consent_transactional?: boolean
          consent_marketing?: boolean
          consent_updated_at?: string | null
          password_hash?: string | null
          auth_user_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          birthdate?: string | null
          language_animation?: string | null
          language_animation_codes?: Json
          outside_animation?: string | null
          signed_contract?: boolean
          signed_contract_year?: number | null
          is_super_admin?: boolean
          stripe_customer_id?: string | null
          billing_address?: Json | null
          shipping_address?: Json | null
          status_labels?: string[]
          consent_transactional?: boolean
          consent_marketing?: boolean
          consent_updated_at?: string | null
          password_hash?: string | null
          auth_user_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workshops: {
        Row: {
          id: string
          title: string
          description: string | null
          workshop_family_id: string
          workshop_type_id: string
          language: string
          organizer: string
          co_organizers: string[]
          lifecycle_status: 'active' | 'closed' | 'canceled'
          classification_status: string
          audience_number: number
          invoice_number: string | null
          is_remote: boolean
          visio_link: string | null
          mural_link: string | null
          location: Json | null
          start_at: string
          end_at: string
          extra_duration_minutes: number | null
          mail_pre_subject: string | null
          mail_pre_html: string | null
          mail_post_subject: string | null
          mail_post_html: string | null
          modified_date_flag: boolean
          modified_location_flag: boolean
          ics_file_url: string | null
          card_illustration_url: string | null
          date_change_history: Json
          location_change_history: Json
          tenant_id: string
          client_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          workshop_family_id: string
          workshop_type_id: string
          language: string
          organizer: string
          co_organizers?: string[]
          lifecycle_status: 'active' | 'closed' | 'canceled'
          classification_status: string
          audience_number: number
          invoice_number?: string | null
          is_remote?: boolean
          visio_link?: string | null
          mural_link?: string | null
          location?: Json | null
          start_at: string
          end_at: string
          extra_duration_minutes?: number | null
          mail_pre_subject?: string | null
          mail_pre_html?: string | null
          mail_post_subject?: string | null
          mail_post_html?: string | null
          modified_date_flag?: boolean
          modified_location_flag?: boolean
          ics_file_url?: string | null
          card_illustration_url?: string | null
          date_change_history?: Json
          location_change_history?: Json
          tenant_id?: string
          client_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          workshop_family_id?: string
          workshop_type_id?: string
          language?: string
          organizer?: string
          co_organizers?: string[]
          lifecycle_status?: 'active' | 'closed' | 'canceled'
          classification_status?: string
          audience_number?: number
          invoice_number?: string | null
          is_remote?: boolean
          visio_link?: string | null
          mural_link?: string | null
          location?: Json | null
          start_at?: string
          end_at?: string
          extra_duration_minutes?: number | null
          mail_pre_subject?: string | null
          mail_pre_html?: string | null
          mail_post_subject?: string | null
          mail_post_html?: string | null
          modified_date_flag?: boolean
          modified_location_flag?: boolean
          ics_file_url?: string | null
          card_illustration_url?: string | null
          date_change_history?: Json
          location_change_history?: Json
          tenant_id?: string
          client_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      participations: {
        Row: {
          id: string
          user_id: string
          workshop_id: string
          status: 'en_attente' | 'inscrit' | 'paye' | 'rembourse' | 'echange' | 'annule'
          payment_status: 'none' | 'pending' | 'paid' | 'refunded' | 'failed'
          ticket_type: 'normal' | 'reduit' | 'gratuit' | 'pro'
          price_paid: number
          exchange_parent_participation_id: string | null
          invoice_url: string | null
          confirmation_date: string | null
          mail_disabled: boolean
          training_completion: Json | null
          attended: boolean | null
          questionnaire_response_id: string | null
          date_confirmation_version: number
          location_confirmation_version: number
          client_id: string
          tenant_id: string
          created_at: string
          updated_at: string
          is_present: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          workshop_id: string
          client_id: string
          status: 'en_attente' | 'inscrit' | 'paye' | 'rembourse' | 'echange' | 'annule'
          payment_status: 'none' | 'pending' | 'paid' | 'refunded' | 'failed'
          ticket_type: 'normal' | 'reduit' | 'gratuit' | 'pro'
          price_paid: number
          exchange_parent_participation_id?: string | null
          invoice_url?: string | null
          confirmation_date?: string | null
          mail_disabled?: boolean
          training_completion?: Json | null
          attended?: boolean | null
          questionnaire_response_id?: string | null
          date_confirmation_version?: number
          location_confirmation_version?: number
          tenant_id?: string
          created_at?: string
          updated_at?: string
          is_present?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          workshop_id?: string
          client_id?: string
          status?: 'en_attente' | 'inscrit' | 'paye' | 'rembourse' | 'echange' | 'annule'
          payment_status?: 'none' | 'pending' | 'paid' | 'refunded' | 'failed'
          ticket_type?: 'normal' | 'reduit' | 'gratuit' | 'pro'
          price_paid?: number
          exchange_parent_participation_id?: string | null
          invoice_url?: string | null
          confirmation_date?: string | null
          mail_disabled?: boolean
          training_completion?: Json | null
          attended?: boolean | null
          questionnaire_response_id?: string | null
          date_confirmation_version?: number
          location_confirmation_version?: number
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      waitlist_entries: {
        Row: {
          id: string
          email: string
          user_id: string | null
          workshop_family: 'FDFP' | 'HD'
          city: string
          radius_km: number
          status: 'waiting' | 'notified' | 'converted' | 'expired'
          geographic_hint: string | null
          notified_at: string | null
          notified_workshop_id: string | null
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          user_id?: string | null
          workshop_family: 'FDFP' | 'HD'
          city: string
          radius_km?: number
          status: 'waiting' | 'notified' | 'converted' | 'expired'
          geographic_hint?: string | null
          notified_at?: string | null
          notified_workshop_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          user_id?: string | null
          workshop_family?: 'FDFP' | 'HD'
          city?: string
          radius_km?: number
          status?: 'waiting' | 'notified' | 'converted' | 'expired'
          geographic_hint?: string | null
          notified_at?: string | null
          notified_workshop_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          user_id: string | null
          workshop_type: string
          workshop_classification: string
          language: string
          template_type: 'pre' | 'post'
          subject: string
          html_content: string
          is_official: boolean
          official_version: number
          last_viewed_official_version: number
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          workshop_type: string
          workshop_classification?: string
          language: string
          template_type: 'pre' | 'post'
          subject: string
          html_content: string
          is_official?: boolean
          official_version?: number
          last_viewed_official_version?: number
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          workshop_type?: string
          workshop_classification?: string
          language?: string
          template_type?: 'pre' | 'post'
          subject?: string
          html_content?: string
          is_official?: boolean
          official_version?: number
          last_viewed_official_version?: number
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      mail_logs: {
        Row: {
          id: string
          workshop_id: string
          participation_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          email_type: 'pre' | 'post' | 'spontane'
          subject: string
          sent_at: string | null
          delivery_status: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message: string | null
          provider_message_id: string | null
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          participation_id?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          email_type: 'pre' | 'post' | 'spontane'
          subject: string
          sent_at?: string | null
          delivery_status?: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message?: string | null
          provider_message_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          participation_id?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          email_type?: 'pre' | 'post' | 'spontane'
          subject?: string
          sent_at?: string | null
          delivery_status?: 'queued' | 'sent' | 'delivered' | 'failed'
          error_message?: string | null
          provider_message_id?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_emails: {
        Row: {
          id: string
          workshop_id: string
          email_type: 'pre' | 'post' | 'spontane'
          scheduled_at: string
          status: 'pending' | 'processing' | 'sent' | 'failed'
          recipient_count: number
          subject_snapshot: string
          html_snapshot: string
          sent_at: string | null
          error_message: string | null
          tenant_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          email_type: 'pre' | 'post' | 'spontane'
          scheduled_at: string
          status?: 'pending' | 'processing' | 'sent' | 'failed'
          recipient_count?: number
          subject_snapshot: string
          html_snapshot: string
          sent_at?: string | null
          error_message?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          email_type?: 'pre' | 'post' | 'spontane'
          scheduled_at?: string
          status?: 'pending' | 'processing' | 'sent' | 'failed'
          recipient_count?: number
          subject_snapshot?: string
          html_snapshot?: string
          sent_at?: string | null
          error_message?: string | null
          tenant_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workshop_history_logs: {
        Row: {
          id: string
          workshop_id: string
          log_type: 'status_change' | 'field_edit' | 'participant_add' | 'participant_remove' | 'participant_reinscribe' | 'refund' | 'email_sent' | 'date_change' | 'location_change'
          description: string
          metadata: Json
          user_id: string | null
          actor_user_id: string | null
          tenant_id: string
          created_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          log_type: 'status_change' | 'field_edit' | 'participant_add' | 'participant_remove' | 'participant_reinscribe' | 'refund' | 'email_sent' | 'date_change' | 'location_change'
          description: string
          metadata?: Json
          user_id?: string | null
          actor_user_id?: string | null
          tenant_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          log_type?: 'status_change' | 'field_edit' | 'participant_add' | 'participant_remove' | 'participant_reinscribe' | 'refund' | 'email_sent' | 'date_change' | 'location_change'
          description?: string
          metadata?: Json
          user_id?: string | null
          actor_user_id?: string | null
          tenant_id?: string
          created_at?: string
        }
      }
      workshop_families: {
        Row: {
          id: string
          client_id: string
          code: string
          name: string
          description: string | null
          default_duration_minutes: number
          card_illustration_url: string | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          code: string
          name: string
          description?: string | null
          default_duration_minutes?: number
          card_illustration_url?: string | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          code?: string
          name?: string
          description?: string | null
          default_duration_minutes?: number
          card_illustration_url?: string | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      workshop_types: {
        Row: {
          id: string
          client_id: string
          workshop_family_id: string | null
          code: string
          label: string
          default_duration_minutes: number
          is_formation: boolean
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          workshop_family_id?: string | null
          code: string
          label: string
          default_duration_minutes?: number
          is_formation?: boolean
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          workshop_family_id?: string | null
          code?: string
          label?: string
          default_duration_minutes?: number
          is_formation?: boolean
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      role_levels: {
        Row: {
          id: string
          client_id: string
          workshop_family_id: string
          level: number
          internal_key: string
          label: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          workshop_family_id: string
          level: number
          internal_key: string
          label: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          workshop_family_id?: string
          level?: number
          internal_key?: string
          label?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      role_requirements: {
        Row: {
          id: string
          role_level_id: string
          required_workshop_types: Json
          min_workshops_total: number
          min_workshops_online: number
          min_workshops_in_person: number
          min_feedback_count: number
          min_feedback_avg: number
          custom_rules: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_level_id: string
          required_workshop_types?: Json
          min_workshops_total?: number
          min_workshops_online?: number
          min_workshops_in_person?: number
          min_feedback_count?: number
          min_feedback_avg?: number
          custom_rules?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_level_id?: string
          required_workshop_types?: Json
          min_workshops_total?: number
          min_workshops_online?: number
          min_workshops_in_person?: number
          min_feedback_count?: number
          min_feedback_avg?: number
          custom_rules?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      client_languages: {
        Row: {
          id: string
          client_id: string
          workshop_family_id: string | null
          language_code: string
          language_name: string
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          workshop_family_id?: string | null
          language_code: string
          language_name: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          workshop_family_id?: string | null
          language_code?: string
          language_name?: string
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type WorkshopLocation = {
  venue_name: string
  street: string
  street2?: string | null
  city: string
  postal_code: string
  region?: string | null
  country: string
}

export type Workshop = Database['public']['Tables']['workshops']['Row'] & {
  location: WorkshopLocation | null
  remaining_seats?: number
}

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientAdmin = Database['public']['Tables']['client_admins']['Row']
export type Participation = Database['public']['Tables']['participations']['Row']
export type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row']
export type MailLog = Database['public']['Tables']['mail_logs']['Row']
export type ScheduledEmail = Database['public']['Tables']['scheduled_emails']['Row']
export type WorkshopHistoryLog = Database['public']['Tables']['workshop_history_logs']['Row']
export type WorkshopFamily = Database['public']['Tables']['workshop_families']['Row']
export type WorkshopType = Database['public']['Tables']['workshop_types']['Row']
export type RoleLevel = Database['public']['Tables']['role_levels']['Row']
export type RoleRequirement = Database['public']['Tables']['role_requirements']['Row']
export type ClientLanguage = Database['public']['Tables']['client_languages']['Row']
export type UserRoleLevel = {
  id: string
  user_id: string
  role_level_id: string
  granted_at: string
  granted_by: string | null
  created_at: string
  updated_at: string
}
