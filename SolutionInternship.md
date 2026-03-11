## 1\. Choix Technologiques

Pour répondre aux besoins de **robustesse** (Backend) et d'**interactivité** (Frontend/Dashboards), je propose l'architecture suivante :

- **Backend : Python & Django**
  - **Pourquoi ?** Python est le langage de référence pour l'automatisation et l'infrastructure. Django offre une structure sécurisée, une administration native pour la gestion des utilisateurs, et facilite l'interaction avec des scripts de monitoring (ping, requêtes HTTP).
  - **Rôle :** Il servira d'API centrale, gérera la logique métier, la base de données, et l'orchestration des tâches de surveillance.
- **Frontend : React.js**
  - **Pourquoi ?** Le projet exige des tableaux de bord "Managériaux" avec des indicateurs en temps réel. React permet de créer une interface dynamique (Single Page Application) qui se met à jour sans recharger la page, offrant une expérience utilisateur fluide pour les équipes de support.
  - **Rôle :** Affichage des tickets, graphiques de performance, et alertes visuelles.
- **Base de Données : PostgreSQL**
  - **Pourquoi ?** Pour garantir l'intégrité des données (ACID) et la traçabilité complète des incidents, indispensable pour l'analyse post-mortem.
- **Tâches Asynchrones : Celery + Redis**
  - **Pourquoi ?** C'est le cœur du module de "Supervision". Celery permettra d'exécuter les tests de disponibilité (ping serveurs) en arrière-plan toutes les X minutes sans bloquer l'interface web.

## 2\. Modules Fonctionnels Détaillés

Voici comment je compte traduire les objectifs du document (Opérationnel, Technique, Managérial) en fonctionnalités concrètes :

**Module A : La supervision automatisée**

_Ce module répond à l'objectif technique d'intégration de la détection._

- **Sondes Configurables :** Possibilité d'ajouter une "Ressource" (Serveur, API, Routeur) et de définir son type de test (Ping ICMP, Test de port TCP, Requête HTTP GET).
- **Heartbeat :** Un script tourne toutes X les minutes. Si une ressource ne répond pas ou renvoie une erreur (ex: 500 Internal Server Error), le système :
  - Vérifie s'il existe déjà un ticket ouvert pour cette ressource (pour éviter les doublons).
  - Si non, crée automatiquement un Incident avec la source "Système" et la sévérité "Critique".

**Module B : Le Centre de Gestion**

_Ce module centralise la gestion quotidienne._

- **Création Multicanale :** Interface pour la saisie manuelle (appel client) + API pour la création automatique.
- **Cycle de Vie ITIL :** Implémentation stricte des états :  
    Nouveau  Assigné (Prise en charge)  En cours (Investigation)  Résolu  Clos.
- **Système de Notification :** Envoi automatique d'email aux administrateurs lors de la création d'un ticket critique ou du dépassement d'un délai de résolution (SLA).

**Module C : Dashboards & Analytics**

_Ce module offre la visibilité nécessaire aux décideurs._

- **Vue "Temps Réel" :** Une carte des infrastructures avec des indicateurs visuels (Vert/Orange/Rouge) selon l'état des services.
- **KPIs (Indicateurs Clés) :** Calcul automatique affiché via des graphiques (bibliothèque _Chart.js_ ou _Recharts_) :
  - **MTTR (Mean Time To Repair) :** Temps moyen entre la création et la résolution.
  - **Top Flops :** Les 5 services tombant le plus souvent en panne.
  - **Taux de disponibilité :** Pourcentage d'uptime sur le mois en cours.

## 3\. Feuille de Route d'Implémentation (Roadmap)

Je prévois de découper le stage en 4 phases distinctes (Sprints) pour assurer une livraison progressive.

**Phase 1 : Conception & Socle Backend (Semaines 1-3)**

- **Analyse :** Modélisation de la base de données (UML/MCD) : Tables _Users, Assets, Incidents, Logs_.
- **Dev Backend :** Initialisation du projet Django. Création des modèles et des APIs CRUD (Create, Read, Update, Delete) via Django REST Framework.
- **Authentification :** Mise en place de la gestion des droits (Admin vs Technicien Support).
- _Livrable :_ Une API fonctionnelle testable via Postman.

**Phase 2 : Le Moteur de Supervision (Semaines 4-6)**

- **Automation :** Configuration de Redis et Celery.
- **Scripting :** Développement des scripts Python pour pinger les serveurs et analyser les réponses HTTP.
- **Liaison :** Logique de création automatique de ticket en cas d'échec du test.
- _Livrable :_ Le système détecte seul si un serveur test est coupé.

**Phase 3 : Interface Utilisateur React (Semaines 7-10)**

- **UI/UX :** Création des composants React (Tableaux de tickets, Formulaires de saisie).
- **Intégration :** Consommation des APIs Django par le frontend React.
- **Dashboard :** Intégration des graphiques dynamiques pour les KPIs.
- _Livrable :_ Une application web complète et navigable.

**Phase 4 : Finitions & Déploiement (Semaines 11-12)**

- **Analytique :** Ajout des fonctionnalités d'export (PDF/Excel) pour les rapports mensuels.
- **Documentation :** Rédaction de la documentation technique (installation) et utilisateur.
- **Déploiement :** Mise en production sur un serveur de test interne ICOSNET