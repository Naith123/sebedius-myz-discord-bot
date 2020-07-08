module.exports = {
	name: 'rollalien',
	group: 'ALIEN rpg',
	description: 'Rolls dice for the *ALIEN* roleplaying game.'
		+ '\nType `help roll` for more details.',
	aliases: ['rolla', 'ra', 'lancea', 'lancera', 'slåa', 'slaa'],
	guildOnly: false,
	args: true,
	usage: '<dice> [arguments]',
	execute(args, ctx) {
		args.unshift('alien');
		ctx.bot.commands.get('roll').execute(args, ctx);
	},
};