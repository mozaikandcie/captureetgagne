-- Données d'exemple (celles du prototype). À exécuter sur un projet de développement uniquement.
-- Les comptes jury/organisateur et les participants dépendent de auth.users : à créer via l'app,
-- puis à rattacher avec :
--   insert into staff (event_id, user_id, role, label)
--   values ('11111111-1111-1111-1111-111111111111', '<uuid auth.users>', 'organizer', 'Président');

insert into events (id, name, date_label, place, message, prizes, ends_at, rules, status) values (
  '11111111-1111-1111-1111-111111111111',
  'Le Grand Chanté Nwèl d''Ambyans', 'Samedi 19 décembre 2026', 'Lormont',
  'Prenez la soirée en photo et en vidéo ! Relevez un maximum de défis : le jury de l''association choisira les plus belles images.',
  '',
  null,
  $rules$1. Le concours Capture et Gagne est organisé par l'association Ambyans Twopikal.
2. La participation est gratuite et ouverte à toute personne présente à l'événement. Les mineurs participent avec l'accord d'un parent.
3. Chaque participant peut envoyer 2 contenus au maximum par défi. Les vidéos durent 30 secondes au maximum.
4. L'association vérifie chaque contenu avant de le noter. Tout contenu inapproprié est refusé.
5. Le jury de l'association note chaque contenu sur 10, selon trois critères : respect du défi, qualité et cadrage, originalité. Score final sur 100 : 30 % participation, 70 % note du jury. Chaque contenu est noté par tous les jurés. En cas d'égalité, on retient la meilleure note obtenue, puis le nombre de défis validés, puis l'ordre d'arrivée des envois.
6. Les gagnants sont annoncés à la fin de l'événement.
7. En participant, vous autorisez l'association à utiliser vos contenus pour sa communication, avec mention de votre nom. Vous pouvez retirer un contenu à tout moment depuis « Mes contenus ».
8. Vos coordonnées servent uniquement à vous prévenir des résultats. Elles ne sont jamais transmises à des tiers.$rules$,
  'live'
) on conflict (id) do nothing;

insert into challenges (id, event_id, position, title, hint, tip, culture, kind) values
('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1,
  '{"fr":"Plan large de la salle"}', '{"fr":"Toute l''ambiance en une image, vue d''en haut si possible"}',
  '{"fr":"Montez sur une marche ou une chaise (en sécurité !), tenez le téléphone à l''horizontale et attendez que la piste soit pleine."}',
  null, 'photo'),
('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2,
  '{"fr":"Le détail madras"}', '{"fr":"Gros plan sur un tissu, un bijou ou une coiffe"}',
  '{"fr":"Approchez-vous à environ 30 cm, cherchez une lumière douce et évitez le flash qui écrase les couleurs."}',
  '{"fr":"Le madras est un tissu à carreaux venu de la région de Madras, en Inde. Il est devenu l''emblème des tenues créoles. Selon la tradition, le nombre de pointes du foulard noué sur la tête indiquait la situation amoureuse de la femme qui le portait."}',
  'photo'),
('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 3,
  '{"fr":"Le moment de la danse"}', '{"fr":"Capturer le mouvement sur la piste"}',
  '{"fr":"Utilisez le mode rafale ou filmez quelques secondes : un léger flou de mouvement rend la danse vivante."}',
  '{"fr":"Le chanté Nwèl est une tradition antillaise : pendant l''Avent, on se retrouve pour chanter des cantiques de Noël en créole et en français, au rythme du tambour, du chacha et du ti-bwa."}',
  'both'),
('c0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 4,
  '{"fr":"Avec un organisateur"}', '{"fr":"Une photo avec un membre de l''association"}',
  '{"fr":"Placez les visages face à la lumière, jamais dos à une fenêtre ou à un projecteur."}',
  null, 'photo'),
('c0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 5,
  '{"fr":"15 secondes d''ambiance"}', '{"fr":"Vidéo courte, son compris"}',
  '{"fr":"Filmez à l''horizontale, bougez lentement et gardez le doigt loin du micro."}',
  '{"fr":"Le ti-bwa, ce sont deux baguettes frappées sur un morceau de bambou posé horizontalement. Il donne le rythme de nombreuses musiques traditionnelles des Antilles."}',
  'video')
on conflict (id) do nothing;
