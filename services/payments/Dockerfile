FROM node:alpine

WORKDIR /app
COPY package.json .
COPY tsconfig.json .
# COPY package-lock.json . 

COPY shared shared
COPY services/payments/package.json services/payments/

RUN npm install --workspace=services/payments --workspace=@logistream/shared

COPY services/payments services/payments

RUN npm run build --workspace=@logistream/shared

WORKDIR /app/services/payments

RUN npm run build

CMD ["npm", "start"]
