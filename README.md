# CoreMan — Premium Clothing & Lifestyle E-Commerce

A full-stack e-commerce platform built with **Spring Boot 3** (Java 21) + **React 19** (Vite).

## Quick Start

### Prerequisites
- Java 21+
- Node.js 20+
- PostgreSQL (or [Supabase](https://supabase.com) free tier)

### Backend
```bash
cd backend
# Set database URL (or use Supabase):
export DATABASE_URL=jdbc:postgresql://localhost:5432/coreman
export DATABASE_USER=postgres
export DATABASE_PASSWORD=postgres

./gradlew bootRun
```
API runs at `http://localhost:8080`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173`

### Default Accounts (seeded on first run)
| Email | Password | Role |
|---|---|---|
| admin@coreman.com | admin123 | Admin |
| demo@coreman.com | demo123 | Customer |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.5, Spring Security, Spring Data JPA |
| Frontend | React 19, Vite 6, React Router, TanStack Query |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + refresh tokens) |
| Styling | CSS custom properties, dark theme |

## Project Structure
```
coreman/
├── backend/                    # Spring Boot REST API
│   └── src/main/java/com/coreman/
│       ├── config/             # Security, CORS, DataSeeder
│       ├── controller/         # REST controllers
│       ├── service/            # Business logic
│       ├── repository/         # Spring Data JPA
│       ├── model/              # JPA entities
│       ├── dto/                # Request/Response DTOs
│       ├── security/           # JWT provider, filter
│       └── exception/          # Error handling
├── frontend/                   # React SPA
│   └── src/
│       ├── components/         # Navbar, Footer, ProductCard
│       ├── pages/              # All page components
│       ├── context/            # Auth + Cart state
│       └── api/                # Axios client
└── README.md
```
