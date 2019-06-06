const Config = require('../config.json');
const Keyv = require('keyv');
const YZInitDeck = require('../util/YZInitDeck');
const Util = require('../util/Util');

module.exports = {
	name: 'initiative',
	description: 'Draws one or more initiative cards. Use the parameter `shuffle` to reset the deck of cards.',
	aliases: ['init', 'draw-init', 'drawinit'],
	guildOnly: false,
	args: false,
	usage: '[quantity] [shuffle]',
	async execute(args, message) {
		// Initializes the card database.
		const gid = message.guild.id;
		const ttl = 86400000;
		const cardsDB = new Keyv(Config.db, { namespace: 'initiative' });
		cardsDB.on('error', err => console.error('Connection Error', err));

		// Recreates the deck.
		const cards = await cardsDB.get(gid);
		let deck;

		if (cards && cards.length > 0) {
			deck = new YZInitDeck(cards);
		}
		else {
			await reset();
		}

		// Command: Shuffles a new deck of cards.
		if (args.includes('shuffle')) {
			await reset();
		}
		// Command: Draws cards.
		else {
			// Gets the card.
			const value = +args[0] || 1;
			const drawQty = Util.clamp(value, 0, 10);

			if (drawQty > deck.size) {
				message.channel.send('The size of the *Initiative* deck is too small.');
				await reset();
			}
			const drawnCards = deck.draw(drawQty);
			console.log(`[INITIATIVE DECK] - Cards drawn: ${drawnCards}`);
			await cardsDB.set(gid, deck._stack, ttl);
			return message.reply(getDrawCardText(drawnCards));
		}

		async function reset() {
			deck = new YZInitDeck();
			await cardsDB.set(gid, deck._stack, ttl);
			return message.channel.send('Shuffled a new deck of *Initiative* cards.');
		}
	},
};

function getDrawCardText(cards) {
	if (!Array.isArray(cards)) return getDrawCardText([cards]);

	const cardTexts = [];
	cards.forEach(card => {
		cardTexts.push(Config.icons.fbl.cards[card]);
	});
	return '**Initiative:** ' + cardTexts.join(', ');
}