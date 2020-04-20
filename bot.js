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
                                 where key = 'token';`))['value'];
	await client.login(token);
})();


client.on('ready', () => {
	console.log('ready');
});


client.on('message', async message => {
	// Necessary checks for the bot to stay in its channel and answer only messages starting with '/'
	if (message.content.startsWith('/')) {
		if (message.channel.name === 'room-bot') {
			
			// Room commands
			if (message.content.includes('room')) {
				// Create room
				const args = message.content.split(' ');
				if (args[1] === 'create') {
					// Getting id for the new channel
					rows = await db.get(`select seq
                                         from sqlite_sequence
                                         where name = 'rooms'`);
					const id = rows ? rows['seq'] : 1;
					// Checking if category saved
					rows = await db.get(`select value
                                         from general
                                         where key = 'category_id';`);
					const categoryId = rows ? rows['value'] : undefined;
					let category = await message.channel.guild.channels.cache.get(categoryId);
					// Checking if saved category still exists
					if (!category || !categoryId) {
						// Creating category if not
						message.channel.send('How did you not have any private rooms yet!?  :open_mouth:\n' +
							'Nevermind, I even created the category for you! :kissing_heart:');
						category = await message.channel.guild.channels.create('Private rooms by privateBot', {
							type: 'category'
						});
						await db.run(`insert or
                                      replace
                                      into general(key, value)
                                      values ('category_id', $id);`, {$id: category.id});
					}
					// Creating channel
					const channel = await message.guild.channels.create(`Private room ${id}`, {
						type: 'text',
						topic: 'Private room created by privateBot!  :smiling_face_with_3_hearts:',
						parent: category,
						permissionOverwrites: [
							{id: message.author.id, allow: "VIEW_CHANNEL"},
							{id: message.guild.roles.everyone.id, deny: "VIEW_CHANNEL"}
						]
					});
					await db.run(`insert into rooms(channel_snowflake, owner_snowflake)
                                  values ($channel, $owner);`, {
						$channel: channel.id,
						$owner: message.author.id
					});
					
					message.channel.send(`There you go! Created room ${id} just for you!  :relaxed:`);
				}
				
				// Remove the room
				if (args[1] === 'remove') {
					message.channel.send('I can\'t do this just yet.  :cry:  But I will, I promise!');
				}
				
				// Add user to the room
				if (args[2] === 'add') {
					message.channel.send('I can\'t do this just yet.  :cry:  But I will, I promise!');
				}
				
				// Remove user from the room
				if (args[2] === 'del') {
					message.channel.send('I can\'t do this just yet.  :cry:  But I will, I promise!');
				}
			}
			
			// Clear command
			if (message.content.includes('clear')) {
				await message.channel.bulkDelete(100);
				message.channel.send(`Enjoy your clear channel now, ${message.author.username}!`);
			}
		} else {
			message.channel.send('Were you looking for me? Ugh, I have no powers here...  :sob:  Meet me in my channel!')
		}
	}
});
