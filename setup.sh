#!/bin/sh

echo "Installing Node..." >>./setup-log
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - &&
sudo apt-get update &&
sudo apt-get install nodejs sqlite3 -y &&
npm install


echo "Please enter your bot token to finish setup:"
while true; do
  read -r token

  if [ -z "$token" ]; then
    echo "The token cannot be empty. Please enter the token:"
  else
    break
  fi
done

echo "Creating the database..." >>./setup-log
sqlite3 ./database/db.sqlite \
"$(cat ./database/ddl/general.sql ./database/ddl/rooms.sql ./database/ddl/room_users.sql)" 1>&2>>./setup-log
sqlite3 ./database/db.sqlite "insert into general values('token', '$token')"

echo "Creating user..." >>./setup-log
sudo useradd bot 1>&2>>./setup-log

echo "Creating systemd servide..." >>./setup-log
cat <<EOF | sudo tee /etc/systemd/system/roombot.service 1>/dev/null
[Unit]
Description=roomBot Discord bot
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=bot
ExecStart=node $(pwd)/bot.js

[Install]
WantedBy=multi-user.target
EOF
echo "Starting service" >>./setup-log
sudo systemctl start roombot

echo "Done! Enable autostart by typing \"systemctl start roombot\"."
