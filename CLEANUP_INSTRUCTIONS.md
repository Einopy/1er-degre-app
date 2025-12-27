# Instructions de Nettoyage des Edge Functions

Les edge functions suivantes ne sont plus nécessaires et doivent être supprimées :

1. `check-email-status`
2. `migrate-user-auth`

## Suppression via le Dashboard Supabase

1. Connecte-toi au [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionne ton projet
3. Va dans "Edge Functions" dans le menu latéral
4. Pour chaque fonction (`check-email-status` et `migrate-user-auth`) :
   - Clique sur la fonction
   - Clique sur le bouton "Delete function"
   - Confirme la suppression

## Pourquoi ces fonctions ne sont plus nécessaires

Avec la nouvelle implémentation utilisant `auth_user_id` :
- La vérification du statut de l'email se fait maintenant côté client via des requêtes directes à la table `users`
- La migration des users n'est plus nécessaire car on met simplement à jour le user existant avec son `auth_user_id`
- L'ID permanent du user reste stable, éliminant le besoin de migration de données

Les fichiers locaux ont déjà été supprimés du projet.
