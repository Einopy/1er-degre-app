# Migration vers Supabase Auth - Guide Complet

## Résumé des changements

L'application a été migrée d'un système d'authentification personnalisé vers Supabase Auth standard.

## Modifications effectuées

### 1. Base de données

**Migration `migrate_to_supabase_auth`:**
- Ajout de la colonne `auth_user_id` dans la table `users`
- Cette colonne lie les utilisateurs custom aux utilisateurs Supabase Auth
- Index créé pour optimiser les requêtes

**Migration `update_all_rls_policies_for_supabase_auth`:**
- Toutes les politiques RLS ont été mises à jour
- Utilisation de `auth.uid()` au lieu de `current_setting('request.jwt.claims')`
- Les politiques utilisent maintenant `auth_user_id` pour lier users et auth.users

### 2. Code Frontend

**`src/services/auth.ts`:**
- `signIn(email, password)` : Utilise `supabase.auth.signInWithPassword()`
- `createPassword(userId, password)` : Crée un auth.user via `supabase.auth.signUp()`
- `signOut()` : Utilise `supabase.auth.signOut()`
- `getUserFromSession()` : Utilise `supabase.auth.getSession()`
- Suppression de la gestion manuelle des sessions (localStorage)

**`src/contexts/AuthContext.tsx`:**
- Écoute des changements d'état auth via `supabase.auth.onAuthStateChange()`
- Synchronisation automatique du profil utilisateur

**`src/pages/Login.tsx`:**
- Mise à jour pour utiliser les nouvelles fonctions d'authentification

## Configuration requise dans Supabase Dashboard

### Désactiver la confirmation d'email

Pour que les utilisateurs puissent se connecter immédiatement après création:

1. Allez dans Supabase Dashboard
2. Naviguez vers **Authentication > Providers > Email**
3. Désactivez "Confirm email"
4. Sauvegardez

### Activer l'autoconfirmation (Alternative)

Si vous préférez garder la confirmation mais l'automatiser:

1. Allez dans **Authentication > URL Configuration**
2. Configurez "Site URL" et "Redirect URLs"

## Migration des utilisateurs existants

### Pour les utilisateurs avec `authenticated = true`

Les utilisateurs existants qui ont déjà un mot de passe devront:

1. **Option A (Recommandé):** Réinitialiser leur mot de passe
   - Créer une fonctionnalité "Mot de passe oublié"
   - Utiliser `supabase.auth.resetPasswordForEmail()`

2. **Option B:** Script de migration manuel
   - Impossible de migrer les mots de passe (ils sont hashés)
   - Nécessite de demander aux utilisateurs de créer un nouveau mot de passe

### Pour les nouveaux utilisateurs

- La création de compte fonctionne automatiquement
- `createPassword()` crée un auth.user et lie les deux tables

## Test de la migration

### 1. Créer un nouveau compte

```typescript
// L'utilisateur remplit le formulaire d'inscription
// Puis crée son mot de passe
await createPassword(userId, 'motdepasse123');
```

### 2. Se connecter

```typescript
const user = await signIn('email@example.com', 'motdepasse123');
```

### 3. Vérifier RLS

Après connexion, l'utilisateur doit pouvoir:
- Modifier sa propre famille d'ateliers (si admin)
- Voir ses propres données
- Les politiques RLS doivent fonctionner automatiquement

## Avantages de Supabase Auth

1. **Sécurité renforcée:**
   - JWT tokens gérés automatiquement
   - Refresh tokens pour sessions persistantes
   - Protection CSRF intégrée

2. **Fonctionnalités intégrées:**
   - Réinitialisation de mot de passe
   - Changement d'email
   - Confirmation d'email
   - OAuth providers (si besoin futur)

3. **RLS natif:**
   - `auth.uid()` fonctionne automatiquement
   - Pas besoin de custom JWT claims
   - Meilleures performances

4. **Maintenance réduite:**
   - Moins de code custom à maintenir
   - Mises à jour de sécurité automatiques
   - Support Supabase officiel

## Dépannage

### Problème: "Workshop family not found or update not permitted"

**Cause:** L'utilisateur n'a pas de `auth_user_id` défini

**Solution:**
1. Vérifier que l'utilisateur est connecté via Supabase Auth
2. Vérifier que `auth_user_id` est bien renseigné dans la table users
3. Se déconnecter/reconnecter pour forcer le refresh de session

### Problème: Email de confirmation envoyé

**Cause:** La confirmation d'email est activée dans Supabase

**Solution:**
1. Dashboard > Authentication > Providers > Email
2. Désactiver "Confirm email"

### Problème: Utilisateurs existants ne peuvent pas se connecter

**Cause:** Ils n'ont pas encore de `auth_user_id`

**Solution:**
- Demander aux utilisateurs de "créer leur mot de passe"
- Cela créera automatiquement leur auth.user

## Points d'attention

1. **Mots de passe existants:** Impossible de les migrer, ils doivent être recréés
2. **Sessions actives:** Les anciennes sessions localStorage ne fonctionnent plus
3. **RLS:** Toutes les politiques nécessitent maintenant `auth_user_id`
4. **Tests:** Tester tous les flux d'authentification après déploiement

## Prochaines étapes suggérées

1. Ajouter la fonctionnalité "Mot de passe oublié"
2. Ajouter la possibilité de changer d'email
3. Ajouter la possibilité de changer de mot de passe
4. Implémenter des politiques de mot de passe robustes
5. Ajouter une authentification à deux facteurs (MFA) si nécessaire
