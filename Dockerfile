# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package*.json .npmrc ./

# Install dependencies with optimization flags
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# Copy source code
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json .npmrc ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps --prefer-offline --no-audit

# Copy necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"] 