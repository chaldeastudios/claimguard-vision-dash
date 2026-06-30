FROM node:22-alpine

WORKDIR /app

# Install dependencies first
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with host flag to allow Docker port forwarding
CMD ["npm", "run", "dev", "--", "--host"]
