# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install development dependencies to build
RUN npm install

# Copy frontend source code
COPY . .

# Set environment build arguments
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build client files
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
