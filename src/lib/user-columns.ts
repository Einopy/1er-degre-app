// Liste explicite des colonnes de la table users (sans 'roles' qui n'existe pas)
export const USER_COLUMNS = `
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
  password_hash,
  consent_transactional,
  consent_marketing,
  consent_updated_at,
  tenant_id,
  created_at,
  updated_at
`;

// Version compacte pour les jointures
export const USER_COLUMNS_COMPACT = 'id, auth_user_id, email, first_name, last_name, phone, birthdate, language_animation, language_animation_codes, outside_animation, signed_contract, signed_contract_year, stripe_customer_id, billing_address, shipping_address, status_labels, is_super_admin, password_hash, consent_transactional, consent_marketing, consent_updated_at, tenant_id, created_at, updated_at';
