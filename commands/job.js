const { YZEmbed } = require('../utils/embeds');
const Job = require('../generators/ALIENJobGenerator');
const { random } = require('../utils/Util');

module.exports = {
	name: 'job',
	// aliases: ['aquest'],
	category: 'alien',
	description: 'Generates a random job for the Alien RPG.',
	guildOnly: false,
	args: true,
	usage: `<${Job.jobTypes.join('|')}>`,
	async run(args, ctx) {
		if (!args.length) return ctx.reply('Please specify job type');

		let type = '';

		if (/^(cargo|cargorun|cargo run)$/i.test(args[0])) { type = 'cargo'; }
		else if (/^(mil|mill|military|militarymission|military mission)$/i.test(args[0])) { type = 'mil'; }
		else if (/^(expe|exped|expedition)$/i.test(args[0])) { type = 'expe'; }
		else {
			type = random(Job.jobTypes);
		}
		// else return ctx.reply('Please specify a correct job type: `cargo`, `mil` or `expe`');

		const j = new Job(type);
		const job = j.job;
		const embed = new YZEmbed(j.title.toUpperCase(), j.description);

		// MISSION & PLOT-TWIST
		const mdesc = job.mission.description
			+ `\n**${j.plotTwist.name}:** ${j.plotTwist.description}`;
		embed.addField(
			`${getMissionIcon(job.type)} ${job.missionTitle}: **${job.mission.name}**`,
			mdesc,
		);

		// DESTINATION
		embed.addField(
			`:rocket: ${job.destinationTitle}: **${job.destination.name}**`,
			job.destination.description,
		);

		// REWARD
		let rdesc = `• $ ${j.creditReward}.000,00 UA dollars`;
		job.rewards.forEach(reward => {
			rdesc += `\n• ${reward}`;
		});

		embed.addField(':moneybag: Reward', rdesc);

		// COMPLICATION(S)
		job.complications.forEach(compl => {
			embed.addField(
				`⚠️ Possible Complication: **${compl.name}**`,
				compl.description,
			);
		});

		return ctx.send(embed);
	},
};

function getMissionIcon(type) {
	const missionIcon = {
		cargo: ':package:',
		mil: ':dart:',
		expe: ':satellite:',
	};

	if (missionIcon.hasOwnProperty(type)) return missionIcon[type];
	else return ':anger:';
}