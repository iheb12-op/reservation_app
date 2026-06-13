# Reservation App

A full-stack web application for managing reservations for restaurants, hotels, and similar businesses.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Auth** — Register, login, JWT-based session management
- **Establishments** — Create and manage restaurants/hotels
- **Slots** — Define and manage availability slots
- **Reservations** — Full booking flow for clients
- **Admin Dashboard** — Stats and charts overview
- **Client Dashboard** — Personal reservation history
- **Email Notifications** — Confirmation emails on booking

---

## Tech Stack

- **Framework** — Next.js 16 (App Router)
- **Language** — TypeScript 5
- **UI** — React 19 + Tailwind CSS 4
- **Database** — PostgreSQL + Drizzle ORM
- **Auth** — JWT (jose) + bcryptjs
- **Email** — Nodemailer
- **Validation** — Zod

---

## Getting Started

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
git clone https://github.com/iheb12-op/reservation_app.git
cd reservation_app
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/reservation_db
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # Lint
npm run typecheck  # Type check
```

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT © [iheb12-op](https://github.com/iheb12-op)
