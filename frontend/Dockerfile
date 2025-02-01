FROM node:20-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN yarn build

# Final runtime image
FROM nginx:alpine

# Copy the built files from the builder image
COPY --from=base /app/build /usr/share/nginx/html

# Copy nginx config to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the entrypoint script
COPY entrypoint.sh /usr/share/nginx/entrypoint.sh

# Ensure the entrypoint script is executable
RUN chmod +x /usr/share/nginx/entrypoint.sh

EXPOSE 80

# Set the entrypoint to the custom script
ENTRYPOINT ["/usr/share/nginx/entrypoint.sh"]
