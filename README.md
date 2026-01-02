# SAT Platform

SAT Platform is a full-stack TypeScript application designed to support SAT practice workflows. The repository is structured as a monorepo with a React-based frontend and a Node.js/Express backend, cleanly separated to support independent development and scaling.

The project is intended to serve as a foundation for SAT-related functionality such as exam flows, question handling, scoring logic, and user interaction.

---

## Repository Structure

sat-platform/
├── backend/ # Node.js + TypeScript API
│ ├── src/
│ │ ├── index.ts # Backend entry point
│ │ ├── routes/ # HTTP route definitions
│ │ ├── controllers/ # Request handling logic
│ │ ├── services/ # Business logic
│ │ └── utils/ # Shared utilities
│ └── tsconfig.json
│
├── frontend/ # React + TypeScript client
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── contexts/ # React Context state
│ │ ├── pages/ # Page-level components
│ │ ├── test/ # Test scaffolding
│ │ └── App.tsx
│ └── tsconfig.json
│
├── package.json # Root workspace configuration
└── .gitignore

