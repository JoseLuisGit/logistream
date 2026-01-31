FROM node:alpine

WORKDIR /app
COPY package.json .
COPY tsconfig.json .
# COPY package-lock.json . 

COPY shared shared
COPY services/orders/package.json services/orders/

RUN npm install --workspace=services/orders --workspace=@logistream/shared

COPY services/orders services/orders

RUN npm run build --workspace=@logistream/shared

WORKDIR /app/services/orders

RUN npm run build

CMD ["npm", "start"]
