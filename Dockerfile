# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Mengatur jumlah worker untuk npm
ENV NPM_CONFIG_JOBS=8

# Copy only package files first to leverage Docker cache
COPY package*.json .npmrc ./

# Install dependencies with optimization flags and multi-worker
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --loglevel=error

# Copy source code
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY src ./src/
COPY ecosystem.config.js ./

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Mengatur jumlah worker untuk npm
ENV NPM_CONFIG_JOBS=8
ENV NODE_ENV=production

# Copy package files
COPY package*.json .npmrc ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps --prefer-offline --no-audit --loglevel=error

# Copy necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/ecosystem.config.js ./

# Expose port
EXPOSE 3000

# Start the application with PM2
CMD ["npm", "run", "start:cluster"] 