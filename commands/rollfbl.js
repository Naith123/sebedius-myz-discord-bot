module.exports = {
	name: 'rollfbl',
	description: 'Rolls dice for the *Forbidden Lands* roleplaying game.'
		+ 'Type `help roll` for more details.',
	aliases: ['rollf', 'rf', 'lancef', 'lancerf', 'slåf', 'slaf'],
	guildOnly: false,
	args: true,
	usage: '<dice> [arguments]',
	execute(args, message, client) {
		args.unshift('fbl');
		client.commands.get('roll').execute(args, message, client);
	},
};