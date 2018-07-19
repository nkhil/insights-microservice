FROM node:8.10.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install --production

# Bundle app source
COPY ./index.js  ./
COPY ./src ./src/
COPY ./definitions ./definitions/

EXPOSE 3000
CMD [ "npm", "start" ]
