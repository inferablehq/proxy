FROM node:20-alpine

WORKDIR /app

# copy package.json and package-lock.json
COPY --link package.json package-lock.json ./

# install dependencies
RUN npm install

COPY --link . .

ENTRYPOINT [ "npm", "run", "start" ]
