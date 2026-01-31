FROM node:alpine

WORKDIR /app
# Copy root package.json and lockfile
COPY package.json .
COPY tsconfig.json .
# COPY package-lock.json . # Uncomment if lockfile exists

# Copy shared workspace
COPY shared shared

# Copy service package.json
COPY services/auth/package.json services/auth/

# Install dependencies (including shared)
RUN npm install --workspace=services/auth --workspace=@logistream/shared

# Copy service source code
COPY services/auth services/auth

# Build shared library
RUN npm run build --workspace=@logistream/shared

WORKDIR /app/services/auth

RUN npm run build

CMD ["npm", "start"]
