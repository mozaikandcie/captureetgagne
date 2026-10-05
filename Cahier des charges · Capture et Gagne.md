# Cahier des charges · Capture et Gagne

Oct 5, 2026 · @jean michel

## Contexte et objectifs

Ambyans Twopikal veut une web app, **Capture et Gagne**, qui transforme les photos et vidéos prises par les participants pendant ses événements en concours, avec des défis et un jury de l'association. Un prototype complet existe déjà et sert de modèle : ce document décrit la vraie version, en ligne, utilisable pendant une soirée réelle.

Premier événement visé : **Le Grand Chanté Nwèl d'Ambyans**, à Lormont, **le samedi 19 décembre 2026**.

Objectifs de la version 1 :

- **Collecter** les photos et vidéos des participants pendant la soirée, en un seul endroit, avec leur accord écrit.
- **Faire participer** : au moins 1 personne sur 3 dans la salle envoie un contenu.
- **Juger simplement** : 3 jurés modèrent et notent depuis leur téléphone, en moins de 30 minutes après la fin des envois.
- **Récupérer** les contenus validés, rangés par défi, pour la communication et les dossiers de subvention.
- **Coûter peu** : moins de 30 € par mois en période d'événement, quasi gratuit le reste de l'année.

## Utilisateurs et rôles

Quatre publics utilisent l'app ; les deux premiers sur leur téléphone, sans rien installer.

| Rôle | Qui | Accès | Ce qu'il fait |
| --- | --- | --- | --- |
| Participant | Toute personne présente à l'événement | QR code → page web, numéro vérifié par SMS | S'inscrit, relève les défis, envoie photos et vidéos, vote pour le Prix du public, suit ses notifications et son classement |
| Juré | 3 membres de l'association | Lien jury séparé + code personnel | Modère, note sur 3 critères, commente, choisit les coups de cœur |
| Organisateur | 1 à 2 membres du bureau | Même lien que le jury, droits étendus | Crée l'événement et les défis, gère les jurés, lance le mur photo et la remise des prix, exporte, archive |
| Public de la salle | Tous | Écran projeté | Regarde le mur photo en direct et la remise des prix |

## Périmètre fonctionnel

La version 1 reprend le cœur du prototype, mais avec des données partagées entre tous les téléphones ; le reste vient en version 2. Le prototype fait référence pour l'apparence et les textes.

| Fonction | Contenu | Version |
| --- | --- | --- |
| Inscription | QR code par événement, nom, téléphone vérifié par code SMS, accord règlement et droit à l'image | V1 · indispensable |
| Défis | Liste, conseils, capsule culture, photo d'exemple ; 2 envois max par défi ; création, modification, suppression par l'organisateur | V1 · indispensable |
| Envoi de médias | Photo allégée sur le téléphone (2048 px), vidéo 30 s max ; reprise automatique si le réseau coupe | V1 · indispensable |
| Modération | File « à la chaîne » (glisser pour valider ou refuser) + grille filtrable | V1 · indispensable |
| Notation | 3 critères sur 10, commentaire, chaque contenu noté par tous les jurés, notes manquantes signalées | V1 · indispensable |
| Classement | Score sur 100, départage des égalités, prix par défi, mention « provisoire » | V1 · indispensable |
| Notifications dans l'app | Défi réussi, commentaire du jury, changement de place, badge | V1 · indispensable |
| Espace participant | Accueil, Défis, Galerie, Moi ; Mes contenus avec retrait | V1 · indispensable |
| Mur photo et remise des prix | Écrans à projeter, mis à jour en direct | V1 · indispensable |
| Export | ZIP des contenus validés par défi + classement CSV | V1 · indispensable |
| Langues | Français + 5 créoles relus (Guadeloupe, Martinique, Guyane, La Réunion, Haïti) | V1 · indispensable |
| Prix du public | 3 votes par participant, pas pour soi-même | V2 · ensuite |
| Badges | 7 badges et notifications associées | V2 · ensuite |
| Notifications hors app | SMS ou e-mail aux gagnants et en fin de soirée | V2 · ensuite |
| Installation sur l'écran d'accueil | Icône, plein écran, fonctionnement hors ligne partiel | V2 · ensuite |
| Historique des événements | Archives avec gagnants et galeries | V2 · ensuite |
| Défis multilingues | Nom et consigne des défis traduits par le jury | V2 · ensuite |

Hors périmètre : paiement, billetterie, réseau social, application dans les stores.

## Parcours d'une soirée type

La soirée se déroule en 8 étapes, de la préparation à l'archivage ; l'app doit tenir chacune sans intervention technique.

