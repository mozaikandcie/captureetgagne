# Plan B · Si les SMS ne partent plus le soir de l'événement

Tout le parcours repose sur le code reçu par SMS (Supabase Auth → fonction `send-sms` → Brevo). Ce document dit **quoi vérifier avant**, **comment diagnostiquer pendant**, et **quoi faire si rien ne repart**.

## 1. Avant l'événement

| Quand | À faire | Où |
| --- | --- | --- |
| 14 jours avant | Recharger les crédits Brevo : prévoir **300 SMS pour 200 personnes** (inscription, renvois, gagnants) | Brevo → Transactional → SMS |
| 7 jours avant | Vérifier la limite d'envois par heure à **300 ou plus** | Supabase → Authentication → Rate Limits |
| 7 jours avant | Vérifier que la restriction d'adresses IP est **désactivée** | Brevo → Sécurité → Authorised IPs |
| La veille | S'inscrire avec un vrai numéro sur l'événement de test : SMS reçu en moins de 30 s | `/e/<id de l'événement de test>` |
| Le jour même | Regarder « SMS de connexion » (crédits restants) dans l'espace organisation, onglet Outils | `/organisation/<id>` |

Un rappel : le solde passe en rouge sous 50 crédits et en orange sous 300.

## 2. Pendant l'événement : diagnostic en 2 minutes

| Symptôme | Cause probable | Action |
| --- | --- | --- |
| « Le SMS n'a pas pu être envoyé » pour tout le monde | Crédits épuisés ou clé Brevo refusée | Brevo : recharger ; ou regarder le journal `send-sms` (Supabase → Edge Functions → send-sms → Logs, ligne `Brevo …`) |
| « Trop de demandes, réessayez dans N s » pour beaucoup de monde | Limite d'envois par heure atteinte | Supabase → Authentication → Rate Limits : relever la limite |
| Quelques personnes seulement ne reçoivent rien | Numéro fixe, étranger ou réseau de l'opérateur | Vérifier le numéro (mobile 06/07), attendre 1 minute, renvoyer le code |
| Plus aucune réponse (écran qui tourne) | Supabase ou Vercel indisponible | statut Supabase et Vercel ; attendre ; voir §3 |

**Les personnes déjà connectées ne sont pas touchées** : leur session reste ouverte plusieurs semaines. Il faut juste leur demander de **ne pas se déconnecter** pendant l'événement.

## 3. Si rien ne repart (SMS hors service)

L'application ne permet pas d'inscrire quelqu'un sans SMS : c'est volontaire (un compte = un téléphone vérifié). Dans ce cas :

1. **Annoncer calmement** que le concours continue sur place ; les personnes déjà inscrites peuvent envoyer leurs contenus normalement.
2. **Collecter les contenus des autres par un canal de secours**, à décider avec le bureau avant l'événement : par exemple une adresse e-mail ou un album partagé de l'association, indiqués sur l'affichette.
3. **Le jury note ces contenus à part** (grille papier ou tableur). Ils ne figurent pas dans le classement de l'application.
4. **Après l'événement**, rétablir les SMS puis inviter les personnes concernées à s'inscrire pour retrouver leurs contenus, ou les ajouter au palmarès à la main lors de la remise des prix.

## 4. Décisions à prendre avec le bureau

- Le canal de secours du §3 (adresse e-mail, album partagé, personne responsable).
- Qui surveille les crédits et le journal le soir de l'événement.
- Un second fournisseur de SMS (par exemple Twilio, géré nativement par Supabase Auth) à brancher **avant** l'événement si le bureau juge le risque trop élevé : le changement prend une heure, mais il doit être testé à l'avance.
