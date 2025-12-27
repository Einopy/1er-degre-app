-- Seed Data Script: 10 Users and 10 Workshops
-- This script creates mock data for testing the workshop detail page

-- Create 10 users with diverse profiles
INSERT INTO users (id, email, first_name, last_name, phone, birthdate, language_animation, outside_animation, signed_contract, signed_contract_year, roles, status_labels, tenant_id)
VALUES
  ('user-001', 'sophie.martin@example.com', 'Sophie', 'Martin', '+33612345601', '1985-03-15', 'FR', 'Oui', true, 2024, ARRAY['organizer', 'participant'], ARRAY['active'], '1erdegre'),
  ('user-002', 'pierre.dubois@example.com', 'Pierre', 'Dubois', '+33612345602', '1990-07-22', 'FR', 'Non', true, 2024, ARRAY['organizer', 'participant'], ARRAY['active'], '1erdegre'),
  ('user-003', 'marie.bernard@example.com', 'Marie', 'Bernard', '+33612345603', '1988-11-08', 'FR', 'Oui', true, 2024, ARRAY['participant'], ARRAY['active'], '1erdegre'),
  ('user-004', 'lucas.petit@example.com', 'Lucas', 'Petit', '+33612345604', '1992-05-19', 'EN', 'Oui', true, 2024, ARRAY['organizer', 'co_organizer'], ARRAY['active'], '1erdegre'),
  ('user-005', 'emma.rousseau@example.com', 'Emma', 'Rousseau', '+33612345605', '1987-09-30', 'FR', 'Non', true, 2024, ARRAY['co_organizer', 'participant'], ARRAY['active'], '1erdegre'),
  ('user-006', 'thomas.laurent@example.com', 'Thomas', 'Laurent', '+33612345606', '1991-02-14', 'FR', 'Oui', true, 2024, ARRAY['co_organizer'], ARRAY['active'], '1erdegre'),
  ('user-007', 'camille.simon@example.com', 'Camille', 'Simon', '+33612345607', '1989-12-03', 'EN', 'Oui', true, 2024, ARRAY['participant'], ARRAY['active'], '1erdegre'),
  ('user-008', 'julien.michel@example.com', 'Julien', 'Michel', '+33612345608', '1993-08-27', 'FR', 'Non', true, 2024, ARRAY['organizer'], ARRAY['active'], '1erdegre'),
  ('user-009', 'lea.lefevre@example.com', 'Léa', 'Lefèvre', '+33612345609', '1986-06-11', 'FR', 'Oui', true, 2024, ARRAY['co_organizer', 'participant'], ARRAY['active'], '1erdegre'),
  ('user-010', 'nicolas.moreau@example.com', 'Nicolas', 'Moreau', '+33612345610', '1994-04-05', 'EN', 'Oui', true, 2024, ARRAY['participant'], ARRAY['active'], '1erdegre')
ON CONFLICT (id) DO NOTHING;

