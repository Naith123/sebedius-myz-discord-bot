const db = require('../database/database');
const { SUPPORTED_GAMES, SUPPORTED_LANGS } = require('../utils/constants');

module.exports = {
	name: 'setconf',
	group: 'Customization',
	description: 'Sets the bot\'s configuration for this server. If you omit the new value, it returns the current value.'
		+ ' See possible parameters:'
		+ '\n`prefix [new value]` – Gets or sets the prefix for triggering the commands of this bot.'
		+ '\n`game [new value]` – Gets or sets the default game used (for dice skins and critical injuries tables).'
		+ ` Options are \`${SUPPORTED_GAMES.join('`, `')}\`.`
		+ '\n`lang [new value]` – Gets or sets the default language. See Readme for details.',
	guildOnly: true,
	args: true,
	usage: '<parameter> [new value]',
	async execute(args, message, client) {
		// Exits early if the message's author doesn't have the ADMINISTRATOR Permission.
		// The Bot Admin may bypass this security check.
		if (
			!message.member.hasPermission('ADMINISTRATOR')
			&& message.author.id !== client.config.botAdminID
		) {
			return message.reply('⛔ This command is only available for admins.');
		}

		// The property command.args = true,
		// so no need to check args[0].
		const key = args[0].toLowerCase();
		const newVal = args[1];
		const guildID = message.guild.id;

		const verifiedParameters = ['prefix', 'game', 'lang'];

		if (verifiedParameters.includes(key)) {
			// SET
			if (typeof newVal !== 'undefined') {

				if (key === 'prefix') {
					await db.set(guildID, newVal, 'prefix');
					client.prefixes.set(guildID, newVal);
					message.channel.send(`✅ My prefix has been set to: "${newVal}"`);
				}
				else if (key === 'game' && SUPPORTED_GAMES.includes(newVal)) {
					await db.set(guildID, newVal, 'game');
					client.games.set(guildID, newVal);
					message.channel.send(`✅ The default game has been set to: "${newVal}"`);
				}
				else if (key === 'lang' && SUPPORTED_LANGS.includes(newVal)) {
					await db.set(guildID, newVal, 'lang');
					client.games.set(guildID, newVal);
					message.channel.send(`✅ The default language has been set to: "${newVal}"`);
				}
				else {
					message.reply(`❌ The value you typed for "${key}" is unsupported.`);
				}
			}
			// GET
			else {
				const value = await db.get(guildID, key);
				if (value) message.channel.send(`🏷️ Parameter: "${key}" = "${value}"`);
				else message.reply(`❌ Impossible to get the value from "${key}" parameter.`);
			}
		}
		else {
			message.reply(`❌ "${key}" is not a parameter.`);
		}
	},
};