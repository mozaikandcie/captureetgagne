# Test réel · Capture et Gagne · semaine du 16 au 22 novembre 2026

**Objectif** : vérifier, avec 20 à 30 vraies personnes sur leurs vrais téléphones, que le parcours complet tient (inscription par SMS, envoi de photos et vidéos, modération, notation, classement, remise des prix), et repérer ce qui doit être corrigé avant le gel du code (30 novembre).

**Événement utilisé** : « TEST · Le Grand Chanté Nwèl » (fin des envois le dimanche 22 novembre à 23 h 00). Le vrai événement du 19 décembre n'est pas touché.
Adresse du QR code : `https://captureetgagne.vercel.app/e/22222222-2222-2222-2222-222222222222`

## 1. Calendrier proposé (à confirmer par le bureau)

| Jour | Quoi |
| --- | --- |
| Lundi 16 nov. | Vérifications techniques (§2). Invitation des jurés. Impression de l'affichette QR. |
| Mardi 17 au vendredi 20 nov. | Les testeurs reçoivent le lien et la fiche (§5). Premiers envois libres. |
| **Samedi 21 nov.** | **Séance collective** (1 h 30 à 2 h) avec le bureau : défis en direct, modération, notation, mur photo. |
| Dimanche 22 nov. | Fin des envois à 23 h. Notation terminée dans la journée. Remise des prix simulée en soirée (avec SMS aux gagnants, §4). |
| Lundi 23 nov. | Bilan avec le bureau, correctifs (S7). Nettoyage de l'événement de test. |

## 2. Avant le test (lundi 16 novembre)

- [ ] Crédits Brevo : **au moins 150 SMS** (30 inscriptions, renvois, 5 à 8 SMS aux gagnants). Vérifier dans l'espace organisation, onglet Outils, bloc « SMS de connexion ».
- [ ] Limite d'envois par heure à **300** (Supabase → Authentication → Rate Limits).
- [ ] Restriction d'adresses IP désactivée dans Brevo.
- [ ] Un SMS réel reçu en moins de 30 secondes sur votre propre téléphone.
- [ ] Événement de test : statut « ouvert », 6 défis, heure de fin le 22 nov. 23 h 00.
- [ ] Jurés invités par leur numéro (espace organisation, onglet Jury) : **3 jurés**, nombre attendu validé à 3.
- [ ] Une affiche ajoutée (même provisoire) pour vérifier son affichage.
- [ ] Le site s'ouvre sur un iPhone ET un Android réels, en 4G, avec le QR code de l'affichette.
- [ ] `PLAN-B.md` relu avec le bureau, canal de secours décidé.

## 3. Rôles

| Rôle | Nombre | Ce qu'il fait |
| --- | --- | --- |
| Testeurs | 20 à 30 | Parcours participant (§5). Au moins 8 sur iPhone et 8 sur Android, dont 5 en 4G faible ou sans wifi. |
| Jurés | 3 | Modèrent et notent (§6). |
| Organisateur | 1 à 2 | Surveille, projette le mur, lance la remise des prix (§7). |
| Observateur | 1 | Note les problèmes et les remarques (pas de test lui-même). |

## 4. Ce qui doit être exercé

**Participant**
1. Scanner le QR code, voir la page de l'événement et le règlement.
2. S'inscrire : numéro (06 ou 07), code SMS, prénom, consentements. Avec et sans photo de profil.
3. Envoyer une **photo** et une **vidéo** (moins de 30 s), dans des défis différents.
4. Essayer d'envoyer une **vidéo de plus de 30 s** : le refus doit être clair.
5. Couper le réseau (mode avion) pendant un envoi, puis le remettre : l'envoi doit reprendre seul et le bandeau l'indiquer.
6. **Se déconnecter puis se reconnecter** avec le même numéro : on retrouve son espace.
7. Retirer un de ses contenus.
8. Voter pour le Prix du public (3 votes, jamais pour soi).
9. Lire les notifications : défi réussi, refus avec motif, commentaire du jury, rang.
10. Installer l'application sur l'écran d'accueil.

**Jury** : file « à la chaîne » et grille, validation et refus (avec motif), coups de cœur (3 par type), notes et commentaires, voir les notes manquantes.

**Organisation** : mur photo en direct sur un écran, classement provisoire puis définitif, remise des prix, **SMS aux gagnants** (prévisualiser puis envoyer, 5 à 8 gagnants), export ZIP et CSV, vérification du solde de SMS.

## 5. Fiche pour les testeurs (à envoyer avec le lien)

> **Bonjour et merci !** Tu testes l'application du concours photo d'Ambyans Twopikal. Rien n'est « pour de vrai » : les photos seront effacées après le test.
> 1. Ouvre le lien reçu (ou scanne le QR code) sur ton téléphone.
> 2. Inscris-toi avec ton numéro de mobile : tu reçois un code par SMS.
> 3. Envoie au moins **3 contenus** (1 vidéo courte, 2 photos) dans 3 défis différents.
> 4. Reviens plus tard, regarde tes notifications et ton classement.
> 5. Dis-nous ce qui t'a gêné ou surpris, même un détail.
>
> **À nous répondre** : ton téléphone (modèle), ton réseau (wifi / 4G), le temps d'arrivée du SMS, ce qui t'a bloqué, ce que tu as aimé, une note de 1 à 5 pour la facilité.

## 6. Ce qu'on mesure

| Mesure | Seuil de réussite |
| --- | --- |
| Inscriptions terminées sans aide | au moins 90 % |
| Délai d'arrivée du SMS | moins de 30 s pour au moins 90 % |
| Envois photo réussis du premier coup | au moins 95 % |
| Vidéos reprises après coupure réseau | 100 % (aucun échec silencieux) |
| Erreurs visibles dans la console ou plantages | aucun |
| Délai entre un envoi et sa validation visible par le participant | moins de 10 s |
| Note moyenne de facilité (testeurs) | 4 sur 5 ou plus |
| Crédits SMS consommés | noter le chiffre, pour calibrer le 19 décembre |

## 7. Critères pour dire « go » avant le 30 novembre

- Aucun bloquant : inscription, envoi et notation fonctionnent pour tout le monde.
- Les problèmes de gravité moyenne ont un correctif prévu avant le gel du 7 décembre.
- Le bureau valide : durées de conservation, règle pour les mineurs visibles sur les photos, départage du Prix du public, canal de secours du plan B.
- Les créoles sont relus (traduction repoussée à la fin du projet).

## 8. Après le test (lundi 23 novembre)

1. Recueillir les fiches, classer les retours : bloquant, important, confort.
2. Exporter le ZIP et le CSV de l'événement de test (à conserver pour le bilan).
3. Nettoyer l'événement de test : supprimer les participants (SQL Editor) et les fichiers `media` (Storage), comme au nettoyage précédent.
4. Planifier les corrections (semaine S7, aucune nouvelle fonction après le 30 novembre).
