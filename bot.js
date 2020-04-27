'use strict';
const Discord = require('discord.js');
const client = new Discord.Client();
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const path = require('path');


let rows;
let botKey;
let db;

const openDB = async () => {
	db = await sqlite.open({
		filename: path.resolve(__dirname, './database/db.sqlite'),
		driver: sqlite3.Database
	});
	await db.run(`pragma foreign_keys = on;`);
};


function regenerateKey() {
	botKey = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
	console.log(`Bot key has changed. The new key is: ${botKey}.`);
}


(async function initServer() {
	await openDB();
	regenerateKey();
	console.log('Welcome to roomBot! Add channels by sending ">channel add [key]" into desired Discord channel ' +
		'and remove by sending ">channel del [key]". The code will be updated after each channel action. ' +
		'You can find your key above this message.');
	const token = (await db.get(`select value
                                 from general
                                 where key = 'token';`));
	if (token) {
		await client.login(token['value']);
		rows = await db.get(`select snowflake, category_snowflake
                             from servers`);
		if (!rows) {
			console.log('No bot channels set. Use command ">channel add [key]'
				+ '" (without quotes) in the desired channel to set.');
		}
	} else {
		console.log('No token found! Run "setup.sh" or add token manually by running the following command:\n' +
			'sqlite3 ' + __dirname + '/database/db.sqlite "insert into general values(\'token\', ' +
			'\'[YOUR_TOKEN_HERE]\')"');
	}
})();


async function delay(ms) {
	return new Promise(resolve =>
		setTimeout(() => resolve(), ms)
	);
}


client.on('ready', () => {
	console.log('Bot ready.');
});


