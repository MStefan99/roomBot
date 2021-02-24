#!/bin/sh

curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - &&
	sudo apt-get update &&
	sudo apt-get install nodejs sqlite3 -y &&
	sudo npm install

sudo sqlite3 ./database/db.sqlite "$(cat ./database/ddl/general.sql ./database/ddl/servers.sql \
	./database/ddl/rooms.sql ./database/ddl/room_users.sql)"

sudo useradd bot
sudo chown -R bot:bot ./

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
ExecStart=/usr/bin/node $(pwd)/bot.js

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl start roombot

echo "Done! Enable autostart by typing \"systemctl enable roombot\"."
