const YZEmbed = require('../util/YZEmbed');
const Planet = require('../util/ALIENWorldGenerator');
const Util = require('../util/Util');

module.exports = {
	name: 'colony',
	description: 'Generates a colonized planet for the ALIEN rpg.',
	aliases: ['colo'],
	guildOnly: false,
	args: false,
	usage: '',
	async execute(args, message, client) {
		const o = new Planet('rocky', true, 1);
		const embed = new YZEmbed(o.title, o.description);

		// COLONY SIZE & POPULATION
		const colo = o.colony;
		embed.addField(
			'Population',
			`:busts_in_silhouette: × ${colo.population}\n(${colo.size})`,
			true,
		);

		// COLONY MISSIONS
		const missions = colo.missions;
		embed.addField(
			`Mission${(missions.size > 1) ? 's' : ''}`,
			[...missions].join('\n'),
			true,
		);

		// COLONY ALLEGIANCE
		embed.addField('Allegiance', colo.allegiance, true);

		// COLONY ORBIT
		embed.addField('Orbit', o.orbits.join('\n'), true);

		// COLONY FACTIONS
		const factions = colo.factions;
		embed.addField(
			`Faction${(factions.qty > 1) ? 's' : ''}`,
			`${factions.strengths}:\n- ${factions.types.join('\n- ')}`,
			false,
		);

		// COLONY HOOK
		embed.addField('Event', colo.hook, false);

		return message.channel.send(embed);
	},
};