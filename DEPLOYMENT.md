# 🚀 Guide de Déploiement - DossierHub

Ce guide explique comment déployer DossierHub sur un VPS avec Docker et Docker Compose.

## 📋 Prérequis

- VPS avec Docker et Docker Compose installés
- Accès SSH au VPS
- Git configuré sur le VPS (optionnel)

## 🔧 Configuration

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```bash
# Database Configuration
POSTGRES_DB=dossierhub
POSTGRES_USER=dossierhub
POSTGRES_PASSWORD=votre_mot_de_passe_securise
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=3000
JWT_SECRET=votre_secret_jwt_tres_securise
CORS_ORIGIN=https://votre-domaine.com

# Frontend Configuration
FRONTEND_PORT=80
API_URL=http://backend:3000

# Environment
NODE_ENV=production
```

### 2. Secrets GitHub Actions

Pour le déploiement automatique, configurez les secrets suivants dans GitHub :

1. Allez dans **Settings > Secrets and variables > Actions**
2. Ajoutez les secrets suivants :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VPS_HOST` | Adresse IP ou domaine du VPS | `192.168.1.100` ou `vps.example.com` |
| `VPS_USER` | Utilisateur SSH | `root` ou `deploy` |
| `VPS_SSH_KEY` | Clé privée SSH | Contenu de `~/.ssh/id_rsa` |
| `VPS_SSH_PORT` | Port SSH (optionnel) | `22` |
| `VPS_DEPLOY_PATH` | Chemin de déploiement (optionnel) | `/opt/dossierhub` |
| `POSTGRES_DB` | Nom de la base de données | `dossierhub` |
| `POSTGRES_USER` | Utilisateur PostgreSQL | `dossierhub` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `mot_de_passe_securise` |
| `POSTGRES_PORT` | Port PostgreSQL | `5432` |
| `BACKEND_PORT` | Port backend | `3000` |
| `JWT_SECRET` | Secret JWT | `secret_tres_long_et_aleatoire` |
| `CORS_ORIGIN` | Origine CORS autorisée | `https://votre-domaine.com` |
| `FRONTEND_PORT` | Port frontend | `80` |
| `API_URL` | URL de l'API | `http://backend:3000` |

### 3. Génération de la clé SSH

Si vous n'avez pas de clé SSH :

```bash
# Générer une nouvelle clé SSH
ssh-keygen -t rsa -b 4096 -C "github-actions"

# Copier la clé publique sur le VPS
ssh-copy-id -i ~/.ssh/id_rsa.pub user@vps-host

# Afficher la clé privée (à copier dans GitHub Secrets)
cat ~/.ssh/id_rsa
```

## 🐳 Déploiement Local (Test)

### 1. Construire les images

```bash
docker-compose build
```

### 2. Démarrer les services

```bash
docker-compose up -d
```

### 3. Vérifier les logs

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 4. Arrêter les services

```bash
docker-compose down
```

### 5. Nettoyer (supprimer volumes)

```bash
docker-compose down -v
```

## 🚀 Déploiement sur VPS

### Option 1 : Déploiement Automatique (GitHub Actions)

1. Poussez votre code sur GitHub
2. Le workflow se déclenche automatiquement sur chaque push vers `main` ou `master`
3. Vérifiez les logs dans **Actions** sur GitHub

### Option 2 : Déploiement Manuel

1. **Cloner le repository sur le VPS**

```bash
cd /opt
git clone https://github.com/votre-username/dossierhub.git
cd dossierhub
```

2. **Créer le fichier `.env`**

```bash
cp .env.example .env
nano .env  # Éditer avec vos valeurs
```

3. **Construire et démarrer**

```bash
docker-compose build
docker-compose up -d
```

4. **Vérifier le statut**

```bash
docker-compose ps
docker-compose logs -f
```

## 🔒 Configuration Nginx (Reverse Proxy)

Pour exposer l'application via un domaine, configurez Nginx :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔄 Mise à jour

### Avec GitHub Actions

1. Poussez les modifications sur GitHub
2. Le déploiement se fait automatiquement

### Manuellement

```bash
cd /opt/dossierhub
git pull
docker-compose build
docker-compose up -d
docker-compose logs -f
```

## 🗄️ Sauvegarde de la base de données

```bash
# Sauvegarder
docker-compose exec postgres pg_dump -U dossierhub dossierhub > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer
docker-compose exec -T postgres psql -U dossierhub dossierhub < backup.sql
```

## 🐛 Dépannage

### Vérifier les logs

```bash
docker-compose logs -f [service_name]
```

### Redémarrer un service

```bash
docker-compose restart [service_name]
```

### Accéder à la base de données

```bash
docker-compose exec postgres psql -U dossierhub -d dossierhub
```

### Vérifier les health checks

```bash
# Backend
curl http://localhost:3000/api/health

# Frontend
curl http://localhost/health
```

## 📝 Notes

- Les données PostgreSQL sont persistées dans un volume Docker
- Les fichiers JSON du backend sont montés en lecture seule pour la migration initiale
- Le frontend est servi via Nginx avec compression gzip
- Les health checks sont configurés pour tous les services