1. **J–7** : l'organisateur crée l'événement (nom, lieu, affiche, fin du concours, lots), choisit les défis et imprime l'affichette QR.
2. **Ouverture des portes** : le mur photo est projeté ; les invités scannent le QR code, choisissent leur langue et s'inscrivent en moins d'une minute.
3. **Pendant la soirée** : les participants relèvent les défis ; chaque envoi part en arrière-plan, même avec un réseau faible.
4. **En continu** : un juré modère depuis son téléphone ; chaque contenu validé apparaît sur le mur et déclenche une notification « défi réussi ».
5. **Fin du compte à rebours** : les envois se ferment automatiquement.
6. **Délibération (30 min max)** : les 3 jurés notent en mode « à la chaîne » ; l'app affiche ce qui manque et passe en « classement définitif ».
7. **Remise des prix** : projection animée (prix par défi, Prix du public, podium) ; les gagnants reçoivent un SMS.
8. **J+1 à J+7** : export ZIP pour la communication, puis clôture et archivage de l'événement.

## Règles du concours et calcul du score

Le score final est sur 100 : 30 % pour la participation, 70 % pour la note du jury. Ces règles sont celles du prototype et doivent être reprises à l'identique.

```latex
\text{Score} = 30 \times \frac{\text{défis validés}}{\text{nombre de défis}} + 70 \times \frac{\text{moyenne des meilleures notes par défi}}{10}
```

- **Note d'un contenu** : moyenne des 3 critères (respect du défi, qualité et cadrage, originalité), puis moyenne de tous les jurés.
- **Complétude** : chaque contenu validé est noté par tous les jurés ; tant que ce n'est pas le cas, le classement reste « provisoire ».
- **Égalités**, dans l'ordre : meilleure note obtenue sur un contenu, puis nombre de défis validés, puis premier à avoir terminé ses envois.
- **Prix par défi** : meilleure note ; à égalité, le contenu noté par le plus de jurés, puis le plus ancien.
- **Prix du public** : le plus de votes ; 3 votes par participant, pas pour soi-même.
- **Limites d'envoi** : 2 contenus par défi, vidéos de 30 secondes, envois fermés à l'heure de fin.

## Exigences non fonctionnelles

L'app doit marcher sur un téléphone ordinaire, dans une salle bruyante au réseau faible, pour 200 personnes en même temps.

| Exigence | Cible |
| --- | --- |
| Appareils | iPhone et Android des 5 dernières années, navigateur web, rien à installer |
| Charge | 200 participants et 600 envois sur une soirée, 50 envois par minute en pointe |
| Réseau faible | Envois mis en file d'attente et repris automatiquement ; jamais de perte silencieuse |
| Rapidité | Page d'accueil affichée en moins de 3 s en 4G ; contenu validé visible sur le mur en moins de 5 s |
| Langues | Français, créoles de Guadeloupe, Martinique, Guyane, La Réunion et Haïti ; ajout d'une langue sans toucher au code |
| Accessibilité | Contrastes et tailles conformes WCAG 2.1 AA, zones tactiles de 44 px, bouton texte agrandi, thème sombre |
| Charte | Rouge et jaune du logo Ambyans Twopikal, comme le prototype |
| Fiabilité | Sauvegarde quotidienne de la base ; aucune perte de média validé |

## RGPD, droit à l'image et sécurité

L'association collecte des numéros de téléphone et des images de personnes : elle est responsable de ces données et doit le faire dans les règles. Ce cahier des charges n'est pas un avis juridique ; le règlement final mérite une relecture par une personne compétente.

