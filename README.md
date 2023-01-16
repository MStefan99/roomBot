# roomBot
*A tiny Discord bot to create and manage private rooms for your server*  
[![Discord logo](https://discordapp.com/assets/fc0b01fe10a0b8c602fb0106d8189d9b.png)](https://discordapp.com)
___
![GitHub release (latest by date)](https://img.shields.io/github/v/release/MStefan99/roomBot?label=version&style=flat-square)
[![License](https://img.shields.io/badge/license-GPL--3.0-brightgreen?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![Open issues](https://img.shields.io/github/issues/MStefan99/roombot?style=flat-square)](https://github.com/MStefan99/roombot/issues)
![Maintenance](https://img.shields.io/maintenance/no/2021?style=flat-square)

### What can it do?  
This is a bot that allows creating and managing private rooms on your server.  
That's really it, it's that simple!  

If you have a public server and want to allow your members to chat privately more easily, roomBot is made for you!  
Just install the bot, select the channel for talking to the bot and enjoy!

### Hosting
Since I unfortunately cannot publicly host the bot for free and reliably, you'll have to set up your own hosting.  
This could be any computer with an internet access, no port forwarding required.  
I have included a small script for you to make the setup process as easy and quick as possible. 
The script was written for Ubuntu/Debian, other Linux distributions are not supported.  

### Installation
- Navigate to [releases](https://github.com/MStefan99/roomBot/releases)
- Download the archive
- Unpack it  
**Note: For the next step you'll need to have a Discord bot.
Go to [Discord developer console](https://discordapp.com/developers/applications) and create it if you don't have one.  
Add the bot to your server by navigating to this link (don't forget to replace client id with one from your console): 
https://discordapp.com/oauth2/authorize?&client_id=[REPLACE_WITH_YOUR_CLIENT_ID]&scope=bot&permissions=268643344**
- Run `setup.sh`.
- Your bot is now running. Next, run `systemctl status roombot`.
- Follow the instructions to add management channels to the bot.
- You can enable autostart on boot by typing `systemctl enable roombot`.
- Follow the instructions in `./log/log.txt` to get started.

#### Enjoy!
