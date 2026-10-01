# SnapURL - NestJS URL Shortener & Analytics Platform

A high-performance URL Shortener service with click tracking, custom aliases, link expiration, and an interactive modern web dashboard, built with NestJS, TypeORM, and PostgreSQL.

---

## 🚀 Features

- **⚡ Instant URL Shortening**: Generates collision-resistant unique 7-character short codes using `nanoid`.
- **🏷️ Custom Aliases**: Support for custom human-readable aliases (e.g. `/my-promo-link`).
- **⏳ Link Expiration / TTL**: Optional TTL (1 hour, 24 hours, 7 days, 30 days, or custom date) with HTTP 410 Gone handler.
- **📊 Real-time Click Analytics**: Tracks total clicks, referrers, browsers, operating systems, devices, and recent click logs.
- **📱 Built-in QR Code Generator**: Generates instant QR codes for any shortened URL.
- **🎨 Glassmorphic Web Dashboard**: Built-in interactive dashboard served from `/`.
- **🛡️ Request Validation & Sanitization**: Validates URLs, custom alias syntax, and payloads with `class-validator`.

---

## 🛠️ Tech Stack

- **Backend**: [NestJS](https://nestjs.com/) (v12) + Express
- **Database & ORM**: PostgreSQL + [TypeORM](https://typeorm.io/)
- **Frontend Dashboard**: HTML5, CSS3, JavaScript (Chart.js, QRCode.js)
- **ID Generation**: `nanoid`
- **User-Agent Parsing**: `ua-parser-js`

---

## ⚙️ Configuration & Environment

Edit `.env` (or copy from `.env.example`):

```env
PORT=3000
BASE_URL=http://localhost:3000

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener
DB_SYNC=true
DB_LOGGING=false
```

---

## 🚦 Quick Start

### 1. Start PostgreSQL (if using Docker)
```bash
docker compose up -d
```
*(Or connect to your existing PostgreSQL server using credentials in `.env`)*

### 2. Run the NestJS Application
```bash
# Development mode with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 3. Open Web Dashboard
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Reference

### 1. Shorten a URL
`POST /api/urls`

**Request Body:**
```json
{
  "originalUrl": "https://example.com/some/long/link",
  "customAlias": "custom-name",         // Optional (alphanumeric, dashes, underscores)
  "title": "Campaign Link",              // Optional
  "expiresInMinutes": 1440               // Optional (in minutes)
}
```

**Response (201 Created):**
```json
{
  "id": "b1fa85dd-94a3-4871-8bc6-f8754b23d5ee",
  "originalUrl": "https://example.com/some/long/link",
  "shortCode": "k8X2a9Q",
  "shortUrl": "http://localhost:3000/custom-name",
  "customAlias": "custom-name",
  "title": "Campaign Link",
  "expiresAt": "2026-10-02T16:00:00.000Z",
  "isExpired": false,
  "clicksCount": 0,
  "isActive": true,
  "createdAt": "2026-10-01T16:00:00.000Z",
  "updatedAt": "2026-10-01T16:00:00.000Z"
}
```

### 2. List All Shortened URLs
`GET /api/urls`

### 3. Get Detailed Analytics
`GET /api/urls/:codeOrId/analytics`

### 4. Delete a Shortened URL
`DELETE /api/urls/:id`

### 5. Link Redirection
`GET /:code` -> HTTP 302 Redirect to `originalUrl` + Click tracking recorded asynchronously.
