FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (Express, ESLint, etc.)
RUN npm install

# Copy server logic
COPY server.js ./

# Add basic Next.js structure simulation so the linter doesn't freak out
# if Jules passes Next.js specific components.
RUN npm install -g next react react-dom

# Expose port (Cloud Run requires 8080 by default)
EXPOSE 8080

# Start the sandbox API
CMD ["npm", "start"]
