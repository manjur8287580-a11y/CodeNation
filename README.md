# Integrated Polar Expedition Logistics & Asset Management System — Prototype

A working prototype of the platform described in the project proposal. It's a single
Node/Express app that serves a REST API plus a browser-based operations console covering
all five core modules:

1. **Expedition Planning** — create and track expedition plans (route, leader, team size, window, status)
2. **Cargo Tracking** — manifest logging with live status (staged → in-transit → delivered/delayed)
3. **Inventory Management** — stock levels per location with automatic low-stock flagging
4. **Personnel Movement** — roster, location, last check-in, overdue detection
5. **Emergency Response** — one-click incident declaration that surfaces the affected person's
   last known position, nearby personnel, and nearby medical/safety inventory in real time

The dashboard view aggregates live counts and alerts across all five modules into a single
operating picture, exactly as described in the proposal.

## What this is (and isn't)

This is a **functional prototype**, not a production system:

- Data is stored **in memory** and resets whenever the server restarts. There's no database.
- There's no authentication/role-based access control yet — every user sees everything.
- "Satellite sync" and offline-first field devices are **not** implemented here; this
  prototype demonstrates the core workflows and data model that those features would sit on
  top of in a production build (see Section 6, "System Architecture," in the proposal).
- Seed data is included so the app is immediately explorable without manual setup.

## Requirements

- [Node.js](https://nodejs.org/) 18 or later (18 LTS, 20 LTS, or 22 LTS all work)
- npm (bundled with Node.js)

## Setup

```bash
# 1. Unzip and enter the project
cd polar-expedition-prototype

# 2. Install dependencies (just Express)
npm install

# 3. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

To use a different port: `PORT=4000 npm start`.

## Project structure

```
polar-expedition-prototype/
├── server.js              Express app: REST API + static file serving
├── data/
│   └── store.js           In-memory data store, seeded with sample expedition data
├── public/
│   ├── index.html          App shell
│   ├── styles.css          Command-console visual design
│   └── app.js               All frontend logic (views, forms, API calls)
├── package.json
└── README.md
```

## API reference

All endpoints are under `/api`. Resources: `expeditions`, `cargo`, `inventory`, `personnel`, `incidents`.

| Method | Endpoint                        | Description                                              |
|--------|----------------------------------|------------------------------------------------------------|
| GET    | `/api/:resource`                 | List all records for a resource                           |
| POST   | `/api/:resource`                 | Create a record                                            |
| PATCH  | `/api/:resource/:id`             | Update fields on a record (e.g. change status)             |
| DELETE | `/api/:resource/:id`             | Remove a record                                            |
| GET    | `/api/dashboard`                 | Aggregated counts, low-stock, overdue personnel, incidents |
| POST   | `/api/incidents/declare`         | Declare an incident; returns enriched response context     |

Example — declare an incident:

```bash
curl -X POST http://localhost:3000/api/incidents/declare \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"PER-02","type":"Medical Emergency","severity":"critical","notes":"Suspected frostbite, requesting evac."}'
```

The response includes the affected person's record, everyone else on the same expedition
(nearby personnel), and nearby medical/safety inventory — the same context a real emergency
response workflow would need to surface immediately.

## Where to go next

This prototype validates the data model and core workflows. A production build would add:

- A persistent database (PostgreSQL/PostGIS is a natural fit given the geospatial data)
- Authentication and role-based access control across planners, base command, field leads, and partner agencies
- The offline-first field layer and satellite sync engine described in the proposal's architecture section
- Real satellite-tracking and weather/ice-condition data integrations
- Push notifications (SMS/satellite messaging) for incident declarations and overdue alerts

---
Built to accompany the *Integrated Polar Expedition Logistics and Asset Management System* project proposal.
