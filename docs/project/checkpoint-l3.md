# Checkpoint L3 — 19 octobre 2026

L0–L2 sont intégrés. L3 B3a–B3c est développé et qualifié sur la branche dossiers préservée ; [PR #24](https://github.com/Alexdmt0110/Barbook/pull/24) ouverte, vrai diff contrôlé et six checks PR verts sur cbe399d. **Merge L3, CONTRACT, base propriétaire et production non autorisés.** La ref documentaire finale est à résoudre depuis GitHub et [agent-handoff.md](agent-handoff.md).

## Intégration autorisée du socle

| PR | Merge commit | Heure UTC le 19 octobre |
| --- | --- | --- |
| #20 pilotage | 75fea4888cd2644fb633832c6393d631b6290b93 | 07:09:14 |
| #21 New/null | eaeeac8b9dc76b4b4af239e1b9d3063d424a30c8 | 07:12:35 |
| #22 dépendances | eea1a636dc91d470694c40aba15fecbd69ec23fc | 07:19:47 |
| #23 intégration | c0fc5fd3facd42c112673bbfc47285ba4547259b | 07:27:27 |

Chaque branche a reçu le main précédent par merge sans réécriture, puis Review Gate/CI avant fusion. Main final : six checks success, runs39216105309/39216105483/39216105591 ;141 backend+NYC,110 frontend,10 garde-fous,37 natifs/quatre Chromium combinés. La combinaison New/null, dépendances et intégration est prouvée.

## Résultat L3 approuvé

| Bloc | Résultat prouvé | Preuves principales |
| --- | --- | --- |
| Conservation | trois commits historiques ancêtres, aucun rebase/force/suppression ; main fusionné dans la branche existante | merge69e54dc614a7c7241f58fe55370c5f877eab560e, contrôles d'ascendance/arbre |
| B3a données | FK CocktailFolder composites, versions non négatives, backfill des liens manquants ; ambiguïté refusée sans suppression | migration EXPAND inchangée +20261019073922 ; SQL hostile, deux ordres d'upgrade, refus/rollback/retry de fixture |
| B3a contrats | folders[], filtre relationnel, version attendue, projection legacy stable ; vieux client refusé devant plusieurs liens | tests HTTP zéro/un/multi, lot étranger,409 et absence de tag orphelin |
| B3b fiche | multi-sélection, création sans perdre les choix, catalogue paginé, brouillon conservé sur 409 et reload explicite | DOM, parent synchronisé, vrais deux dossiers/filtres/remote-save/409 dans Chromium |
| B3b navigation | onglet Dossiers, création à vide, index/recherche/pages et ouverture par UUID | API/DOM et création clavier avant toute recette en navigateur |
| B3c commandes | ajout local/batch borné100 et idempotent, retrait précis, rename/delete versionnés ; aucune recette supprimée | cas étrangers, courses full/full, local/full, ajout/ajout, rename/rename et suppression/ajout ; SQL de rollback |
| B3c parcours | sélection sur deux vraies pages, retrait/réajout, rename, confirmation native, suppression sans perte | recettes/tags/autres dossiers relus via API réelle ; desktop/mobile, trois thèmes et captures |

La création de recette reste séparée du classement ; aucun sous-dossier, édition/suppression de recette, photos ou rôle partagé ajouté. F023 garde CONTRACT différé ; F024 n'autorise pas la suite du catalogue66.

## Qualification finale du code

Head applicatif/tests : `b0bb7574e373a2876b93cf67abf22f671ae7fca3`, base `c0fc5fd3facd42c112673bbfc47285ba4547259b`. Les commits documentaires suivants ne changent pas ces sources.

| Contrôle | Résultat observé |
| --- | --- |
| Backend npm run verify |151 tests/18 suites +1 compatibilité NYC, lint/build/Prisma verts |
| Frontend npm run verify |131 tests/21 fichiers, lint/build et budgets existants verts |
| Garde-fous test DB |10 tests passés |
| Native PostgreSQL/HTTP/migrations |61 tests/5 suites, réellement exécutés sous PostgreSQL16 CI |
| Migrations |6 fraîches, redeploy sans pending, statut à jour, drift nul ; upgrades SQL dans les deux ordres |
| Chromium |4 passés, desktop 1365×900/mobile 390×844 ; quota de 4 inscriptions conservé, zéro mock/retry |
| Lot maximal |100 liens créés, retry added0 et versions stables,100 recettes vues exactement sur cinq pages de 24 |
| Dépendances |backend/frontend complets et production : zéro ; e2e : zéro ; aucun lock ou package modifié par L3 |
| Smoke |API compilée dist/main.js sert /api dans le job natif |

Runs finaux : [Integration39223198122](https://github.com/Alexdmt0110/Barbook/actions/runs/39223198122), [CI39223198121](https://github.com/Alexdmt0110/Barbook/actions/runs/39223198121), [Security39223198101](https://github.com/Alexdmt0110/Barbook/actions/runs/39223198101), six checks success. Les essais DB/Chromium ne sont pas exécutables dans l'environnement Work local ; leurs preuves viennent des jobs et logs lus. Aucun test propriétaire/VPS annoncé.

Captures de succès [artefact 12172691949](https://github.com/Alexdmt0110/Barbook/actions/runs/39223198122/artifacts/12172691949), rétention7 jours : récupérées et inspectées (index/vide, classement, détail desktop/mobile, clair/contrasté ; captures sombres du run précédent aussi contrôlées). Couleurs du header vérifiées après stabilisation des transitions, échappement et largeur conformes. Les captures ne prouvent pas Safari, appareil physique, lecteur d'écran ou zoom 200 % ; L7 reste nécessaire.

## Exploitation et limites

- Deux nouvelles migrations par rapport à main, dont l'EXPAND historique, sans modifier les migrations déjà publiées. Aucun retrait de colonne/données. La nouvelle prévalidation refuse un lien obsolète ou multiple ambigu ; une base réelle concernée exige inventaire/réconciliation décidée, pas une réparation implicite.
- Les tests SQL de rollback/retry ne qualifient pas la récupération des métadonnées Prisma après un migrate deploy réellement échoué. Cela et les sauvegardes/restaurations, images, monitoring et rollback serveur relèvent de L8/D7.
- Ancien payload compatible via le nouveau serveur uniquement pour zéro/un lien. Tous les anciens binaires écrivains incompatibles doivent être retirés avant la bascule multi réelle ; rollback de backend ancien non qualifié. Pas de déploiement rolling prétendu compatible.
- Catalogues legacy folders/tags des anciens filtres restent non paginés (A015 partiel) ; count/items du catalogue recette n'ont pas de snapshot commun garanti sous concurrence (A016), bien que les nouvelles pages traitent une page devenue vide. Browse des dossiers utilise RepeatableRead. Aucun benchmark de charge ou clôture globale de ces dettes n'est annoncé.
- Avertissement pg8 tracé dans l'adaptateur Prisma/interpréteur, non filtré ; requalification avant pg9. Les autres constats de l'audit restent visibles et ne sont pas acceptés par silence.
- Aucun VPS, Nginx, DNS, firewall, certificat, seed/reset propriétaire, production ou nouveau ruleset touché.

## Décisions et prochaine étape

Recommandation : examiner puis autoriser séparément le merge de la PR L3, après contrôle de son head et de ses six checks. Alternative : demander des corrections ciblées sur cette même branche, sans dupliquer les commits historiques.

L'activation des quatre checks supplémentaires comme requis est une décision séparée ; seuls les deux Quality restent actuellement requis par protection. Ne pas l'inclure implicitement dans un accord de merge.

L4 n'est pas autorisé. Avant son code, présenter D1 (bêta privée recommandée ou ouverture publique et ses exigences d'abus/récupération) et D2 (session opaque HttpOnly/Secure recommandée ou JWT mémoire+refresh rotatif), durées et reprise sur appareil partagé. D3–D8 restent ouvertes selon leurs phases ; aucune décision de production ou CONTRACT ne découle d'une validation de ce checkpoint.
