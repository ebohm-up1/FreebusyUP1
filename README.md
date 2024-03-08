
README pour le Repo Recherche Créneaux
Description du projet

Ce projet vise à développer un outil pour la recherche de créneaux dans un planning.

Le but est de fournir une interface simple et intuitive pour rechercher des créneaux disponibles en fonction de différents critères, tels que les agendas par utilisateur, la date, l'heure, la durée


Fonctionnalités

Recherche de créneaux par date, heure, durée
Affichage des créneaux disponibles sous forme de liste
Possibilité d'envoyer une invitation aux participants réserver des créneaux


Technologies utilisées

PHP/Composer
JS

Librairies / Dépendance

Pour la séléction des utilisateurs, le projet fait appel à une api : "wsgroups"
qui renvoie les identifiants des utilisateurs de type "uid"

Dans le cadre du développement du projet, l'appel se fait sur un agenda kronolith
avec le paramètre du fichier .env : URL_FREEBUSY

Configuration

Fichier .env : regroupe les configurations

La configuration se fait en créant un fichier .env sur la base du fichier .env.example

URL_FREEBUSY : url api récupération du calendrier.


Tests Phpunit

Des tests phpunit pour éviter des régréssions sont faits.

Pour le moment, la classe testée est FBCompare

Ceux-ci se trouvent dans le répertoire tests/FBCompareTest-ID/

Une variable d'environnement doit être initialisée pour choisir le numéro du test

Exemple commande pour choisir le test 1:
FBCompareTestId=1 vendor/bin/phpunit tests/FBCompareTest.php

Les données de test sont sous forme de json, ce sont des données serialisées, il y'a 3 fichiers qui correspondent aux classes instanciées:
stdenv.json : stdClass stdEnv
fbparams.json : class FBParams
fbform.json : class FBForm


Ce projet est sous licence Apache 2.
