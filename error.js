const log = require('logger');


async function handle(error, channel) {
	log(`"${error}"`, 'error');
	if (channel) {
		await channel.send('Oops, something just broke!  :astonished:  Hope it\'s going to be fixed soon!\n' +
			'Restarting...  :arrows_counterclockwise: ');
	}
	log('Stopping the process immediately! Please make sure it is being restarted automatically.', 'error');
	process.exit(1);
}


module.exports = handle;