- **Consentement** : deux cases à cocher obligatoires (règlement et utilisation des médias ; accord des personnes photographiées), horodatées et conservées.
- **Minimisation** : seulement le nom et le téléphone (ou l'e-mail) ; aucune autre donnée personnelle.
- **Mineurs** : règle à décider par le bureau ; par défaut, un contenu montrant un enfant reconnaissable n'est pas publié sur les réseaux.
- **Droit de retrait** : le participant supprime lui-même un contenu depuis « Mes contenus » ; suppression définitive du fichier, pas seulement masqué.
- **Conservation** : durée à décider (proposition : 2 ans pour les médias validés, 3 mois pour les coordonnées après l'événement), puis suppression automatique.
- **Hébergement** : données stockées dans l'Union européenne.
- **Sécurité** : accès jury par compte personnel ; règles d'accès côté base de données (un participant ne voit que ses envois non validés) ; fichiers non publics servis par liens temporaires ; vérification par SMS contre les comptes multiples.
- **Information** : une page « Données personnelles » accessible depuis l'inscription, avec un contact de l'association.

## Choix techniques et architecture

Recommandation : une web app React hébergée sur Vercel, et Supabase pour tout le reste (comptes, base, fichiers, temps réel). Peu de pièces à maintenir, des plans gratuits pour démarrer, et des outils connus de la plupart des développeurs.

&#91;embedded content: architecture · 2 services + l'envoi de SMS\]

Les téléphones ne parlent qu'à la web app ; elle lit et écrit dans Supabase, qui prévient le mur et les participants en direct et délègue l'envoi des SMS à Brevo.

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Interface | React + TypeScript + Vite, installable (PWA) | Reprend la logique du prototype ; fonctionne sur tous les téléphones |
| Données | Supabase Postgres + règles d'accès par ligne (RLS) | Sécurité gérée dans la base, pas seulement dans l'écran |
| Médias | Supabase Storage, envois reprenables (protocole TUS) | Un envoi coupé reprend où il s'est arrêté |
| Direct | Supabase Realtime | Mur photo et notifications sans recharger |
| Traitements | Fonctions Supabase (Edge Functions) | Export ZIP, SMS aux gagnants, nettoyage automatique |
| SMS | Brevo, branché sur la vérification des comptes | Fournisseur français, paiement à l'usage |

## Budget estimé

Compter environ **35 € pour un mois d'événement** et presque rien le reste de l'année, si le développement est bénévole. Les prix sont ceux affichés publiquement en 2026 et peuvent évoluer.

| Poste | Offre | Coût | Quand |
| --- | --- | --- | --- |
| Base de données, comptes, stockage des médias | Supabase Free : 1 Go de fichiers, 5 Go de transfert, mise en pause après 1 semaine d'inactivité | 0 € | Développement et tests |
| Base de données, comptes, stockage des médias | Supabase Pro : 100 Go de fichiers, 250 Go de transfert | 25 $ par mois (environ 23 €) | Mois de l'événement, puis retour au gratuit après export |
| Hébergement du site | Vercel Hobby (gratuit, usage non commercial) ou Pro | 0 à 20 $ par mois | Toute l'année |
| SMS de vérification et aux gagnants | Brevo, crédits prépayés, environ 0,045 € par SMS | Environ 10 € pour 220 SMS | Par événement |
| Nom de domaine | ex. captureetgagne.fr (approximatif, non vérifié) | Environ 10 à 15 € par an | Toute l'année |

Point d'attention : le plan gratuit de Vercel est réservé à un usage personnel et non commercial. Un concours gratuit d'association s'en rapproche, mais c'est à confirmer auprès de Vercel ; à défaut, Cloudflare Pages ou le plan Pro.

Sources : [Supabase, tarifs 2026 (UI Bakery)](https://uibakery.io/blog/supabase-pricing) · [Vercel Hobby et clause commerciale](https://justinmckelvey.com/blog/is-vercel-free) · [Prix des SMS Brevo (Leptidigital)](https://www.leptidigital.fr/faq/prix-sms-sendinblue-brevo-42583/)

## Calendrier

La version 1 demande environ 8 semaines à un développeur disponible quelques jours par semaine. Le Grand Chanté Nwèl ayant lieu le 19 décembre 2026, le calendrier retenu est le suivant :

- **12 octobre au 15 novembre** : inscription, défis, envois, modération, notation et classement.
- **16 au 22 novembre** : mur photo, remise des prix, export, puis **test réel avec 20 à 30 personnes** (événement à fixer).
- **23 novembre au 6 décembre** : corrections, créoles relus intégrés, test de charge à 200 utilisateurs simulés. Aucune nouvelle fonction après le 30 novembre.
- **7 au 13 décembre** : gel du code et répétition générale avec le jury.
- **14 au 18 décembre** : marge, impression des QR codes, passage de Supabase au plan Pro.

La marge réelle n'est que de 1 à 2 semaines. Si le calendrier glisse, l'export et la remise des prix animée sont faisables à la main.

&#91;embedded content: calendrier · 5 phases, 2 jalons\]

Le test réel lors d'un petit événement est le jalon le plus important : c'est là qu'on découvre les vrais problèmes de réseau et d'usage.

## Décisions du bureau et critères de réussite

Sept décisions conditionnent le démarrage ; les trois premières bloquent le développement.

| Décision | Proposition | Statut |
| --- | --- | --- |
| Date du Grand Chanté Nwèl | À confirmer avec la Ville de Lormont | Décidé : 19 décembre 2026 |
| Qui développe | Un développeur bénévole ou rémunéré, assisté par IA | Décidé : Jean Michel, assisté par IA |
| Date du test réel | Semaine du 16 au 22 novembre, 20 à 30 personnes | Période approuvée, événement à fixer |
| Budget annuel | Environ 60 à 100 € pour 2 à 3 événements |  |
| Durée de conservation | 2 ans pour les médias, 3 mois pour les coordonnées |  |
| Règle pour les mineurs | Pas de publication d'enfants reconnaissables sans accord parental |  |
| Lots à gagner | Par défi, Prix du public, podium |  |
| Relecteurs des créoles | Un par territoire, avec la fiche de relecture |  |

La version 1 est réussie si, au Grand Chanté Nwèl :

- au moins 1 personne sur 3 dans la salle envoie un contenu ;
- aucun envoi n'est perdu ;
- le jury annonce les résultats moins de 30 minutes après la fin des envois ;
- l'association récupère au moins 50 médias validés, rangés par défi.
