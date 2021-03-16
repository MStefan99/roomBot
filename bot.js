'use strict';
const Discord = require('discord.js');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const path = require('path');

const configurer = require('./configurer');
const log = require('./logger');
const handle = require('./error');


const intents = new Discord.Intents([
	Discord.Intents.NON_PRIVILEGED, // include all non-privileged intents, would be better to specify which ones you actually need
	'GUILD_MEMBERS' // lets you request guild members (i.e. fixes the issue)
]);
const client = new Discord.Client({ws: {intents}});
let config = configurer();
let rows;
let botKey;
let db;


process.on('uncaughtException', (err, origin) => {
	handle(err, 'uncaughtException');
	process.exit(1);
});


const openDB = async () => {
	db = await sqlite.open({
		filename: path.resolve(__dirname, './database/db.sqlite'),
		driver: sqlite3.Database
	});
	await db.run(`pragma foreign_keys = on;`);
};


function regenerateKey() {
	botKey = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
	log(`Bot key has changed. The new key is: ${botKey}.`, 'info');
}


(async function initServer() {
	await openDB();
	regenerateKey();
	log('Welcome to roomBot! Add channels by sending ">bot set [key]" into desired Discord channel ' +
		'and remove by sending ">bot del [key]". The code will be updated after each channel action. ' +
		'You can find your key above this message.');
	config = await config.load();

	if (config.token) {
		await client.login(config.token);
		rows = await db.get(`select snowflake, category_snowflake
                         from servers`).catch(async err => await handle(err, null));
		if (!rows) {
			log('No bot channels set. Use command ">bot set [key]'
				+ '" (without quotes) in the desired channel to set.', 'info');
		}
	} else {
		log('No token found! Run "setup.sh" or add token manually to the ./config.json file.', 'info');
	}
})();


async function delay(ms) {
	return new Promise(resolve =>
		setTimeout(() => resolve(), ms)
	);
}


client.on('ready', () => {
	log('Bot ready.');
});


