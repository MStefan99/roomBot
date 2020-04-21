const Discord = require('discord.js');
const client = new Discord.Client();
const sqlite3 = require('sqlite3');
const open = require('sqlite').open;
let rows;
let db;


(async function openDB() {
	db = await open({
		filename: './database/db.sqlite',
		driver: sqlite3.Database
	});
	await db.run(`pragma foreign_keys = on;`);
	const token = (await db.get(`select value
	                             from general
	                             where key = 'token';`));
	if (token) {
		await client.login(token['value']);
	} else {
		console.log('NO TOKEN FOUND!');
	}
})();


async function delay(ms) {
	return new Promise(resolve =>
		setTimeout(() => resolve(), ms)
	);
}


client.on('ready', () => {
	console.log('Ready');
});


client.on('message', async message => {
	// Necessary checks for the bot to stay in its channel and answer only messages starting with '/'
	if (message.content.startsWith('/')) {
		const content = message.content;
		const channel = message.channel;
		const guild = channel.guild;
		const channels = guild.channels;
		
		//await channel.startTyping();
		if (channel.name === 'room-bot') {
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
					rows = await db.get(`select value
					                     from general
					                     where key = 'category_id'`);
					let category = await channels.resolve(rows ? rows['value'] : null);
					// Checking if saved category still exists
					if (!category) {
						// Creating category if not
						channel.send('How did you not have any private rooms yet!?\n' +
							'Nevermind, I even created the category for you! :kissing_heart:');
						category = await channels.create('Private rooms by roomBot', {
							type: 'category'
						});
						db.run(`insert or
						        replace
						        into general(key, value)
						        values ('category_id', $ctid)`, {$ctid: category.id});
					}
					// Creating channel
					const room = await channels.create(`Private room ${id}`, {
						type: 'text',
						topic: `Private room created by privateBot! Owner: ${message.author.username}  :smiling_face_with_3_hearts:`,
						parent: category,
						permissionOverwrites: [
							{id: message.author.id, allow: 'VIEW_CHANNEL'},
							{id: guild.roles.everyone.id, deny: 'VIEW_CHANNEL'}
						]
					});
					db.run(`insert into rooms(channel_snowflake, owner_snowflake)
					        values ($cid, $oid)`, {$cid: room.id, $oid: message.author.id});
					channel.send(`There you go! Created room ${id} just for you!  :relaxed:`);
				}
				// Add or remove users from the room
				else if (args[2] === 'add' || args[2] === 'kick') {
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
						channel.send(`You want to chat with ${username}? Can\'t find any ${username} in here  :worried:`)
					} else {
						rows = await db.get(`select owner_snowflake as osf
						                     from rooms
						                     where channel_snowflake = $cid`, {$cid: room.id});
						if (rows['osf'] !== message.author.id) {
							const owner = await guild.members.resolve(rows['osf']);
							channel.send('Someone is trying to mess with your room!!!  :sos: :sos: :sos:', {
								reply: owner.user
							});
						}
						
						rows = await db.get(`select owner_snowflake, room_users.user_snowflake
						                     from rooms
							                          left join room_users on rooms.id = room_users.room_id
						                     where channel_snowflake = $cid
							                   and user_snowflake = $uid`, {$cid: room.id, $uid: user.user.id});
						if (args[2] === 'add') {  // Adding user
							
							if (user.user.id === message.author.id) {
								channel.send('Have you decided to add yourself again? Don\'t worry, ' +
									'you\'re already there!  :wink:')
							} else if (rows) {
								channel.send('You\'re trying to add the same person again. Just go to the channel, ' +
									'they\'re waiting for you there!');
							} else {
								db.run(`insert into room_users(room_id, user_snowflake)
								        values ($rid, $uid)`, {$rid: roomId, $uid: user.user.id});
								await room.updateOverwrite(user, {'VIEW_CHANNEL': true});
								channel.send('Done, enjoy their company!  :fireworks:');
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
				// Remove the room
				else if (args[2] === 'close') {
					channel.send('I can\'t do this just yet.  :cry:  But I will, I promise!');
				}
				
				// Commands not recognized by the bot
				else {
					channel.send(`:face_with_raised_eyebrow:  I am just a small room bot, what do you want from me?`);
				}
			}
			
			// Clear command
			else if (content.includes('clear')) {
				await channel.bulkDelete(100);
				channel.send(`Enjoy your clear channel now, ${message.author.username}!  :relieved:`);
			}
			
		} else {
			channel.send('Were you looking for me? Ugh, I have no powers here...  :sob:  Meet me in my channel!')
		}
		//channel.stopTyping();
	}
});
