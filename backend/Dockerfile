FROM node:20-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN yarn build

FROM node:20-alpine AS prod-runtime
WORKDIR /app

# Copy built files from the build stage
COPY --from=base /app/dist ./dist

# Expose the backend port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the backend server
CMD ["node", "dist/index.js"]
