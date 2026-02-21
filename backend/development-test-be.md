# Backend Development & Testing Guide

## Prerequisites

- **Docker Desktop** installed and running (for PostgreSQL)
- **Python 3.11+** installed
- Terminal open at `d:\FOOTBALL\backend`

---

## Step 1: Start PostgreSQL via Docker

```bash
docker-compose up -d
```

Verify it's running:
```bash
docker ps
```

You should see `football_betting_db` container running on port `5432`.

---

## Step 2: Activate Virtual Environment

```bash
venv\Scripts\activate
```

---

## Step 3: Create Tables & Seed Data

```bash
python -m app.seed
```

Expected output:
```
Seed complete: 1 admin + 5 users created.
Admin login: admin@mailinator.com / admin@123
```

---

## Step 4: Start the Backend Server

```bash
uvicorn app.main:app --reload
```

Server starts at: **http://localhost:8000**  
Swagger docs at: **http://localhost:8000/docs**

---

## Seeded Users

| Username | Email | Password | Role |
|---|---|---|---|
| admin | admin@mailinator.com | admin@123 | Admin |
| rahul | rahul@mailinator.com | rahul@123 | User |
| priya | priya@mailinator.com | priya@123 | User |
| arjun | arjun@mailinator.com | arjun@123 | User |
| sneha | sneha@mailinator.com | sneha@123 | User |
| vikram | vikram@mailinator.com | vikram@123 | User |

---

## Postman / cURL Test Collection

All requests use `http://localhost:8000` as the base URL.  
For authenticated endpoints, set the `Authorization` header to `Bearer <token>` (get token from login).

---

### 1. Health Check

```
GET http://localhost:8000/health
```

Expected: `{"status": "ok"}`

---

### 2. AUTH — Login as Admin

```
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "admin@mailinator.com",
  "password": "admin@123"
}
```

Expected: `{"access_token": "<ADMIN_TOKEN>", "token_type": "bearer"}`

**Save the `access_token` value — you'll use it as `ADMIN_TOKEN` in all admin requests below.**

---

### 3. AUTH — Login as Regular User

```
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "rahul@mailinator.com",
  "password": "rahul@123"
}
```

**Save this as `USER_TOKEN`.**

---

### 4. AUTH — Get My Profile

```
GET http://localhost:8000/auth/me
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: Admin profile with balance `999999`.

```
GET http://localhost:8000/auth/me
Authorization: Bearer <USER_TOKEN>
```

Expected: Rahul's profile with balance `1000`.

---

### 5. ADMIN — Create Another User

```
POST http://localhost:8000/auth/users
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "username": "deepak",
  "email": "deepak@mailinator.com",
  "password": "deepak@123",
  "is_admin": false
}
```

Expected: 201 Created with user profile returned.

---

### 6. ADMIN — List All Users

```
GET http://localhost:8000/admin/users
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: Array of all users.

---

### 7. ADMIN — Adjust User Balance

First, copy Rahul's user `id` from step 6 response. Then:

```
POST http://localhost:8000/admin/users/<RAHUL_USER_ID>/adjust-balance
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "amount": 500,
  "reason": "Bonus for joining early"
}
```

Expected: `{"message": "Balance adjusted to 1500", "new_balance": 1500}`

---

### 8. ADMIN — Sync Competitions from Football API

> **Note:** This requires a valid `FOOTBALL_API_KEY` in your `.env` file.  
> Get a free key from https://www.football-data.org/client/register  
> After getting the key, update `.env` and restart the server.

```
POST http://localhost:8000/admin/sync/competitions
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: `{"created": N, "updated": 0, "skipped": 0}` (N = number of competitions fetched)

---

### 9. ADMIN — List Synced Competitions

```
GET http://localhost:8000/admin/competitions
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: Array of competitions with IDs, names, codes.

---

### 10. ADMIN — Create a Tournament

