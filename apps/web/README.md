# Capture et Gagne · application web

React + TypeScript + Vite, Supabase (Postgres, Auth par téléphone, Storage, Realtime). Contexte complet : `../../CLAUDE.md`. Mise en route et déploiement : `../../DEPLOIEMENT.md`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (`--host` pour l'ouvrir sur un téléphone du même Wi-Fi) |
| `npm run build` | vérification des types puis build de production |
| `npm run typecheck` / `npm run lint` | types et règles de code |
| `npm test` | tests unitaires (rapides, sans réseau) |
| `npm run test:rls` | **règles d'accès** vérifiées avec de vrais comptes de rôles différents |
| `npm run test:e2e` | **parcours de bout en bout** dans un navigateur |

## Tests contre Supabase (`test:rls` et `test:e2e`)

Ils utilisent le projet Supabase de `apps/web/.env` et les **numéros de test** (code `123456`) : organisateur `06 00 00 00 01`, jurés `…02` et `…03`, participants `…11` et `…12`.

- Chaque exécution fabrique un **événement jetable** (« E2E · … ») à partir de l'événement d'exemple et le supprime à la fin, fichiers compris. Les données de l'événement d'exemple ne sont pas modifiées.
- Une exécution interrompue laisse au plus un événement « E2E · … » : il est effacé au lancement suivant.
- Supabase limite l'envoi à **un code par minute et par numéro** : les sessions sont mémorisées dans `e2e/.auth/` (ignoré par Git) et l'inscription réelle attend si besoin.
- `test:e2e` pilote l'application sur `http://localhost:5173` (lancée automatiquement si besoin). Navigateur : `npx playwright install chromium`, ou `PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chromium`.

### Ce qui est couvert

- **Règles d'accès (25 contrôles)** : un visiteur ne lit aucune donnée personnelle ; un participant ne voit pas les envois en attente d'un autre, ne peut ni modérer, ni noter, ni modifier l'événement, ni déposer dans le dossier d'un autre, ni voter pour lui-même ; un juré modère et note mais ne lit pas les notes des autres et ne modifie ni événement ni défis ; l'organisation gère l'événement mais ne note pas ; les badges et les votes restent privés ; le droit à l'effacement.
- **Parcours** : inscription (numéro invalide, code SMS, consentements) ; envoi d'une photo ; validation et notation par les jurés ; classement définitif chez l'organisateur ; le participant voit sa note, le commentaire du jury et son badge.

Ces tests ne tournent pas dans la CI GitHub (ils ont besoin du projet Supabase) : à lancer avant chaque mise en production.
