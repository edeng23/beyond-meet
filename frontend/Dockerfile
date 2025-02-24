# Use Node.js base image
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Copy .env.local if it exists
COPY .env.local .env.local

# Build the app
RUN npm run build

EXPOSE 3000

# Start the app
CMD ["npm", "run", "dev"] 