Use a `competition_id` from step 9. For example, World Cup = `2000`, Champions League = `2001`.

```
POST http://localhost:8000/admin/tournaments
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "FIFA World Cup 2026",
  "competition_id": 2000
}
```

Expected: 201 Created with tournament object. **Save the tournament `id`.**

---

### 11. ADMIN — Sync Teams for Tournament

```
POST http://localhost:8000/admin/tournaments/<TOURNAMENT_ID>/sync-teams
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: `{"created": N, "updated": 0, "skipped": 0}`

---

### 12. ADMIN — Sync Fixtures for Tournament

```
POST http://localhost:8000/admin/tournaments/<TOURNAMENT_ID>/sync-fixtures
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: `{"created": N, "updated": 0, "skipped": 0}`

---

### 12b. ADMIN — List Synced Teams

Use the same `competition_id` you used when creating the tournament (e.g., `2000`).

```
GET http://localhost:8000/admin/competitions/<COMPETITION_ID>/teams
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: Array of teams with `id`, `name`, `short_name`, `crest_url`. **Pick any `team_id` from this list for the next step.**

---

### 13. ADMIN — Sync Squad for a Team

Use a `team_id` from step 12b above.

```
POST http://localhost:8000/admin/teams/<TEAM_ID>/sync-squad
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: `{"created": N, "updated": 0, "skipped": 0}`

---

### 14. ADMIN — List Players for a Team

```
GET http://localhost:8000/admin/teams/762/players
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: Array of players with names, positions, nationalities.

---

### 15. ADMIN — Create an Event (Match)

```
POST http://localhost:8000/admin/events
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "tournament_id": "<TOURNAMENT_ID>",
  "title": "Argentina vs France — Group Stage",
  "description": "Match Day 1",
  "starts_at": "2026-06-11T14:00:00Z"
}
```

Expected: 201 Created. **Save the event `id`.**

---

### 16. ADMIN — Create a Match Result Market

```
POST http://localhost:8000/admin/markets
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "event_id": "<EVENT_ID>",
  "question": "Match Result — Argentina vs France",
  "market_type": "match_result",
  "status": "open",
  "selections": [
    {"label": "Argentina Win", "odds": 2.10},
    {"label": "Draw", "odds": 3.25},
    {"label": "France Win", "odds": 3.50}
  ]
}
```

Expected: 201 Created with market + selections. **Save `market_id` and the `selection_id` values.**

---

### 17. ADMIN — Create a Special Fun Market

```
POST http://localhost:8000/admin/markets
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "event_id": "<EVENT_ID>",
  "question": "Will VAR overturn a goal in this match?",
  "market_type": "special",
  "status": "open",
  "selections": [
    {"label": "Yes", "odds": 3.00},
    {"label": "No", "odds": 1.40}
  ]
}
```

---

### 18. USER — Browse Markets for an Event

```
GET http://localhost:8000/events/<EVENT_ID>/markets
Authorization: Bearer <USER_TOKEN>
```

Expected: Array of open markets with their selections and odds.

---

### 19. USER — Place a Bet 🎯

Use Rahul's `USER_TOKEN` and one of the `selection_id` values from step 16.

```
POST http://localhost:8000/bets
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "selection_id": "<SELECTION_ID_ARGENTINA_WIN>",
  "stake": 200
}
```

Expected: 201 Created.
```json
{
  "id": "...",
  "stake": 200,
  "potential_payout": 420,
  "status": "open"
}
```

Check balance dropped: `GET /auth/me` should show `balance: 800` (or 1300 if you did the top-up in step 7).

---

### 20. USER — Place Another Bet (Different User)

Login as Priya and place a bet on France:

```
POST http://localhost:8000/auth/login
Content-Type: application/json

{
  "email": "priya@mailinator.com",
  "password": "priya@123"
}
```

```
POST http://localhost:8000/bets
Authorization: Bearer <PRIYA_TOKEN>
Content-Type: application/json

