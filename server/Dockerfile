FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy Express server source code
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