client.on('message', async message => {
	// Necessary checks for the bot to stay in its channel and answer only messages starting with '/'
	if (message.content.startsWith('>')) {
		const content = message.content;
		const channel = message.channel;
		const guild = channel.guild;
		const channels = guild.channels;
		
		rows = (await db.all(`select id, snowflake as ssf, channel_snowflake as csf
                             from servers`));
		//await channel.startTyping();
		if (rows.some(row => row['csf'] === channel.id)) {
			const serverId = rows ? rows.find(row => row['ssf'] === guild.id)['id'] : null;
			// Room commands
			if (content.includes('room')) {
				const args = content.split(' ');
				// Create room
				if (args[1] === 'open') {
					// Getting id for the new channel
					rows = await db.get(`select seq
                                         from sqlite_sequence
                                         where name = 'rooms'`);
					const id = rows ? rows['seq'] + 1 : 1;
					// Checking if category saved
					rows = await db.get(`select category_snowflake as csf
                                         from servers
                                         where snowflake = $ssf`, {$ssf: guild.id});
					let category = await channels.resolve(rows ? rows['csf'] : null);
					// Checking if saved category still exists
					if (!category) {
						// Creating category if not
						channel.send('How did you not have any private rooms yet!?\n' +
							'Nevermind, I even created the category for you! :kissing_heart:');
						category = await channels.create('Private rooms by roomBot', {
							type: 'category',
							permissionOverwrites: [
								{id: client.user.id, allow: "VIEW_CHANNEL"}
							]
						});
						db.run(`update servers
                                set category_snowflake=$cid
                                where snowflake = $ssf`, {$cid: category.id, $ssf: guild.id});
					}
					// Creating channel
					const room = await channels.create(`Private room ${id}`, {
						type: args[2] === 'voice' ? 'voice' : 'text',
						topic: `Private room created by privateBot! Owner: ${message.author.username}  :smiling_face_with_3_hearts:`,
						parent: category,
						permissionOverwrites: [
							{id: client.user.id, allow: "VIEW_CHANNEL"},
							{id: message.author.id, allow: 'VIEW_CHANNEL'},
							{id: guild.roles.everyone.id, deny: 'VIEW_CHANNEL'}
						]
					});
					db.run(`insert into rooms(server_id, channel_snowflake, owner_snowflake)
                            values ($sid, $cid, $oid)`, {$sid: serverId, $cid: room.id, $oid: message.author.id});
					channel.send(`There you go! Created room ${id} just for you!  :relaxed:`);
				}
				// Add or remove users from the room
				else if (args[2] === 'invite' || args[2] === 'kick') {
					const roomId = args[1];
					const username = args[3];
					
					let rows = await db.get(`select channel_snowflake as csf
                                             from rooms
                                             where id = $rid`, {$rid: roomId});
					const room = await channels.resolve(rows ? rows['csf'] : null);
					const user = (await guild.members.fetch()).find(usr =>
						(usr.user.username.toLowerCase() === username.toLowerCase()) ||
						(usr.nickname ? usr.nickname.toLowerCase() === username.toLowerCase() : false));
					
					if (!room) {
						channel.send('You sure the room exists at all? Can\'t find it...  ');
					} else if (!user) {
						channel.send(`Who are you talking about? I can\'t find any ${username} in here  :worried:`)
					} else {
						rows = await db.get(`select owner_snowflake as osf
                                             from rooms
                                             where channel_snowflake = $cid`, {$cid: room.id});
						if (rows['osf'] !== message.author.id) {
							const owner = await guild.members.resolve(rows['osf']);
							channel.send('Someone is trying to mess with your room!!!  :sos: :sos: :sos:', {
								reply: owner.user
							});
						} else {
							rows = await db.get(`select owner_snowflake, room_users.user_snowflake
                                                 from rooms
                                                          left join room_users on rooms.id = room_users.room_id
                                                 where channel_snowflake = $cid
                                                   and user_snowflake = $uid`, {$cid: room.id, $uid: user.user.id});
							if (args[2] === 'invite') {  // Adding user
								
								if (user.user.id === message.author.id) {
									channel.send('Have you decided to add yourself again? Don\'t worry, ' +
										'you\'re already there!  :wink:')
								} else if (rows) {
									channel.send('You\'re trying to add the same person again. Just go to the channel, ' +
										'they\'re waiting for you there!  :partying_face:');
								} else {
									db.run(`insert into room_users(room_id, user_snowflake)
                                            values ($rid, $uid)`, {$rid: roomId, $uid: user.user.id});
									await room.updateOverwrite(user, {'VIEW_CHANNEL': true});
									channel.send(`Done, enjoy ${user.user.username}\'s company!  :fireworks:`);
								}
							} else {
								if (user.user.id === message.author.id) {
									channel.send('Wait, if you remove yourself, then who\'s left to manage your room?  ' +
										':scream:\nDon\'t even think about that! We need you!')
								} else if (!rows) {
									channel.send('You\'re trying to kick a person who\'s even not in the room! ' +
										'Why do you hate them so much!?  :frowning:')
								} else {
									db.run(`delete
                                            from room_users
                                            where room_id = $rid
                                              and user_snowflake = $uid`, {$rid: roomId, $uid: user.user.id});
									await room.permissionOverwrites.get(user.user.id).delete();
									channel.send('Done! They won\'t bother you ever again!  :smiling_imp:  ' +
										'(well, at least, in that room)');
								}
							}
						}
					}
				}
				// Remove the room
				else if (args[2] === 'close') {
					const roomId = args[1];
					rows = await db.get(`select channel_snowflake as csf, owner_snowflake as osf
                                         from rooms
                                         where id = $rid`, {$rid: roomId});
					if (!rows) {
						channel.send('Let\' pretend I deleted your invisible room!  :upside_down:');
					} else if (rows['osf'] !== message.author.id) {
						channel.send('Trying to delete the room you didn\'t create! How naive! ' +
							'Did you really think I\'ll let you do that!?  :face_with_monocle:')
					} else {
						db.run(`delete
                                from rooms
                                where id = $rid`, {$rid: roomId});
						const room = (await guild.channels.resolve(rows['csf'])).delete();
						channel.send('Let\'s forget these dark times and I promise that nobody will ' +
							'ever see that again  :zipper_mouth:');
					}
				}
				// Commands not recognized by the bot
				else {
					channel.send(`:face_with_raised_eyebrow:  I am just a small room bot, what do you want from me?`);
				}
			}
			// Clear command
			else if (content.includes('clear')) {
				rows = await db.get(`select value
                                     from general
                                     where key = 'allow_clearing'`);
				if (rows ? rows['value'] === 'true' : false) {
					await channel.bulkDelete(100);
					channel.send(`Enjoy your clear channel now, ${message.author.username}!  :relieved:`);
				} else {
					channel.send('I\'m not allowed to delete messages here. Some bad people want ' +
						'everything to stay here forever...  :sweat:')
				}
			}
			// Help command
			else if (content.includes('help')) {
				channel.send('I am the roomBot and I can help you to create and manage private rooms on this ' +
					'server!  :slight_smile:\n' +
					'  1. To open the new room, type ">room open (voice)"\n' +
					'  2. To invite people to your room, type ">room [room number] invite [user]"\n' +
					'  3. To kick someone from your room, type ">room [room number] kick [user]"\n' +
					'  4. To close the room, type ">room [room number] close"\n' +
					'  5. On some servers you can use ">clear" command to clear *this* channel.' +
					'That\'s it! Enjoy!  :star_struck:');
			}
		}
		// Channel command
		if (content.includes('channel')) {
			const args = content.split(' ');
			if (args[2] !== botKey) {
				console.log('WARNING: somebody tried to change bot channel but used the wrong key!');
				channel.send('Huh?');
			} else if (args[1] === 'add') {
				rows = await db.get(`select channel_snowflake as csf
                                     from servers
                                     where snowflake = $ssf`, {$ssf: guild.id});
				if (rows ? rows['csf'] : false) {
					channel.send('Bot channel already exists on this server. Remove that channel first.');
				} else {
					if (!rows) {
						db.run(`insert into servers(snowflake, channel_snowflake)
                                values ($ssf, $csf)`, {$ssf: guild.id, $csf: channel.id});
					} else {
						db.run(`update servers
                                set channel_snowflake=$csf
                                where snowflake = $ssf`, {$ssf: guild.id, $csf: channel.id})
					}
					console.log('Bot channel successfully added!');
					channel.send('Channel was added to the bot.');
				}
			} else if (args[1] === 'del') {
				rows = await db.get(`select channel_snowflake as csf
                                     from servers
                                     where snowflake = $ssf`, {$ssf: guild.id});
				if (rows ? rows['csf'] === channel.id : false) {
					db.run(`update servers
                            set channel_snowflake = null
                            where snowflake = $ssf`, {$ssf: guild.id});
					console.log('Bot channel successfully removed!');
					channel.send('Channel was removed from the bot.');
				} else {
					channel.send('This channel was not added to the bot and cannot be removed.');
				}
			}
			regenerateKey();
		}
		//channel.stopTyping();
	}
});
