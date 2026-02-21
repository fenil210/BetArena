# BetArena - Virtual Football Betting Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A full-stack virtual sports betting platform where users wager play money on football matches with real-time odds and automatic market settlement.

---

## Features

### User Features

- **Virtual Currency** - Start with 1000 coins, bet on matches risk-free
- **Real Football Data** - Live matches from football-data.org API
- **Multiple Market Types** - Match winner, player props, tournament specials
- **Live Odds** - Dynamic odds based on selections
- **Leaderboard** - Compete with friends for top rankings
- **Activity Feed** - See what others are betting on
- **Secure Auth** - JWT-based authentication with role-based access

### Admin Features

- **Tournament Management** - Create tournaments linked to real competitions
- **Event Creation** - Add matches manually or fetch from API (by matchday or stage)
- **Market Creation** - Set up betting markets with custom odds
- **Market Settlement** - Settle markets and auto-distribute winnings
- **Market Voiding** - Cancel markets with full refunds
- **User Management** - Adjust balances, activate/deactivate users
- **Data Sync** - Sync teams, players, and fixtures from football-data.org

---

## System Architecture

### High-Level Architecture

```
                                   +------------------+
                                   |   CloudFront CDN |
                                   |  (Static Assets) |
                                   +--------+---------+
                                            |
                                            v
+------------+        HTTPS        +------------------+        +------------------+
|   Client   |-------------------->|   AWS App Runner |------->|   RDS PostgreSQL |
|  Browser   |                     |   (FastAPI API)  |        |   (Primary DB)   |
+------------+                     +--------+---------+        +------------------+
                                            |
                                            v
                                   +------------------+
                                   |  SSM Parameter   |
                                   |   Store (ENV)    |
                                   +------------------+
                                            |
                                            v
                                   +------------------+
                                   | football-data.org|
                                   |      API         |
                                   +------------------+
```

### Request Flow

```
User Request
     |
     v
+----------------------------+
|    AWS Route 53 (DNS)      |
+----------------------------+
     |
     +------------+------------+
     |                         |
     v                         v
+------------+          +--------------+
| CloudFront |          |  App Runner  |
|  (Static   |          |   (API)      |
|   Assets)  |          +--------------+
+------------+                 |
     |                         v
     |                  +--------------+
     |                  |  SSM Params  |
     |                  |  (Secrets)   |
     |                  +--------------+
     |                         |
     v                         v
+------------+          +--------------+
|  S3 Bucket |          |     RDS      |
|  (React    |          |  PostgreSQL  |
|   Build)   |          +--------------+
+------------+
```

### Database Schema (Simplified)

```
+-------------+       +-------------+       +-------------+
|    User     |       |  Tournament |       |    Event    |
+-------------+       +-------------+       +-------------+
| id (PK)     |<-----+| id (PK)     |<-----+| id (PK)     |
| username    |       | name        |       | tournament_id|
| email       |       | competition_id|     | title       |
| balance     |       | status      |       | match_id    |
| is_admin    |       +-------------+       | starts_at   |
+-------------+                             +-------------+
       |                                           |
       |       +-------------+                     |
       |       |     Bet     |                     |
       |       +-------------+                     |
       +------>| id (PK)     |                     |
               | user_id (FK)|                     |
               | selection_id|                     |
       +------>| stake       |                     |
       |       | status      |                     |
       |       +-------------+                     |
       |                                           |
       |       +-------------+       +-------------+
       |       |  Selection  |       |    Market   |
       |       +-------------+       +-------------+
       +------>| id (PK)     |<-----+| id (PK)     |
               | market_id   |       | event_id    |
               | label       |       | question    |
               | odds        |       | status      |
               | is_winner   |       +-------------+
               +-------------+
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (for local PostgreSQL)

### Backend Setup

```bash
cd backend

# Start PostgreSQL
docker-compose up -d

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your JWT_SECRET_KEY and FOOTBALL_API_KEY

# Seed database with test accounts
python -m app.seed

# Start server
uvicorn app.main:app --reload
```

**Backend runs at:** http://localhost:8000
**API Docs:** http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Set VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

**Frontend runs at:** http://localhost:5173

---

## Test Accounts

After running `python -m app.seed`, use these accounts:

| Role  | Email                | Password  |
| ----- | -------------------- | --------- |
| Admin | admin@mailinator.com | admin@123 |
| User  | fenil@mailinator.com | fenil@123 |

> **Note:** All test accounts use `@mailinator.com` emails with matching passwords.

---

## API Reference

### Authentication

```http
POST /auth/login
GET  /auth/me
POST /auth/change-password
```

### Bets

```http
POST /bets              # Place a bet
GET  /bets/me           # My bet history
```

### Markets

```http
GET  /events/{id}/markets   # Get markets for event
POST /bets                  # Place bet on selection
```

### Admin Endpoints

```http
POST /admin/events              # Create event
POST /admin/markets             # Create market
POST /admin/markets/{id}/settle # Settle with winner
POST /admin/markets/{id}/void   # Void market
POST /admin/sync/competitions   # Sync from API
GET  /admin/tournaments/{id}/matches?matchday=8      # Fetch by matchday
GET  /admin/tournaments/{id}/matches?stage=LAST_16   # Fetch by stage
```

**Full API documentation:** http://localhost:8000/docs

---

## Tech Stack

### Backend

| Technology     | Purpose                               |
| -------------- | ------------------------------------- |
| FastAPI        | High-performance Python web framework |
| SQLAlchemy 2.0 | Modern ORM with type hints            |
| PostgreSQL     | Production-grade database             |
| PyJWT          | JWT authentication                    |
| Pydantic       | Data validation                       |
| httpx          | Async HTTP client for football API    |

### Frontend

| Technology      | Purpose                               |
| --------------- | ------------------------------------- |
| React 19        | Latest React with concurrent features |
| Vite            | Ultra-fast build tool                 |
| Tailwind CSS    | Utility-first styling                 |
| React Query     | Server state management               |
| React Router v7 | Client-side routing                   |
| React Hot Toast | Toast notifications                   |
| Lucide React    | Beautiful icons                       |

---

## Deployment on AWS

### Architecture Overview

```
Internet
    |
    v
