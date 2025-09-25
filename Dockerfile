# Use official Node LTS
FROM node:20-alpine

# Set working dir
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose the app port (change if your app uses a different port)
ENV PORT=3000
EXPOSE 3000

# Healthcheck (optional): try hitting the root after container starts
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3   CMD wget -qO- http://localhost:${PORT}/health || exit 1

# Start the app
CMD ["npm", "run", "start"]
