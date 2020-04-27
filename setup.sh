#!/bin/sh

curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - &&
	sudo apt-get update &&
	sudo apt-get install nodejs sqlite3 -y &&
	sudo npm install

sudo sqlite3 ./database/db.sqlite "$(cat ./database/ddl/general.sql ./database/ddl/servers.sql \
	./database/ddl/rooms.sql ./database/ddl/room_users.sql)"

echo "Please enter your bot token to finish setup:"
while true; do
	read -r token

	if [ -z "$token" ]; then
		echo "The token cannot be empty. Please enter the token:"
	else
		break
	fi
done

echo "Do you want your bot to clear the messages in its channel? (yes/[no])?"
read -r clear
if [ "$clear" = "yes" ]; then
	sudo sqlite3 ./database/db.sqlite "insert into general values('allow_clearing', 'true')"
fi
sudo sqlite3 ./database/db.sqlite "insert into general values('token', '$token')"

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
