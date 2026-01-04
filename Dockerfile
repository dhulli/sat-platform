# ---------- Frontend build ----------
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

# ---------- Backend build ----------
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend .
RUN npm run build

# ---------- Production image ----------
FROM node:18-alpine
WORKDIR /app

# Copy backend build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build ./frontend/build

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
