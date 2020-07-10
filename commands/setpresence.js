const { ActivityTypes } = require('discord.js').Constants;
const PresenceStatus = ['online', 'idle', 'invisible', 'dnd'];

module.exports = {
	name: 'setpresence',
	group: 'Administration',
	description: 'Sets the presence of the bot.',
	adminOnly: true,
	guildOnly: false,
	args: true,
	usage: '',
	async execute(args, ctx) {
		// Exits early if not the bot's owner.
		if (ctx.author.id !== ctx.bot.config.ownerID) return;

		// Parses arguments.
		const argv = require('yargs-parser')(args, {
			array: ['name'],
			boolean: ['afk', 'idle', 'loop'],
			string: ['status', 'type'],
			alias: {
				name: ['activity', 'text', 'desc'],
			},
			default: {
				name: ['Hello World!'],
				afk: false,
				type: ActivityTypes[0],
				status: PresenceStatus[0],
				idle: false,
				loop: false,
			},
			configuration: ctx.bot.config.yargs,
		});
		if (argv.loop) {
			clearInterval(ctx.bot.activity);
			ctx.bot.activity = require('../utils/activities')(ctx.bot);
			return await ctx.channel.send(':ballot_box_with_check: Sebedius\'s activities are `LOOPING`.');
		}
		else if (argv.idle) {
			clearInterval(ctx.bot.activity);
			await ctx.bot.user.setPresence({
				status: 'dnd',
				afk: true,
				activity: {
					name: '🚧 On Maintenance',
					type: 'WATCHING',
				},
			});
			return await ctx.channel.send(':ballot_box_with_check: Sebedius is `ON MAINTENANCE`.');
		}
		argv.type = argv.type.toUpperCase();
		argv.status = argv.status.toLowerCase();
		const name = argv.name.join(' ');
		const type = ActivityTypes.includes(argv.type) ? argv.type : ActivityTypes[0];
		const status = PresenceStatus.includes(argv.status) ? argv.status : PresenceStatus[0];
		const afk = argv.afk ? true : false;

		// Sets the presence.
		await ctx.bot.user.setPresence({ status, afk, activity: { name, type } })
			.then(console.log)
			.catch(console.error);

		return await ctx.channel.send(':ballot_box_with_check: New status set with success.');
	},
};