{
  "selection_id": "<SELECTION_ID_FRANCE_WIN>",
  "stake": 300
}
```

---

### 21. USER — View My Bets

```
GET http://localhost:8000/bets/me
Authorization: Bearer <USER_TOKEN>
```

Filter by status:
```
GET http://localhost:8000/bets/me?status=open
Authorization: Bearer <USER_TOKEN>
```

---

### 22. ADMIN — Lock Market (Before Kickoff)

```
PATCH http://localhost:8000/admin/markets/<MARKET_ID>/status
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "status": "locked"
}
```

Now try placing a bet — it should fail:
```
POST http://localhost:8000/bets
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "selection_id": "<ANY_SELECTION_ID>",
  "stake": 100
}
```

Expected: `400 — Market is not open for betting (status: locked)`

---

### 23. ADMIN — Settle Market (Argentina Won!) ⚽

```
POST http://localhost:8000/admin/markets/<MARKET_ID>/settle
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "winning_selection_id": "<SELECTION_ID_ARGENTINA_WIN>"
}
```

Expected:
```json
{
  "winners_paid": 1,
  "losers_marked": 1,
  "total_credited": 420
}
```

Now check balances:
- `GET /auth/me` with Rahul's token → balance should be `800 + 420 = 1220` (or +500 if top-up was done)
- `GET /auth/me` with Priya's token → balance should be `700` (lost 300, nothing credited)

---

### 24. ADMIN — Void a Market (Test Refund)

First create a second market, place bets on it, then void:

```
POST http://localhost:8000/admin/markets/<SECOND_MARKET_ID>/void
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: All stakes refunded, all bets marked voided.

---

### 25. Leaderboard — Global

```
GET http://localhost:8000/leaderboard
Authorization: Bearer <USER_TOKEN>
```

Expected: Users ranked by balance, highest first.

---

### 26. Leaderboard — Per Tournament

```
GET http://localhost:8000/leaderboard/<TOURNAMENT_ID>
Authorization: Bearer <USER_TOKEN>
```

Expected: Users ranked by profit/loss within that tournament.

---

### 27. Activity Feed

```
GET http://localhost:8000/feed
Authorization: Bearer <USER_TOKEN>
```

Expected: Recent activities — bet placements, settlements, etc.

```
GET http://localhost:8000/feed?limit=5&offset=0
Authorization: Bearer <USER_TOKEN>
```

---

### 28. Change Password

```
POST http://localhost:8000/auth/change-password
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json

{
  "current_password": "rahul@123",
  "new_password": "rahul@456"
}
```

---

### 29. ADMIN — Deactivate / Activate User

```
POST http://localhost:8000/admin/users/<USER_ID>/deactivate
Authorization: Bearer <ADMIN_TOKEN>
```

Now login as that user should fail. Re-activate:

```
POST http://localhost:8000/admin/users/<USER_ID>/activate
Authorization: Bearer <ADMIN_TOKEN>
```

---

## Recommended Testing Flow

Follow this exact sequence for a clean test run:

1. **Health check** (step 1)
2. **Login as admin** (step 2) → save token
3. **Login as user** (step 3) → save token
4. **Get profiles** (step 4) → verify balances
5. **Sync competitions** (step 8) → needs API key
6. **Create tournament** (step 10)
7. **Sync teams + fixtures** (steps 11–12)
8. **Create event** (step 15)
9. **Create market** (step 16) → save IDs
10. **Place bets** as different users (steps 19–20)
11. **Lock market** (step 22) → verify bet fails
12. **Settle market** (step 23) → verify balances change
13. **Check leaderboard** (step 25) → verify rankings
14. **Check feed** (step 27) → verify activity entries

---

## Stopping Everything

```bash
# Stop the server: Ctrl+C in the terminal

# Stop PostgreSQL:
docker-compose down

# Stop and delete data:
docker-compose down -v
```
