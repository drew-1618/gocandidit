# lightweight node 20 LTS image
FROM node:20-alpine

# set working dir inside the container
WORKDIR /app

# copy package management files
COPY package*.json ./

# clean install dependencies
RUN npm ci --only-production

# copy app source code
COPY . .

# expose backend port
EXPOSE 8000

# start app
CMD ["node", "server.js"]