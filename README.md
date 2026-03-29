# Hari Raya Visit Scheduler

A lightweight React app for planning Hari Raya house visits in Singapore. Drag and drop visits to reorder them, adjust stay durations, and get real-time conflict detection — with a live day timeline showing travel, visits, and your estimated home arrival.

---

## Features

- **Drag-and-drop reordering** — rearrange visits using mouse or keyboard
- **Adjustable visit durations** — per-stop sliders (35–50 min)
- **Real-time conflict detection** — flags constraint violations instantly
  - Earliest arrival windows per host
  - Must-be-first rule (Wak Wati)
  - Latest departure deadlines (Zainab)
- **Day timeline** — visual bar showing visits, travel, and buffer periods
- **Home arrival estimate** — calculates return time with 30 min travel + 15 min buffer
- **Target: home by 5:00 PM**

---

## Tech Stack

| Layer     | Library                          |
|-----------|----------------------------------|
| UI        | React 18                         |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Icons     | `lucide-react`                   |
| Bundler   | Vite 6                           |
| Container | Docker (nginx)                   |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Docker

```bash
# Build image
docker build -t hari-raya-scheduler .

# Run container
docker run -p 8080:80 hari-raya-scheduler
```

Open [http://localhost:8080](http://localhost:8080).

---

## Visit Schedule Data

Visits and constraints are defined in `src/App.jsx` under the `PEOPLE` constant:

| ID     | Name       | Location     | Region | Earliest  | Constraint         |
|--------|------------|--------------|--------|-----------|--------------------|
| wati   | Wak Wati   | Bukit Batok  | West   | 11:30 AM  | Must be first stop |
| pak    | Pak Long   | Bukit Gombak | West   | 12:00 PM  | —                  |
| zainab | Zainab     | Pasir Ris    | East   | 12:00 PM  | Leave by 3:00 PM   |
| ijah   | Wak Ijah   | Simei        | East   | 2:30 PM   | —                  |

Travel times between locations (mid-day taxi estimates) are in the `TRAVEL` constant. A **15-minute buffer** is applied to every travel leg.

---

## Project Structure

```
src/
├── App.jsx        # All components and logic (single-file)
├── index.css      # Global styles
└── main.jsx       # React entry point
index.html         # HTML template
vite.config.js     # Vite config
Dockerfile         # Multi-stage Docker build
```

---

## License

MIT — open source, free to use and modify.