client.on('message', async message => {
	// Necessary checks for the bot to stay in its channel and answer only messages starting with '>'
	if (message.content.startsWith('>')) {
		const content = message.content;
		const channel = message.channel;
		const guild = channel.guild;
		const channels = guild.channels;

		rows = await db.all(`select id, snowflake as ssf, channel_snowflake as csf
                         from servers`).catch(async err => await handle(err, channel));
		if (rows? rows.some(row => row['csf'] === channel.id) : false) {
			channel.startTyping(1);
			await delay(Math.floor(Math.random() * 3000) + 1000);
			const serverId = rows? rows.find(row => row['ssf'] === guild.id)['id'] : null;
			// Room commands
			if (content.startsWith('>room')) {
				const args = content.split(' ');
				// Create room
				if (args[1] === 'open') {
					// Getting id for the new channel
					rows = await db.get(`select seq
                               from sqlite_sequence
                               where name='rooms'`)
						.catch(async err => await handle(err, channel));
					const id = rows? rows['seq'] + 1 : 1;
					// Checking if category saved
					rows = await db.get(`select category_snowflake as csf
                               from servers
                               where snowflake=$ssf`, {$ssf: guild.id})
						.catch(async err => await handle(err, channel));
					let category = await channels.resolve(rows? rows['csf'] : null);
					// Checking if saved category still exists
					if (!category) {
						// Creating category if not
						channel.send('How did you not have any private rooms yet!?\n' +
							'Nevermind, I even created the category for you! :kissing_heart:');
						log('Category created', 'info');
						category = await channels.create('Private rooms by roomBot', {
							type: 'category',
							permissionOverwrites: [
								{id: client.user.id, allow: 'VIEW_CHANNEL'}
							]
						}).catch(async err => await handle(err, channel));
						await db.run(`update servers
                          set category_snowflake=$cid
                          where snowflake=$ssf`, {$cid: category.id, $ssf: guild.id})
							.catch(async err => {
								await category.delete();
								await handle(err, channel);
							});
					}
					// Creating channel
					const room = await channels.create(`Private room ${id}`, {
						type: args[2] === 'voice'? 'voice' : 'text',
						topic: `Private room created by privateBot! Owner: ${message.author.username}  :smiling_face_with_3_hearts:`,
						parent: category,
						permissionOverwrites: [
							{id: client.user.id, allow: 'VIEW_CHANNEL'},
							{id: message.author.id, allow: 'VIEW_CHANNEL'},
							{id: guild.roles.everyone.id, deny: 'VIEW_CHANNEL'}
						]
					}).catch(async err => await handle(err, channel));
					await db.run(`insert into rooms(server_id, channel_snowflake, owner_snowflake)
                        values ($sid, $cid, $oid)`, {$sid: serverId, $cid: room.id, $oid: message.author.id})
						.catch(async err => {
							await room.delete();
							await handle(err, channel);
						});
					channel.send(`There you go! Created room ${id} just for you!  :relaxed:`);
					log(`Room ${id} opened by ${message.author.username}.`, 'info');
				}
				// Add or remove users from the room
				else if (args[2] === 'invite' || args[2] === 'kick') {
					const roomId = args[1];
					const userIdentifier = args[3];

					let rows = await db.get(`select channel_snowflake as csf
                                   from rooms
                                   where id=$rid`, {$rid: roomId})
						.catch(async err => await handle(err, channel));
					const room = await channels.resolve(rows? rows['csf'] : null);
					const user = (await guild.members.fetch())
						.find(usr =>
							(usr.user.username.toLowerCase() === userIdentifier.toLowerCase()) ||
							(usr.nickname? usr.nickname.toLowerCase() === userIdentifier.toLowerCase() : false) ||
							(usr.id === userIdentifier));
					if (!room) {
						channel.send('You sure the room exists at all? Can\'t find it...  ');
					} else if (!user) {
						if (userIdentifier.includes('@!')) {
							channel.send('Please don\'t bother anyone with unnecessary mentions! Just type the ' +
								'username, nickname or Discord ID of the person.');
							log('Mention detected.');
						} else {
							channel.send(`Who are you talking about? I can\'t find any ${userIdentifier} in here  :worried:`);
						}
					} else if (user.id === client.user.id) {
						channel.send('Hey there! You can\'t invite or kick me from the room!  :innocent:');
					} else {
						rows = await db.get(`select owner_snowflake as osf
                                 from rooms
                                 where channel_snowflake=$cid`, {$cid: room.id})
							.catch(async err => await handle(err, channel));
						if (rows['osf'] !== message.author.id) {
							const owner = await guild.members.resolve(rows['osf']);
							channel.send('Someone is trying to mess with your room!  :rage:  ' +
								'I\'ll let you sort it out this time.\n' + message.author.username +
								', did you really think I\'ll let you do that!?  ' +
								':face_with_raised_eyebrow:', {
								reply: owner.user
							});
							log(`${message.author.username} was detected ` +
								`trying to manage ${owner.user.username}'s room (room ${roomId}).`, 'violation');
						} else {
							rows = await db.get(`select owner_snowflake, room_users.user_snowflake
                                   from rooms
                                            left join room_users on rooms.id=room_users.room_id
                                   where channel_snowflake=$cid
                                     and user_snowflake=$uid`, {$cid: room.id, $uid: user.user.id})
								.catch(async err => await handle(err, channel));
							if (args[2] === 'invite') {
								if (user.user.id === message.author.id) {
									channel.send('Have you decided to add yourself again? Don\'t worry, ' +
										'you\'re already there!  :wink:');
								} else if (rows) {
									channel.send('You\'re trying to add the same person again. Just go to the channel, ' +
										'they\'re waiting for you there!  :partying_face:');
								} else {
									await db.run(`insert into room_users(room_id, user_snowflake)
                                values ($rid, $uid)`, {$rid: roomId, $uid: user.user.id})
										.catch(async err => await handle(err, channel));
									await room.updateOverwrite(user, {'VIEW_CHANNEL': true})
										.catch(async err => await handle(err, channel));
									channel.send(`Done, enjoy ${user.user.username}\'s company!  :fireworks:`);
									log(`${user.user.username} was invited to room ${roomId}`, 'info');
								}
							} else {
								if (user.user.id === message.author.id) {
									channel.send('Wait, if you remove yourself, then who\'s left to manage your room?  ' +
										':scream:\nDon\'t even think about that! We need you!');
								} else if (!rows) {
									channel.send('You\'re trying to kick a person who\'s even not in the room! ' +
										'Why do you hate them so much!?  :frowning:');
								} else {
									await db.run(`delete
                                from room_users
                                where room_id=$rid
                                  and user_snowflake=$uid`, {$rid: roomId, $uid: user.user.id})
										.catch(async err => await handle(err, channel));
									await room.permissionOverwrites.get(user.user.id).delete()
										.catch(async err => await handle(err, channel));
									channel.send('Done! They won\'t bother you ever again!  :smiling_imp:  ' +
										'(well, at least, in that room)');
									log(`${user.user.username} was kicked from room ${roomId}`, 'info');
								}
							}
						}
					}
				}
				// Remove the room
				else if (args[2] === 'close') {
					const roomId = args[1];
					rows = await db.get(`select snowflake               as ssf,
                                      rooms.channel_snowflake as csf,
                                      rooms.owner_snowflake   as osf
                               from servers
                                        inner join rooms on servers.id=rooms.server_id
                               where rooms.id=$rid`, {$rid: roomId})
						.catch(async err => await handle(err, channel));
					if (!rows) {
						channel.send('Let\' pretend I deleted your invisible room!  :upside_down:');
					} else if (rows['ssf'] !== guild.id) {
						channel.send('Wait, that\'s illegal. Are you trying to delete the room on another server!?');
					} else if (rows['osf'] !== message.author.id) {
						const owner = await guild.members.resolve(rows['osf'])
							.catch(async err => await handle(err, channel));
						channel.send('Someone is trying to delete your room!  :rage:  ' +
							'But don\'t worry, I\'ve got you covered!\n' + message.author.username +
							', did you really think I\'ll let you do that!?  ' +
							':face_with_raised_eyebrow:', {
							reply: owner.user
						});
						log(`${message.author.username} was detected ` +
							`trying to close ${owner.user.username}'s room (room ${roomId}).`, 'violation');
					} else {
						const room = (await guild.channels.resolve(rows['csf'])).delete()
							.catch(async err => await handle(err, channel));
						await db.run(`delete
                          from rooms
                          where id=$rid`, {$rid: roomId})
							.catch(async err => await handle(err, channel));
						channel.send('Let\'s forget these dark times and I promise that nobody will ' +
							'ever see that again  :zipper_mouth:');
						log(`Room ${roomId} closed.`, 'info');
					}
				}
				// Commands not recognized by the bot
				else {
					channel.send(`:face_with_raised_eyebrow:  I am just a small room bot, what do you want from me?`);
				}
			}
			// Clear command
			else if (content.startsWith('>clear')) {
				if (config.allowClearing) {
					await channel.bulkDelete(100).catch(async err => await handle(err, channel));
					channel.send(`Enjoy your clear channel now, ${message.author.username}!  :relieved:\n` +
						`I am only allowed to delete last 100 messages, so if there are any left - just clear again! \n` +
						`Start talking to me by typing ">help"!`);
					log('Message history cleared.', 'info');
				} else {
					log(`${message.author.username} tried to clear the message history.`, 'violation');
					channel.send('I\'m not allowed to delete messages here. Some bad people want ' +
						'everything to stay here forever...  :sweat:');
				}
			}
			// Help command
			else if (content.startsWith('>help')) {
				channel.send('I am the roomBot and I can help you to create and manage private rooms on this ' +
					'server!  :slight_smile:\n' +
					'  1. To open the new room, type ">room open (voice)"\n' +
					'  2. To invite people to your room, type ">room [room number] invite [user]"\n' +
					'  3. To kick someone from your room, type ">room [room number] kick [user]"\n' +
					'  4. To close the room, type ">room [room number] close"\n' +
					'  5. To clear **this** channel, type ">clear"\n' +
					'Names can be either usernames (without tag) or nicknames and are case-insensitive. ' +
					'Please don\'t use mentions. Clear command can be disabled by the bot host.\n' +
					'That\'s it! Enjoy!  :star_struck:');
			}
		}
		// Channel command
		if (content.startsWith('>bot')) {
			const args = content.split(' ');
			if (args[2] !== botKey) {
				log('WARNING: somebody tried to change bot channel but used the wrong key!', 'warning');
				channel.send('Seems like this is the wrong key. Are you really the owner?  :frowning:\n' +
					'Note that these commands are meant to be used by the bot host **only. This will be reported**.');
			} else if (args[1] === 'set') {
				rows = await db.get(`select channel_snowflake as csf
                             from servers
                             where snowflake=$ssf`, {$ssf: guild.id})
					.catch(async err => await handle(err, channel));
				if (rows? rows['csf'] : false) {
					log(`Bot channel already exists on this server. ` +
						`Remove that channel with id ${rows['csf']} first.`, 'warning');
					channel.send('I am already on this server, no need to add me twice! Just find me in my channel!');
				} else {
					if (!rows) {
						await db.run(`insert into servers(snowflake, channel_snowflake)
                          values ($ssf, $csf)`, {$ssf: guild.id, $csf: channel.id})
							.catch(async err => await handle(err, channel));
					} else {
						await db.run(`update servers
                          set channel_snowflake=$csf
                          where snowflake=$ssf`, {$ssf: guild.id, $csf: channel.id})
							.catch(async err => await handle(err, channel));
					}
					log(`Bot channel with id ${channel.id} successfully added.`, 'info');
					channel.send('Hi, I am roomBot! Start talking to me by typing ">help"  :wink:');
				}
			} else if (args[1] === 'del') {
				rows = await db.get(`select channel_snowflake as csf
                             from servers
                             where snowflake=$ssf`, {$ssf: guild.id})
					.catch(async err => await handle(err, channel));
				if (rows? rows['csf'] === channel.id : false) {
					await db.run(`update servers
                        set channel_snowflake = null
                        where snowflake=$ssf`, {$ssf: guild.id})
						.catch(async err => await handle(err, channel));
					log(`Bot channel with id ${channel.id} successfully removed.`, 'info');
					channel.send('Seems like I have to go... We\'ve had a good time together!  :sob:');
				} else {
					channel.send('I am not in this channel so you can\'t remove me from here.');
					log('This channel was not added to the bot and cannot be removed.', 'warning');
				}
			}
			regenerateKey();
		}
		channel.stopTyping();
	}
});
