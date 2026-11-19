# Import du dépôt fernlace

## Import complet du dépôt GitHub
- [x] Importer le dépôt GitHub https://github.com/johandesire14-hash/fernlace dans un espace de travail Webdev géré.
- [x] Conserver l’application React existante et sa structure actuelle.
- [x] Maintenir les composants et usages TanStack déjà présents dans le dépôt.
- [x] Préserver la configuration et le processus de développement/build Vite.
- [x] Reprendre à l’identique les fonctionnalités, contenus, parcours et comportements existants, sans nouvelle fonctionnalité ni changement d’orientation produit.
- [x] Valider le lancement et la compilation de l’application dans l’environnement Webdev géré.

## Connexion client
- [x] Ajouter une page `/connexion` permettant aux clients de se connecter avec l’authentification Supabase existante.
- [x] Ajouter un accès visible à la connexion depuis la navigation principale.
- [x] Afficher les états de chargement et d’erreur sans exposer les détails techniques du fournisseur d’authentification.

## Espace client protégé
- [x] Créer une route `/espace-client` accessible uniquement avec une session Supabase valide.
- [x] Rediriger les visiteurs non authentifiés vers `/connexion`.
- [x] Permettre la déconnexion depuis l’espace client et rediriger vers la connexion.

## Profil client
- [x] Ajouter une page `/espace-client/profil` protégée permettant de modifier les informations personnelles.
- [x] Enregistrer le nom complet, le téléphone et la ville dans les métadonnées du compte Supabase.
- [x] Afficher une confirmation de réussite ou une erreur utilisateur lors de l’enregistrement.

## Historique des commandes client
- [x] Relier les nouvelles commandes au compte client authentifié.
- [x] Afficher l’historique personnel des commandes dans l’espace client.
- [x] Prévoir les états vide et indisponible sans exposer les détails techniques.

## Factures PDF
- [x] Ajouter un téléchargement PDF pour chaque commande de l’historique.
- [x] Inclure les informations client, les articles, le statut, la date et le total dans la facture.

## Suivi de livraison
- [x] Afficher une timeline de livraison par commande.
- [x] Mettre à jour le statut en direct via Supabase Realtime.
- [x] Ajouter une actualisation manuelle de secours.

## Carte de livraison
- [x] Retirer la section « Position actuelle du colis » de l’espace client.
- [x] Retirer la saisie des coordonnées GPS du back-office.
- [x] Conserver la timeline de statut et le téléchargement de facture PDF.

## Authentification locale temporaire
- [x] Basculer automatiquement vers un mock en développement lorsque Supabase n’est pas configuré.
- [x] Fournir un compte client et un compte créateur de test avec session persistante locale.
- [x] Désactiver le mock dans les builds de production.
