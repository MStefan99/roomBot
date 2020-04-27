# roomBot
*A tiny Discord bot to create and manage private rooms for your server*  
[![Discord logo](https://discordapp.com/assets/fc0b01fe10a0b8c602fb0106d8189d9b.png)](https://discordapp.com)
___
![Version](https://img.shields.io/badge/roomBot-beta-yellow?style=flat-square)
[![CodeFactor](https://www.codefactor.io/repository/github/mstefan99/roombot/badge?style=flat-square)](https://www.codefactor.io/repository/github/mstefan99/roombot)
[![License](https://img.shields.io/badge/license-GPL--3.0-brightgreen?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![Open issues](https://img.shields.io/github/issues/MStefan99/roombot?style=flat-square)](https://github.com/MStefan99/roombot/issues)
[![Last commit](https://img.shields.io/github/last-commit/MStefan99/roombot?style=flat-square)](https://github.com/MStefan99/roombot/commits)

### What can it do?  
This is a simple bot that allows creating and managing private rooms on your server.  
That's really it, it's that simple!  

If you have a public server but want to allow your members to chat privately more easily, roomBot is made for you!  
Just install the bot, select the channel for talking to the bot and enjoy!

### Installation
- Navigate to [releases](https://github.com/MStefan99/roomBot/releases)
- Download the archive
- Unpack it  
**Note: For the next step you'll need to have a Discord bot.
Go to [Discord developer console](https://discordapp.com/developers/applications) and create it if you don't have one.  
Add the bot to your server by navigating to this link (don't forget to replace client id with one from your console): 
https://discordapp.com/oauth2/authorize?&client_id=[REPLACE_WITH_YOUR_CLIENT_ID]&scope=bot&permissions=268504080**
- Run setup.sh and paste your bot token

### First launch
- Your bot is now running. Next, run `systemctl status roombot`.
- You'll see the message with the command you need to type into your channel. It will look like this:
`>channel [key]`. Copy and paste this command **into the Discord channel** that will be used for talking to the bot.
- Restart the bot by typing `systemctl restart roombot`.
- The bot is now set up and running!
- You can enable autostart on boot by typing `systemctl enable roombot`.

#### Enjoy!