+----------------------------------+
|         AWS CloudFront           |
|    (CDN for static assets +      |
|     API Gateway for /api/*)      |
+----------------------------------+
    |                    |
    v                    v
+--------------+   +------------------+
|   S3 Bucket  |   |  AWS App Runner  |
|  (Frontend)  |   |  (FastAPI API)   |
+--------------+   +------------------+
                          |
                          v
                   +------------------+
                   |  RDS PostgreSQL  |
                   |   (Database)     |
                   +------------------+
                          ^
                          |
                   +------------------+
                   |  SSM Parameter   |
                   |   Store (ENV)    |
                   +------------------+
```

### Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed locally
- AWS account with access to: ECR, App Runner, RDS, S3, CloudFront

### Backend Deployment

#### 1. Create ECR Repository

```bash
aws ecr create-repository --repository-name betarena-backend --region ap-south-1
```

#### 2. Build and Push Docker Image

```bash
cd backend

# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

# Build image
docker build -t betarena-backend .

# Tag image
docker tag betarena-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/betarena-backend:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/betarena-backend:latest
```

#### 3. Create RDS PostgreSQL Instance

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name betarena-db-subnet \
    --db-subnet-group-description "Subnet group for BetArena DB" \
    --subnet-ids '["subnet-xxxx", "subnet-yyyy"]'

# Create PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier betarena-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 16 \
    --allocated-storage 20 \
    --storage-type gp2 \
    --master-username postgres \
    --master-user-password YOUR_SECURE_PASSWORD \
    --db-subnet-group-name betarena-db-subnet \
    --vpc-security-group-ids sg-xxxxx \
    --backup-retention-period 7 \
    --no-publicly-accessible
```

#### 4. Store Secrets in SSM Parameter Store

```bash
aws ssm put-parameter \
    --name /betarena/prod/database_url \
    --value "postgresql://postgres:PASSWORD@betarena-db.xxxx.ap-south-1.rds.amazonaws.com:5432/betarena" \
    --type SecureString

aws ssm put-parameter \
    --name /betarena/prod/jwt_secret \
    --value "your-secret-jwt-key-any-random" \
    --type SecureString

aws ssm put-parameter \
    --name /betarena/prod/football_api_key \
    --value "your-football-data-org-api-key" \
    --type SecureString
```

#### 5. Deploy to App Runner

```bash
aws apprunner create-service \
    --service-name betarena-backend \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/betarena-backend:latest",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": "8000",
                "RuntimeEnvironmentVariables": {
                    "ENVIRONMENT": "production"
                },
                "RuntimeEnvironmentSecrets": {
                    "DATABASE_URL": "/betarena/prod/database_url",
                    "JWT_SECRET_KEY": "/betarena/prod/jwt_secret",
                    "FOOTBALL_API_KEY": "/betarena/prod/football_api_key"
                }
            }
        }
    }' \
    --instance-configuration '{
        "Cpu": "1 vCPU",
        "Memory": "2 GB"
    }'
```

### Frontend Deployment

#### 1. Build for Production

```bash
cd frontend

# Set production API URL
$env:VITE_API_URL = "https://your-app-runner-url.ap-south-1.awsapprunner.com"  # PowerShell
export VITE_API_URL=https://your-app-runner-url.ap-south-1.awsapprunner.com    # Bash

# Install dependencies
npm install

# Build
npm run build
```

#### 2. Create S3 Bucket

```bash
aws s3api create-bucket \
    --bucket betarena-frontend \
    --region ap-south-1 \
    --create-bucket-configuration LocationConstraint=ap-south-1

# Enable static website hosting
aws s3 website s3://betarena-frontend/ --index-document index.html --error-document index.html

# Set bucket policy for public read
aws s3api put-bucket-policy --bucket betarena-frontend --policy '{
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::betarena-frontend/*"
    }]
}'
```

#### 3. Upload Build Files

```bash
aws s3 sync dist/ s3://betarena-frontend/ --delete
```

#### 4. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
    --origin-domain-name betarena-frontend.s3.ap-south-1.amazonaws.com \
    --default-root-object index.html \
    --no-query-string-forward
```

#### 5. Invalidate Cache (After Updates)

```bash
aws cloudfront create-invalidation \
    --distribution-id YOUR_DISTRIBUTION_ID \
    --paths "/*"
```

### Post-Deployment

1. **Seed Production Database:**

   ```bash
   # Connect to App Runner service
   aws apprunner create-deployment --service-arn arn:aws:apprunner:ap-south-1:xxxx:service/betarena-backend/xxxx

   # Seed data (run once)
   # Use AWS Systems Manager Session Manager or create a one-off task
   ```
2. **Configure CORS:**

   - Update backend `CORS_ORIGINS` environment variable with CloudFront domain
3. **Verify Deployment:**

   - Frontend: https://your-cloudfront-domain.cloudfront.net
   - Backend: https://your-app-runner-url.ap-south-1.awsapprunner.com
   - API Docs: https://your-app-runner-url.ap-south-1.awsapprunner.com/docs

---

## Development

### Backend Testing

```bash
# Run health check
curl http://localhost:8000/health

# View API docs
open http://localhost:8000/docs
```

### Frontend Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

---

This project is for educational purposes.
