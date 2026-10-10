# Capture et Gagne · Démarrage du développement

Web app de concours photo et vidéo de l'association **Ambyans Twopikal** (Lormont).
Les participants relèvent des défis pendant un événement, un jury de l'association modère et note, l'app calcule le classement et projette les résultats.

**Périmètre (mis à jour le 2026-10-10).** La V1 est codée. À la demande du développeur, une partie de la V2 est maintenant codée aussi : Prix du public et votes, badges, historique des événements, défis multilingues (saisie des traductions par l'organisation). **Reste en attente** : SMS aux gagnants (dépend de Brevo, repoussé) et PWA installable. La section « V2 » en fin de fichier indique l'état.

Ce fichier sert de point de départ au dépôt de code. Il peut être placé à la racine du projet sous le nom `CLAUDE.md` (ou `README.md`) pour qu'un développeur, ou un assistant de code, ait tout le contexte.

- **Référence visuelle et fonctionnelle** : le prototype `concours-photo.html` (un seul fichier HTML, données d'exemple, aucune donnée partagée). Reprendre ses écrans, ses textes, ses couleurs et ses règles. **Ne pas réutiliser son code tel quel** : il a grandi par ajouts successifs.
- **Cahier des charges** : document « Cahier des charges · Capture et Gagne » (périmètre V1/V2, RGPD, budget, calendrier).
- **Premier événement visé** : Le Grand Chanté Nwèl d'Ambyans, **samedi 19 décembre 2026**. Test réel prévu la semaine du 16 au 22 novembre. Développeur : Jean Michel, assisté par IA.

---

## 1. Stack

| Brique | Choix |
| --- | --- |
| Front | React 18 + TypeScript + Vite (PWA installable en V2) |
| Routing | React Router |
| État serveur | TanStack Query + client `@supabase/supabase-js` |
| Back | Supabase : Postgres + RLS, Auth (téléphone), Storage, Realtime, Edge Functions (Deno) |
| Envois de médias | Supabase Storage, envois reprenables TUS (`tus-js-client`) |
| SMS | Brevo, via le hook « Send SMS » de Supabase Auth (Edge Function) |
| Hébergement front | Vercel (vérifier l'éligibilité du plan Hobby, sinon Pro ou Cloudflare Pages) |
| Région des données | Union européenne (projet Supabase en `eu-west-*` ou `eu-central-*`) |
| Tests | Vitest (logique), Playwright (parcours) |
| Qualité | ESLint, Prettier, `tsc --noEmit` en CI |

## 2. Structure du dépôt

```
capture-et-gagne/
├─ CLAUDE.md                  ← ce fichier
├─ apps/web/
│  ├─ src/
│  │  ├─ app/                 routes : participant, jury, mur, remise-des-prix
│  │  ├─ features/
│  │  │  ├─ inscription/
│  │  │  ├─ defis/
│  │  │  ├─ envois/           compression photo, durée vidéo, file d'attente TUS
│  │  │  ├─ moderation/       file « à la chaîne » + grille
│  │  │  ├─ notation/
│  │  │  ├─ classement/
│  │  │  ├─ notifications/       défi réussi, refus, commentaire, rang
│  │  │  ├─ mur/
│  │  │  └─ remise-prix/
│  │  ├─ i18n/                fr.json, gp.json, mq.json, gf.json, re.json, ht.json
│  │  ├─ lib/supabase.ts
│  │  ├─ lib/score.ts         calcul du score (miroir de la vue SQL, testé)
│  │  └─ styles/tokens.css    couleurs et tailles du prototype
│  └─ public/                 logo, icônes PWA, manifest
├─ supabase/
│  ├─ migrations/             schéma, RLS, vues, fonctions SQL
│  ├─ functions/
│  │  ├─ send-sms/            hook Auth → Brevo
│  │  ├─ export-zip/          ZIP des contenus validés + classement.csv
│  │  └─ purge/               suppression automatique (durées de conservation)
│  └─ seed.sql                données d'exemple (celles du prototype)
└─ .github/workflows/ci.yml
```

## 3. Modèle de données (première version)

```sql
-- Événements
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_label text,
  place text,
  message text,
  prizes text,
  poster_path text,                      -- Storage
  ends_at timestamptz,                   -- fin des envois (compte à rebours)
  rules text not null,
  status text not null default 'draft'   -- draft | live | closed | archived
    check (status in ('draft','live','closed','archived')),
  created_at timestamptz not null default now()
);

-- Défis (textes en jsonb {"fr": "..."} : en V1 seul « fr » est rempli, les traductions des défis arrivent en V2)
create table challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  position int not null,
  title jsonb not null,                  -- {"fr": "...", "gp": "...", ...}
  hint jsonb not null,
  tip jsonb,
  culture jsonb,
  example_path text,
  kind text not null check (kind in ('photo','video','both'))
);

-- Participants (1 compte Auth = 1 téléphone vérifié)
create table participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references auth.users,
  display_name text not null,
  lang text not null default 'fr',
  consent_rules_at timestamptz not null,
  consent_image_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Jury et organisation
create table staff (
  event_id uuid references events on delete cascade,
  user_id uuid references auth.users,
  role text not null check (role in ('juror','organizer')),
  label text not null,                   -- « Présidente », « Trésorier »...
  primary key (event_id, user_id)
);

-- Envois
create table entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  challenge_id uuid not null references challenges on delete cascade,
  participant_id uuid not null references participants on delete cascade,
  kind text not null check (kind in ('photo','video')),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','ok','rejected')),
  validated_at timestamptz,              -- sert au départage « date du dernier envoi validé »
  reject_reason text,                    -- affiché au participant dans la notification « refus »
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

-- Notes : une ligne par juré et par envoi
create table scores (
  entry_id uuid references entries on delete cascade,
  juror_id uuid references auth.users,
  respect smallint not null check (respect between 0 and 10),
  quality smallint not null check (quality between 0 and 10),
  originality smallint not null check (originality between 0 and 10),
  comment text,
  updated_at timestamptz not null default now(),
  primary key (entry_id, juror_id)
);

-- Notifications dans l'app
create table notifications (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants on delete cascade,
  kind text not null,                    -- defi | refus | com | rang   (badge : V2)
  payload jsonb not null,                -- clés i18n + variables, pas de texte figé
  read_at timestamptz,
  created_at timestamptz not null default now()
);
```

Notes :
- Les notifications stockent une **clé de traduction + des variables**, pour s'afficher dans la langue du participant.
- Contraintes à coder en triggers : 2 envois maximum par défi et par participant (hors refusés), envois refusés après `events.ends_at`, 3 coups de cœur maximum par type de média.

## 4. Règles d'accès (RLS) à respecter

| Table | Participant | Juré | Organisateur |
| --- | --- | --- | --- |
| events, challenges | lecture si `status in ('live','closed')` | lecture | tout |
| participants | sa ligne | lecture | lecture |
| entries | les siennes + celles `ok` de son événement | lecture, mise à jour du `status` et de `favorite` | tout |
| scores | lecture des scores de ses envois `ok` | ses propres lignes | lecture |
| notifications | les siennes | — | insert via fonctions |

Storage : bucket `media` **privé**, chemin `event_id/participant_id/entry_id.ext`, lecture par URL signée. Le mur et la remise des prix lisent seulement les envois `ok`.

## 5. Calcul du score (à reprendre à l'identique)

```
note_envoi   = moyenne sur les jurés de (respect + qualité + originalité) / 3
meilleure    = pour chaque défi validé du participant, la meilleure note_envoi
jury         = moyenne des meilleures (0 si aucune)
participation= défis validés / nombre de défis
score /100   = 30 × participation + 70 × jury / 10   (arrondi à 2 décimales)
```

- **Égalités**, dans l'ordre : meilleure note individuelle ↓, nombre de défis validés ↓, date du dernier envoi validé ↑.
- **Prix par défi** : meilleure note_envoi ; à égalité, plus grand nombre de jurés ayant noté, puis envoi le plus ancien.
- **Classement définitif** seulement si aucun envoi `pending` et chaque envoi `ok` est noté par tous les jurés de l'événement ; sinon afficher « provisoire » et bloquer la remise des prix (avec un bouton « lancer quand même »).
- Implémenter en **vue SQL** (`standings`) + **même logique en TypeScript** (`lib/score.ts`) couverte par des tests Vitest reprenant les données d'exemple du prototype.

## 6. Points techniques à ne pas rater

- **Photos** : redimensionner sur le téléphone à 2048 px max, JPEG qualité 0,85, avant l'envoi.
- **Vidéos** : refuser au-delà de 30 s (lire la durée via `<video>` avant l'envoi), 200 Mo max.
- **Réseau faible** : file d'attente locale (IndexedDB) + TUS ; reprise automatique au retour du réseau ; jamais d'échec silencieux.
- **Temps réel** : un canal par événement (`entries` validées, notifications du participant connecté).
- **Langues** : textes de l'interface dans `i18n/*.json` (repris du prototype, après relecture par des locuteurs natifs) ; ajouter une langue = ajouter un fichier. Le titre de l'animation d'ouverture reste « Capture et Gagne » en français.
- **Accessibilité** : WCAG 2.1 AA, zones tactiles 44 px, bouton « A+ », thème sombre.
- **Charte** : rouge `#e33e3d` et jaune `#f8c96a` du logo ; rouge texte `#c9302f` sur fond clair pour le contraste.
- **RGPD** : consentements horodatés ; retrait d'un contenu = suppression du fichier ; purge automatique (proposition : coordonnées 3 mois après l'événement, médias 2 ans) ; page « Données personnelles ».

## 7. Plan de travail (12 octobre → 6 décembre, gel du code le 7 décembre)

- [ ] **S1 · Cadrage** (12 oct) : projet Supabase (UE), dépôt, CI, Vercel ; migrations de base ; décisions du bureau reçues
- [ ] **S2 · Inscription** (19 oct) : connexion par SMS (Brevo), consentements, choix de la langue, écrans de bienvenue
- [ ] **S3 · Défis et envois** (26 oct) : création d'événement et de défis, envoi photo/vidéo reprenable, Mes contenus avec retrait
- [ ] **S4 · Modération** (2 nov) : accès jury, file « à la chaîne », grille filtrable, notification « défi réussi »
- [ ] **S5 · Notation et classement** (9 nov) : notes + commentaires, vue `standings`, notes manquantes, notifications de rang
- [ ] **S6 · Écrans** (16 nov) : mur photo en direct, remise des prix, QR code, export ZIP · **test réel (20 à 30 personnes)**
- [ ] **S7 · Corrections** (23 nov, aucune nouvelle fonction après le 30 nov) : retours du test, créoles relus intégrés
- [ ] **S8 · Charge et mise en production** (30 nov) : test 200 utilisateurs simulés, sauvegardes, go / no-go

## 8. Définition de « terminé » pour chaque fonction

- Fonctionne sur un iPhone et un Android réels, en 4G dégradée.
- Textes dans les 6 langues, aucune chaîne en dur dans le code.
- Règles RLS testées (un participant ne lit jamais les envois non validés d'un autre).
- Tests Vitest pour la logique, au moins un parcours Playwright par écran principal.
- Aucune erreur dans la console, contrastes vérifiés.

## 9. Variables d'environnement

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # Edge Functions uniquement, jamais côté navigateur
BREVO_API_KEY=                  # Edge Functions uniquement
BREVO_SMS_SENDER=AMBYANS
```

## 10. Questions ouvertes

- Budget annuel (proposition : 60 à 100 €).
- Événement pour le test réel (semaine du 16 au 22 novembre).
- Règle pour les mineurs visibles sur les photos.
- Durées de conservation définitives.
- Relecteurs des 5 créoles.

## 11. V2 : état

- **Fait** : Prix du public (table `votes`, 3 votes par participant, jamais pour soi, trigger ; `events.public_vote` ; RLS ; fonctions `vote_counts` et `public_prize`, départage : le plus de votes puis le contenu validé en premier, à confirmer par le bureau) ; badges (7, table `participant_badges`, notification `badge`, calculés par `refresh_badges`) ; historique (`archive_event`, `create_next_event`, `event_summary`) ; défis multilingues (titre et consigne par langue dans « Gérer les défis ») ; affiche de l'événement et photos d'exemple (bucket public `posters`).
- **En attente** : SMS aux gagnants (`notify-winners`, avec Brevo) ; PWA installable (`vite-plugin-pwa`, icône, plein écran, hors ligne partiel).
