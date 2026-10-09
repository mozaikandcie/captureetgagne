# Capture et Gagne · Guide de déploiement

À suivre dans l'ordre. Chaque étape finit par un contrôle : ne passe à la suivante que s'il est bon.
Rien de ce guide n'a encore été exécuté : les migrations, les fonctions et le parcours complet n'ont pas été essayés contre un vrai projet Supabase. Compte donc un premier passage de débogage.

Prérequis : Node 22, le dépôt cloné, et la CLI Supabase (`brew install supabase/tap/supabase`, ou `npx supabase`).

---

## 1. Projet Supabase (UE)

1. Sur supabase.com, ouvre le projet existant (référence `jylepdgarlmoolwjvthh`, voir `.mcp.json`) ou crée-en un.
2. **Vérifie la région** : Project Settings > General > Region doit être `eu-west-*` ou `eu-central-*` (obligation RGPD du cahier des charges). Elle ne se change pas après coup : si ce n'est pas l'UE, crée un autre projet.
3. **Plan** : le projet est en **Free**, qui limite chaque fichier à **50 Mo**. Le code est réglé sur 50 Mo (`VIDEO_MAX_MB` dans `apps/web/src/features/envois/media.ts`, plus la limite du bucket dans la migration). Une vidéo de 30 s en 4K peut dépasser 50 Mo : à vérifier au test réel. Avec le plan Pro, remonte à 200 Mo à ces deux endroits et dans Settings > Storage.
4. Note ces valeurs (Project Settings > API) :
   - `Project URL` → `VITE_SUPABASE_URL`
   - clé **publique** (`anon`, ou `sb_publishable_…` sur les projets récents) → `VITE_SUPABASE_ANON_KEY`
   - clé **secrète** (`service_role`, ou `sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY` : jamais dans le navigateur, jamais dans Git, jamais dans un fichier `VITE_*`

**Contrôle** : la région affichée est bien en Europe.

## 2. Base de données

```bash
cd /Users/jm/Desktop/gagneetgagne_app
supabase login
supabase link --project-ref jylepdgarlmoolwjvthh
supabase db push        # applique supabase/migrations/ dans l'ordre
```

Les 4 migrations : schéma + RLS + `standings` + bucket `media` ; notifications de modération ; notation et rangs ; purge RGPD.

Ensuite les données d'exemple (**développement et test seulement**) : colle `supabase/seed.sql` dans Dashboard > SQL Editor > Run.

**Contrôle** :
- Table Editor : `events` contient 1 ligne au statut `live`, `challenges` en contient 5.
- Storage : le bucket `media` existe et est privé.
- Database > Replication : `entries` et `notifications` sont dans la publication `supabase_realtime`.

## 3. Brevo (SMS)

1. Crée un compte Brevo et active les **SMS transactionnels** (crédits à acheter).
2. Génère une clé API (SMTP & API > API Keys) → `BREVO_API_KEY`.
3. **Vérifie la couverture et le prix pour les numéros d'outre-mer** (+590, +594, +596, +262) : le public visé vit surtout aux Antilles. C'est le premier risque du test réel.
4. L'expéditeur `AMBYANS` (11 caractères maximum, lettres et chiffres) peut devoir être déclaré selon le pays.

## 4. Authentification par téléphone

Dashboard > Authentication :

1. **Providers > Phone** : active, longueur du code **6** (le formulaire attend 6 chiffres). Les champs du fournisseur SMS peuvent rester vides : l'envoi passe par le hook.
2. **Rate Limits** : relève « Rate limit for sending SMS messages » (30 par heure par défaut). Avec 200 personnes qui s'inscrivent en même temps, il faut une valeur d'au moins 300.
3. **Hooks > Send SMS** : voir l'étape 5. Génère le secret ici (`v1,whsec_…`) et garde-le.

## 5. Fonctions Edge

```bash
cp supabase/.env.example supabase/.env      # puis remplis les valeurs
```

Valeurs de `supabase/.env` :

| Variable | Origine |
| --- | --- |
| `SEND_SMS_HOOK_SECRET` | secret du hook (étape 4.3) |
| `BREVO_API_KEY` | étape 3 |
| `BREVO_SMS_SENDER` | `AMBYANS` |
| `CRON_SECRET` | une chaîne aléatoire longue (`openssl rand -hex 32`) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà fournis aux fonctions par Supabase : ne les mets pas dans le fichier.

```bash
supabase secrets set --env-file supabase/.env
supabase functions deploy send-sms --no-verify-jwt     # appelée par Auth, signature vérifiée dans le code
supabase functions deploy purge --no-verify-jwt        # protégée par l'en-tête x-cron-secret
supabase functions deploy export-zip                   # JWT vérifié, réservée aux organisateurs
```

Puis Authentication > Hooks > **Send SMS** : type HTTPS, URL `https://jylepdgarlmoolwjvthh.supabase.co/functions/v1/send-sms`, secret = `SEND_SMS_HOOK_SECRET`.

**Contrôle** : depuis l'app (étape 7), demande un code avec ton numéro et reçois le SMS. Si rien n'arrive : `supabase functions logs send-sms` (ou Dashboard > Edge Functions > Logs) et le journal Brevo.

## 6. Comptes jury et organisation

Chacun se connecte une première fois avec son téléphone sur `/jury/<id-événement>` (la page répond « réservé au jury », c'est normal). Cela crée son compte. Ensuite, dans SQL Editor :

```sql
-- Le numéro est stocké sans « + » : 33612345678, 590690123456…
insert into staff (event_id, user_id, role, label)
select '11111111-1111-1111-1111-111111111111', id, 'organizer', 'Président'
from auth.users where phone = '33612345678';

-- Jurés : même requête avec role = 'juror' et un label (« Présidente », « Trésorier »…)
```

L'identifiant `1111…` est celui de l'événement du seed. Pour un vrai événement, crée-le dans Table Editor (`events`, statut `live`) et ses défis dans `challenges`, en reprenant le format de `seed.sql` (textes en JSON `{"fr": "…"}`).

**Contrôle** : `/jury/<id>` affiche les onglets À modérer, Grille, Notes, Classement, Outils.

## 7. Lancer l'app en local

```bash
cd apps/web
cp .env.example .env     # VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Parcours à essayer, sur ton téléphone si possible (même réseau Wi-Fi, adresse affichée par Vite) :

1. `/e/<id>` : langue, numéro, code SMS, nom, deux cases, écrans de bienvenue, « Commencer les défis ».
2. Un défi : envoie une photo, puis une vidéo de plus de 30 s (doit être refusée), puis une vidéo valable.
3. Coupe le réseau pendant un envoi, puis rallume-le : il doit repartir seul.
4. `/jury/<id>` : valide un contenu (le participant reçoit la notification « défi réussi »), refuse-en un avec un motif.
5. Onglet Notes : note les contenus validés, ajoute un commentaire (notification « commentaire »).
6. Onglet Classement : statut provisoire puis définitif, « Envoyer les rangs ».
7. Onglet Outils : QR code, mur, remise des prix, export ZIP.

## 8. Vercel

1. Importe le dépôt GitHub `mozaikandcie/captureetgagne`.
2. **Root Directory** : `apps/web`. Framework : Vite (build `npm run build`, sortie `dist`).
3. Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` uniquement. Jamais la clé `service_role`.
4. `apps/web/vercel.json` renvoie toutes les adresses vers `index.html` (nécessaire pour `/e/…` et `/jury/…`).
5. **Plan** : le plan Hobby est réservé à un usage non commercial. Vérifie qu'il convient à l'association, sinon plan Pro ou Cloudflare Pages.
6. Domaine : ajoute celui de l'association si elle en a un. Le QR code utilise l'adresse du site ouvert, donc ouvre l'onglet Outils depuis l'adresse définitive avant d'imprimer l'affichette.

**Contrôle** : l'adresse de production affiche l'inscription, et un rechargement de `/e/<id>` ne donne pas d'erreur 404.

## 9. Purge automatique (RGPD)

Les durées sont des **propositions à valider par le bureau** : coordonnées 3 mois, médias 2 ans (constantes `CONTACT_MONTHS` et `MEDIA_MONTHS` dans `supabase/functions/purge/index.ts`).

Essai à blanc, qui ne supprime rien :

```bash
curl -H "x-cron-secret: <CRON_SECRET>" "https://jylepdgarlmoolwjvthh.supabase.co/functions/v1/purge?dry=1"
```

Planification quotidienne (Dashboard > Database > Extensions : active `pg_cron` et `pg_net`) :

```sql
select cron.schedule('purge-quotidienne', '0 3 * * *', $$
  select net.http_post(
    url := 'https://jylepdgarlmoolwjvthh.supabase.co/functions/v1/purge',
    headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb);
$$);
```

Ne planifie la purge qu'après avoir lu le résultat de l'essai à blanc. Elle est irréversible.

## 10. Avant le test réel (16 au 22 novembre)

- [ ] Sauvegardes : activées dans Database > Backups (quotidiennes en Pro), et un export du schéma fait.
- [ ] SMS reçus aux Antilles et en métropole (essai avec de vrais numéros).
- [ ] Un iPhone et un Android réels, en 4G dégradée : inscription, envoi photo, envoi vidéo, reprise après coupure.
- [ ] Remplace le seed par le vrai événement (statut `live`, `ends_at` renseignée, règlement relu).
- [ ] Les textes des créoles relus par des locuteurs natifs (voir `relecture-traductions-creoles.xlsx`), puis intégrés dans `apps/web/src/i18n/*.json`. Les textes ajoutés après le prototype n'existent qu'en français.
- [ ] Page « Données personnelles » relue par le bureau (durées, contact de l'association à ajouter).
- [ ] Règle pour les mineurs visibles sur les photos : décision du bureau.
- [ ] Export ZIP essayé avec un volume réel de médias (la fonction n'a jamais tourné).

## Dépannage rapide

| Symptôme | Piste |
| --- | --- |
| Page blanche au chargement | `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` vide : l'app s'arrête avec une erreur en console. |
| Pas de SMS | Hook Send SMS non configuré, secret différent, crédits Brevo, numéro hors couverture. Lire les logs de `send-sms`. |
| « Code incorrect » juste après réception | Le code expire au bout d'un temps court (Auth > Providers > Phone) : en redemander un. |
| Un participant ne voit pas l'événement | `events.status` doit être `live` (la RLS masque `draft`). |
| Envoi de vidéo refusé par le serveur | Fichier au-dessus de la limite du plan (50 Mo en Free) : voir étape 1.3. |
| Le jury voit « réservé au jury » | Pas de ligne `staff` pour ce compte et cet événement (étape 6). |
| Export ZIP en erreur | Logs de `export-zip` ; la fonction n'a pas encore été testée en conditions réelles. |