-- Create 10 diverse workshops
INSERT INTO workshops (
  id, title, description, workshop, type, language, organizer, co_organizers,
  lifecycle_status, classification_status, audience_number, is_remote,
  visio_link, mural_link, location, start_at, end_at, extra_duration_minutes,
  modified_date_flag, modified_location_flag, tenant_id
)
VALUES
  -- Workshop 1: FDFP Formation in Paris (with co-organizers)
  (
    'workshop-001',
    'Fresque du Faire ensemble - Introduction',
    'Découvrez les bases de la collaboration et du faire ensemble à travers un atelier participatif et ludique. Cet atelier vous permettra de comprendre les enjeux de la collaboration et de développer vos compétences relationnelles.',
    'FDFP',
    'formation',
    'Français',
    'user-001',
    ARRAY['user-005', 'user-006', 'user-009'],
    'active',
    'benevole_grand_public',
    20,
    false,
    NULL,
    'https://mural.co/workshop-001',
    '{"venue_name": "Espace Collaboration Paris", "street": "15 Rue de la République", "street2": null, "city": "Paris", "postal_code": "75001", "region": "Île-de-France", "country": "France"}',
    '2025-11-15 14:00:00+00',
    '2025-11-15 17:00:00+00',
    0,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 2: HD Remote Formation Pro
  (
    'workshop-002',
    'Hackons le Débat - Techniques avancées',
    'Approfondissez vos compétences en débat constructif et en facilitation de discussions complexes. Atelier professionnel pour entreprises et organisations.',
    'HD',
    'formation_pro_1',
    'Français',
    'user-002',
    ARRAY['user-004'],
    'active',
    'externe_entreprise',
    15,
    true,
    'https://meet.google.com/abc-defg-hij',
    'https://mural.co/workshop-002',
    NULL,
    '2025-11-20 09:00:00+00',
    '2025-11-20 11:30:00+00',
    30,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 3: FDFP in Lyon (low seats)
  (
    'workshop-003',
    'Fresque du Faire - Niveau avancé',
    'Pour les participants ayant déjà suivi une formation initiale. Explorez des techniques avancées de facilitation et de co-construction.',
    'FDFP',
    'formation_pro_2',
    'Français',
    'user-004',
    ARRAY['user-001'],
    'active',
    'interne_asso',
    12,
    false,
    NULL,
    NULL,
    '{"venue_name": "Maison des Associations", "street": "42 Avenue Jean Jaurès", "street2": "Bâtiment C", "city": "Lyon", "postal_code": "69007", "region": "Auvergne-Rhône-Alpes", "country": "France"}',
    '2025-11-25 10:00:00+00',
    '2025-11-25 12:30:00+00',
    0,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 4: HD Formation formateur in Bordeaux
  (
    'workshop-004',
    'Hackons le Débat - Formation de formateurs',
    'Devenez formateur certifié pour animer des ateliers Hackons le Débat. Formation intensive de 4 heures.',
    'HD',
    'formation_formateur',
    'Français',
    'user-008',
    ARRAY['user-002', 'user-006'],
    'active',
    'interne_profs',
    10,
    false,
    NULL,
    'https://mural.co/workshop-004',
    '{"venue_name": "Centre de Formation Bordeaux", "street": "88 Cours Victor Hugo", "street2": null, "city": "Bordeaux", "postal_code": "33000", "region": "Nouvelle-Aquitaine", "country": "France"}',
    '2025-12-01 13:00:00+00',
    '2025-12-01 17:00:00+00',
    0,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 5: FDFP Remote English
  (
    'workshop-005',
    'Fresque du Faire - English Workshop',
    'Discover collaborative practices and collective intelligence through an interactive workshop. Conducted entirely in English.',
    'FDFP',
    'formation',
    'Anglais',
    'user-004',
    ARRAY['user-007'],
    'active',
    'externe_etudiants_alumnis',
    25,
    true,
    'https://zoom.us/j/123456789',
    'https://mural.co/workshop-005',
    NULL,
    '2025-12-05 15:00:00+00',
    '2025-12-05 18:00:00+00',
    0,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 6: HD Retex in Marseille (with extra time)
  (
    'workshop-006',
    'Hackons le Débat - Retour d''expérience',
    'Atelier de retour d''expérience pour les facilitateurs ayant déjà animé plusieurs sessions. Partagez vos pratiques et enrichissez votre approche.',
    'HD',
    'formation_retex',
    'Français',
    'user-001',
    ARRAY['user-002', 'user-004', 'user-005'],
    'active',
    'interne_asso',
    18,
    false,
    NULL,
    NULL,
    '{"venue_name": "La Friche Belle de Mai", "street": "41 Rue Jobin", "street2": null, "city": "Marseille", "postal_code": "13003", "region": "Provence-Alpes-Côte d''Azur", "country": "France"}',
    '2025-12-10 14:30:00+00',
    '2025-12-10 16:30:00+00',
    30,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 7: FDFP in Toulouse (date modified)
  (
    'workshop-007',
    'Fresque du Faire - Spécial Élus',
    'Atelier adapté aux élus et décideurs publics. Découvrez comment intégrer les pratiques collaboratives dans la gouvernance locale.',
    'FDFP',
    'formation',
    'Français',
    'user-002',
    ARRAY[],
    'active',
    'externe_elus',
    14,
    false,
    NULL,
    'https://mural.co/workshop-007',
    '{"venue_name": "Hôtel de Ville", "street": "Place du Capitole", "street2": null, "city": "Toulouse", "postal_code": "31000", "region": "Occitanie", "country": "France"}',
    '2025-12-12 16:00:00+00',
    '2025-12-12 19:00:00+00',
    0,
    true,
    false,
    '1erdegre'
  ),

  -- Workshop 8: HD Formation Pro in Lille (almost full)
  (
    'workshop-008',
    'Hackons le Débat - Management par le débat',
    'Formation professionnelle pour managers et responsables RH. Apprenez à utiliser le débat comme outil de management et de prise de décision collective.',
    'HD',
    'formation_pro_2',
    'Français',
    'user-008',
    ARRAY['user-001', 'user-009'],
    'active',
    'externe_entreprise',
    16,
    false,
    NULL,
    'https://mural.co/workshop-008',
    '{"venue_name": "Euratechnologies", "street": "165 Avenue de Bretagne", "street2": null, "city": "Lille", "postal_code": "59000", "region": "Hauts-de-France", "country": "France"}',
    '2025-12-18 09:30:00+00',
    '2025-12-18 12:00:00+00',
    0,
    false,
    false,
    '1erdegre'
  ),

  -- Workshop 9: FDFP in Nantes (location modified)
  (
    'workshop-009',
    'Fresque du Faire - Agents publics',
    'Atelier dédié aux agents de la fonction publique. Découvrez comment transformer vos pratiques professionnelles grâce à l''intelligence collective.',
    'FDFP',
    'formation',
    'Français',
    'user-001',
    ARRAY['user-006'],
    'active',
    'externe_agents',
    22,
    false,
    NULL,
    NULL,
    '{"venue_name": "Lieu Unique", "street": "2 Rue de la Biscuiterie", "street2": null, "city": "Nantes", "postal_code": "44000", "region": "Pays de la Loire", "country": "France"}',
    '2025-12-22 14:00:00+00',
    '2025-12-22 17:00:00+00',
    0,
    false,
    true,
    '1erdegre'
  ),

  -- Workshop 10: HD Remote with extra time
  (
    'workshop-010',
    'Hackons le Débat - Introduction en ligne',
    'Découvrez les techniques de débat constructif dans un format 100% en ligne. Session interactive avec exercices pratiques en petits groupes.',
    'HD',
    'formation',
    'Français',
    'user-004',
    ARRAY['user-005', 'user-009'],
    'active',
    'benevole_grand_public',
    30,
    true,
    'https://meet.google.com/xyz-abcd-efg',
    'https://mural.co/workshop-010',
    NULL,
    '2026-01-08 18:00:00+00',
    '2026-01-08 21:15:00+00',
    15,
    false,
    false,
    '1erdegre'
  )
ON CONFLICT (id) DO NOTHING;

-- Add some participations to show varying capacity levels
INSERT INTO participations (
  id, user_id, workshop_id, status, payment_status, ticket_type, price_paid,
  confirmation_date, mail_disabled, attended, tenant_id
)
VALUES
  -- Workshop 3 (low seats: 9 participants out of 12)
  ('part-001', 'user-003', 'workshop-003', 'paye', 'paid', 'normal', 30.00, '2025-10-01 10:00:00+00', false, NULL, '1erdegre'),
  ('part-002', 'user-007', 'workshop-003', 'paye', 'paid', 'reduit', 20.00, '2025-10-02 11:00:00+00', false, NULL, '1erdegre'),
  ('part-003', 'user-010', 'workshop-003', 'paye', 'paid', 'normal', 30.00, '2025-10-03 12:00:00+00', false, NULL, '1erdegre'),
  ('part-004', 'user-005', 'workshop-003', 'inscrit', 'pending', 'normal', 30.00, NULL, false, NULL, '1erdegre'),
  ('part-005', 'user-006', 'workshop-003', 'paye', 'paid', 'normal', 30.00, '2025-10-04 13:00:00+00', false, NULL, '1erdegre'),
  ('part-006', 'user-008', 'workshop-003', 'paye', 'paid', 'reduit', 20.00, '2025-10-05 14:00:00+00', false, NULL, '1erdegre'),
  ('part-007', 'user-009', 'workshop-003', 'paye', 'paid', 'normal', 30.00, '2025-10-06 15:00:00+00', false, NULL, '1erdegre'),
  ('part-008', 'user-002', 'workshop-003', 'en_attente', 'none', 'normal', 30.00, NULL, false, NULL, '1erdegre'),
  ('part-009', 'user-004', 'workshop-003', 'paye', 'paid', 'normal', 30.00, '2025-10-07 16:00:00+00', false, NULL, '1erdegre'),

  -- Workshop 8 (almost full: 14 participants out of 16)
  ('part-010', 'user-003', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-08 10:00:00+00', false, NULL, '1erdegre'),
  ('part-011', 'user-004', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-09 11:00:00+00', false, NULL, '1erdegre'),
  ('part-012', 'user-005', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-10 12:00:00+00', false, NULL, '1erdegre'),
  ('part-013', 'user-006', 'workshop-008', 'inscrit', 'pending', 'pro', 100.00, NULL, false, NULL, '1erdegre'),
  ('part-014', 'user-007', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-11 13:00:00+00', false, NULL, '1erdegre'),
  ('part-015', 'user-010', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-12 14:00:00+00', false, NULL, '1erdegre'),
  ('part-016', 'user-002', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-13 15:00:00+00', false, NULL, '1erdegre'),
  ('part-017', 'user-003', 'workshop-008', 'en_attente', 'none', 'pro', 100.00, NULL, false, NULL, '1erdegre'),
  ('part-018', 'user-009', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-14 16:00:00+00', false, NULL, '1erdegre'),
  ('part-019', 'user-007', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-15 17:00:00+00', false, NULL, '1erdegre'),
  ('part-020', 'user-006', 'workshop-008', 'inscrit', 'pending', 'pro', 100.00, NULL, false, NULL, '1erdegre'),
  ('part-021', 'user-004', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-16 18:00:00+00', false, NULL, '1erdegre'),
  ('part-022', 'user-005', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-17 19:00:00+00', false, NULL, '1erdegre'),
  ('part-023', 'user-002', 'workshop-008', 'paye', 'paid', 'pro', 100.00, '2025-10-18 20:00:00+00', false, NULL, '1erdegre'),

  -- Workshop 1 (moderate capacity: 5 participants out of 20)
  ('part-024', 'user-003', 'workshop-001', 'paye', 'paid', 'gratuit', 0.00, '2025-10-19 10:00:00+00', false, NULL, '1erdegre'),
  ('part-025', 'user-007', 'workshop-001', 'paye', 'paid', 'gratuit', 0.00, '2025-10-20 11:00:00+00', false, NULL, '1erdegre'),
  ('part-026', 'user-010', 'workshop-001', 'inscrit', 'none', 'gratuit', 0.00, NULL, false, NULL, '1erdegre'),
  ('part-027', 'user-002', 'workshop-001', 'paye', 'paid', 'gratuit', 0.00, '2025-10-21 12:00:00+00', false, NULL, '1erdegre'),
  ('part-028', 'user-004', 'workshop-001', 'paye', 'paid', 'gratuit', 0.00, '2025-10-22 13:00:00+00', false, NULL, '1erdegre')
ON CONFLICT (id) DO NOTHING;
