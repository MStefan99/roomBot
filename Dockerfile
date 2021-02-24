FROM ubuntu:latest

# Basic setup
RUN mkdir -p /bot/log
WORKDIR /bot
RUN apt-get update; apt-get install apt-utils sudo curl -y

# Installing Node and dependencies
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN apt-get update; apt-get install nodejs sqlite3 -y

# Copy project
COPY . .

# Project setup
RUN npm install
RUN sudo sqlite3 ./database/db.sqlite "$(cat ./database/ddl/general.sql ./database/ddl/servers.sql \
./database/ddl/rooms.sql ./database/ddl/room_users.sql)"

# Startup
CMD node ./bot.js
