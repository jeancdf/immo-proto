# 🐳 Docker Setup - DossierHub

## 📦 Structure

```
.
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.yml
├── .env.example
└── .github/workflows/deploy.yml
```

## 🚀 Démarrage Rapide

### 1. Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

### 2. Lancer l'application

```bash
# Construire et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

### 3. Accéder à l'application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 🔧 Commandes Utiles

```bash
# Arrêter les services
docker-compose down

# Redémarrer un service
docker-compose restart backend

# Voir les logs d'un service
docker-compose logs -f frontend

# Reconstruire les images
docker-compose build --no-cache

# Nettoyer (supprimer volumes)
docker-compose down -v
```

## 📝 Variables d'Environnement

Voir `.env.example` pour la liste complète des variables.

**Important**: Changez tous les mots de passe et secrets en production !

## 🔒 Sécurité

- Ne commitez jamais le fichier `.env`
- Utilisez des secrets forts pour `POSTGRES_PASSWORD` et `JWT_SECRET`
- Configurez `CORS_ORIGIN` avec votre domaine de production
- Utilisez HTTPS en production (via reverse proxy Nginx)

## 🐛 Dépannage

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier les ports
netstat -tulpn | grep -E ':(80|3000|5432)'
```

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs PostgreSQL
docker-compose logs postgres
```

### Reconstruire depuis zéro

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

