const fs = require('fs');
const { Collection } = require('discord.js');
const Sebedius = require('../Sebedius');
const Util = require('../utils/Util');
const RollTable = require('../utils/RollTable');
const { __ } = require('../utils/locales');
const { CatalogNotFoundError } = require('../utils/errors');
const { SOURCE_MAP, COMPENDIA, ATTRIBUTES, ATTRIBUTE_STR, ATTRIBUTE_AGI, RANGES, WEAPON_FEATURES } = require('../utils/constants');

const CATEGORIES = {
	WEAPONS: 'YZWeapon',
	MONSTERS: 'YZMonster',
};

// First loads the weapons,
// because some are used by the monsters.
const CATALOG_SOURCES = {
	WEAPONS: {
		myz: './gamedata/myz/myz-weapons-catalog.csv',
	},
	MONSTERS: {
		myz: './gamedata/myz/myz-monsters-catalog.csv',
		alien: './gamedata/alien/alien-monsters-catalog.csv',
	},
};

// Placeholder.
const CATALOGS = {};

/**
 * A Year Zero Object.
 */
class YZObject {
	/**
	 * @param {*} data
	 */
	constructor(data) {
		for (const key in data) {
			if (Util.isNumber(data[key])) this[key] = +data[key];
			else if (data[key] === '') this[key] = null;
			else this[key] = data[key];
		}
		if (!this.lang) this.lang = 'en';
	}

	/**
	 * The translated name of the object.
	 * @type {string}
	 * @readonly
	 */
	get name() {
		return __(this.id, this.lang);
	}

	/**
	 * The game code of the object.
	 * @type {string}
	 * @readonly
	 */
	get game() {
		if (COMPENDIA[this.source]) return this.source;
		for (const game in COMPENDIA) {
			if (COMPENDIA[game].includes(this.source)) return game;
		}
		return undefined;
	}

	static get AVAILABLE_CATEGORIES() {
		return Object.keys(CATEGORIES);
	}

	static get CATALOGS() {
		return CATALOGS;
	}

	static getAvailableGames(category) {
		return Object.keys(CATALOGS[category]);
	}

	static get(cat, game, id) {
		return CATALOGS[cat][game].get(id);
	}

	/**
	 * Gets all the Year Zero objects listed in the catalog file, in raw format.
	 * @param {string} source Path of the source catalog file
	 * @returns {Object[]}
	 * @static
	 */
	static allRaw(source) {
		let raws;
		try {
			const fileContent = fs.readFileSync(source, 'utf8');
			raws = Util.csvToJSON(fileContent);
		}
		catch(error) {
			throw new CatalogNotFoundError(`File Read Error: "${source}"`);
		}
		return raws;
	}

	/**
	 * Gets all the Year Zero objects listed in the catalog file.
	 * @param {string} cat Category of the objects to fetch
	 * @param {string} source Path of the source catalog file
	 * @returns {Discord.Collection<string, YZObject>} Collection<K, V> with K: id, V: Year Zero object
	 */
	static all(cat, source) {
		const raws = YZObject.allRaw(source);
		const objs = [];
		const _class = CATEGORIES[cat] || 'YZObject';
		for (const raw of raws) {
			const obj = new (module.exports[_class])(raw);
			objs.push(obj);
		}
		return new Collection(
			objs.map(o => [o.id, o]),
		);
	}

	/**
	 * Fetches a Year Zero object from the catalogs.
	 * @param {Discord.Message} ctx Discord message with context
	 * @param {string} cat Category of the object to fetch
	 * @param {string} game Code for the source game
	 * @param {?string} str String to search for
	 * @returns {YZObject}
	 * @throws {CatalogNotFoundError} If the catalog does not exist
	 * @static
	 * @async
	 */
	static async fetch(ctx, cat, game, str = null) {
		if (!CATALOGS[cat] || !CATALOGS[cat][game]) {
			throw new CatalogNotFoundError(
				`No **${Util.capitalize(cat.toLowerCase())}** Catalog `
				+ `for "**${SOURCE_MAP[game]}**"`,
			);
		}
		const catalog = CATALOGS[cat][game];

		if (catalog.has(str)) return catalog.get(str);

		str = str.toLowerCase();
		let matching = catalog.filter(o => o.name.toLowerCase() === str);
		if (matching.size === 0) {
			matching = catalog.filter(o =>
				o.id.includes(str) ||
				o.name.toLowerCase().includes(str),
			);
		}
		if (matching.size === 0) {
			matching = catalog;
		}
		matching = matching.map(o => [o.name, o]);
		return await Sebedius.getSelection(ctx, matching);
	}

	/**
	 * Fetches a catalog's source game.
	 * @param {Discord.Message} ctx Discord message with context
	 * @param {string} cat Category of the objects to fetch
	 * @param {?string} game Code for the source game
	 * @returns {string}
	 * @throws {TypeError} If unknown category
	 * @static
	 * @async
	 */
	static async fetchGame(ctx, cat, game = null) {
		if (!CATEGORIES[cat]) throw new TypeError(`Unknown Catalog's Category "**${cat}**"`);
		if (game && CATALOGS[cat][game]) return game;

		const choices = Object
			.keys(CATALOGS[cat])
			.map(g => [SOURCE_MAP[g], g]);

		return await Sebedius.getSelection(ctx, choices);
	}

	toString() {
		return `[${this.constructor.name}: ${this.id}]`;
	}
}

/**
 * Year Zero Monster.
 * @extends {YZObject}
 */
class YZMonster extends YZObject {
	/**
	 * @param {*} data
	 * @param {*} attacks
	 */
	constructor(data, attacks) {
		super(data);
		this._createAttributes();
		this._createArmor();
		this._createSkills();
		this._createAttacks(attacks);
	}

	/**
	 * Raw Strength used for close combat.
	 * @type {number}
	 * @readonly
	 */
	get str() {
		for (const attr in this.attributes) {
			if (ATTRIBUTE_STR.includes(attr)) return +this.attributes[attr];
		}
		return 0;
	}

	/**
	 * Raw Agility used for ranged combat.
	 * @type {number}
	 * @readonly
	 */
	get agi() {
		for (const attr in this.attributes) {
			if (ATTRIBUTE_AGI.includes(attr)) return +this.attributes[attr];
		}
		return 0;
	}

	static getAvailableGames() { return super.getAvailableGames('MONSTERS'); }
	static async fetch(ctx, game, str = null) { return super.fetch(ctx, 'MONSTERS', game, str); }
	static async fetchGame(ctx, game = null) { return super.fetchGame(ctx, 'MONSTERS', game); }

	_createAttributes() {
		this.attributes = {};
		if (this.game === 'alien') {
			this.attributes.speed = +this.speed || 1;
			this.attributes.health = +this.hp || +this.health || +this.life || 0;
		}
		for (const validAttribute of ATTRIBUTES) {
			if (this.hasOwnProperty(validAttribute)) {
				this.attributes[validAttribute] = +this[validAttribute];
				delete this[validAttribute];
			}
		}
	}

	_createArmor() {
		if (Util.isNumber(this.armor)) {
			const ar = +this.armor;
			this.armor = { default: ar };
		}
		else if (typeof this.armor === 'string' && this.armor.includes('|')) {
			const armorRatings = this.armor.split('|');
			this.armor = { default: +armorRatings.shift() };
			for (const ar of armorRatings) {
				const ars = ar.split(':');
				this.armor[ars[0]] = +ars[1];
			}
		}
		else {
			this.armor = { default: 0 };
		}
	}

	_createSkills() {
		if (typeof this.skills === 'string') {
			const skills = this.skills.split(/\|/g);
			this.skills = {};
			for (const sk of skills) {
				const s = sk.trim().split(' ');
				const skillRating = s.pop();
				const skillName = s.join('-').toLowerCase();
				this.skills[skillName] = +skillRating;
			}
		}
		else {
			this.skills = {};
		}
	}

	_createAttacks(attacks) {
		if (typeof this.attacks === 'string') {
			// Form: "atk-<name>" (.csv)
			if (this.attacks.startsWith('atk-') && this.game) {
				this.attacks = Sebedius.getTable(
					'MONSTER_SIGNATURE_ATTACKS',
					`./gamedata/${this.game}/`,
					this.attacks,
					this.lang,
					'csv',
				);
			}
			// Attack Parser
			// Form: "{<name>:<bonus>:<damage>:[c|r]<range>[:<special>]}|{...}"
			// Range: the letter 'c' forces close combat, and 'r' forces ranged combat.
			else if (this.attacks.includes('{') || this.attacks.includes('|')) {
				// Multiple attacks are separated with the '|' character.
				const atqs = this.attacks.split('|');

				// Parses each attack element.
				const out = [];
				for (const atq of atqs) {
					// Creates a weapon from the parsing.
					if (/{.+:.*:.*:[cr]?\d?(:.*)?}/.test(atq)) {
						let wpnData;
						atq.replace(
							/{(.+):(.*):(.*):([cr]?\d?)(?::(.*))?}/,
							(match, id, bonus, damage, range, special) => {
								let ranged = false;
								if (range.startsWith('c') || range.startsWith('r')) {
									ranged = range.charAt(0) === 'r';
									range = range.slice(1);
								}
								else {
									ranged = +range > 0;
								}
								wpnData = {
									id: id.toUpperCase(),
									bonus, damage,
									range, ranged, special,
									source: this.source,
								};
							},
						);
						out.push(new YZWeapon(wpnData));
					}
					// Uses a cataloged weapon.
					// Format: {w[source]-[name]}
					else if (/^{w\w{1,3}-.+}$/.test(atq)) {
						const wid = atq.replace(/{(.*)}/, (match, $1) => $1);
						const weapon = CATALOGS.WEAPONS[this.game].get(wid);
						out.push(weapon);
					}
					// Simple named effect.
					// Format: {name:effect}
					else if (/{.+:.+}/.test(atq)) {
						let atkData;
						atq.replace(/{(.+):(.+)}/, (match, $1, $2) => {
							atkData = { name: $1.toUpperCase(), effect: $2 };
						});
						out.push(atkData);
					}
					// Default weapon.
					// Format: {name}
					else if (atq.startsWith('{') && atq.endsWith('}')) {
						const wid = atq.replace(/{(.*)}/, (match, $1) => $1);
						const weapon = YZWeapon.getDefault(
							Util.capitalize(__(wid, this.lang)),
						);
						out.push(weapon);
					}
					else {
						out.push({ name: '(Special)', effect: atq });
					}
				}
				// Creates the roll intervals (the references).
				const intervals = Util.createIntervals(atqs.length, 6);
				const references = intervals.map(intvl => {
					intvl = intvl.map(x => Util.convertToBijective(x, '123456'));
					if (intvl[0] === intvl[1]) return '' + intvl[0];
					return `${intvl[0]}-${intvl[1]}`;
				});

				// Creates a new RollTable for the attacks.
				this.attacks = new RollTable(this.id);

				// Adds the attacks to the RollTable.
				out.forEach((atk, i) => {
					if (!atk) return;
					atk.ref = references[i];
					this.attacks.set(atk.ref, atk);
				});
			}
			// Otherwise, let it like this.
		}
		else if (attacks) {
			this.attacks = attacks;
		}
		else {
			this.attacks = `${Util.capitalize(__('none', this.lang))}.`;
		}
	}

	/**
	 * Returns a string for the attributes.
	 * @returns {string}
	 */
	attributesToString() {
		const out = [];
		for (const key in this.attributes) {
			if (this.attributes[key] > 0) {
				out.push(`${Util.capitalize(__(key, this.lang))} **${this.attributes[key]}**`);
			}
		}
		if (!out.length) return `*${Util.capitalize(__('none', this.lang))}*`;
		return out.join('\n');
	}

	/**
	 * Returns a string for the skills.
	 * @returns {string}
	 */
	skillsToString() {
		const out = [];
		for (const key in this.skills) {
			if (this.skills[key] > 0) {
				out.push(`${Util.capitalize(__(key, this.lang))} **${this.skills[key]}**`);
			}
		}
		if (out.length === 0) return `*${Util.capitalize(__('none', this.lang))}*`;
		return out.join('\n');
	}

	/**
	 * Returns a string for the armor.
	 * @returns {string}
	 */
	armorToString() {
		const armorTypes = Object.keys(this.armor);
		let str = '' + this.armor.default;
		if (armorTypes.length > 1) {
			str += ' (';
			const out = [];
			for (const type of armorTypes) {
				if (type === 'default') {
					continue;
				}
				else if (type === 'belly') {
					out.push(`${this.armor[type]} under the belly`);
				}
				else {
					out.push(`${this.armor[type]} vs. ${__(type, this.lang)}`);
				}
			}
			str += out.join(', ') + ')';
			str = str.replace(/1000/g, Util.capitalize(__('impervious', this.lang)));
		}
		return str;
	}

	/**
	 * Returns a string for the attacks.
	 * @returns {string}
	 */
	attacksToString() {
		if (!(this.attacks instanceof RollTable)) {
			return '```\n' + this.attacks + '\n```';
		}
		// const intvlColLen = 7, nameColLen = 18, diceColLen = 6, dmgColLen = 8;
		const intvlColLen = 5, nameColLen = 20, diceColLen = 6, dmgColLen = 8;
		let str = '```\n'
			+ Util.alignText(this.attacks.d, intvlColLen, 0)
			+ Util.alignText('Name', nameColLen, 0)
			+ Util.alignText('Base', diceColLen, 0)
			+ Util.alignText('Damage', dmgColLen, 0)
			+ 'Range\n' + '-'.repeat(intvlColLen + nameColLen + diceColLen + dmgColLen + 6);

		for (const [ref, attack] of this.attacks) {
			if (attack.name === '{REROLL}') continue;
			const n = attack.name || 'Unnamed';
			const d = attack.base ? Util.resolveNumber(attack.base) + 'D' : '-';
			const dmg = attack.damage != null ? Util.resolveNumber(attack.damage) : '-';
			const r = attack.range >= 0 ? Util.capitalize(RANGES[this.game][attack.range]) : '-';
			str += '\n'
				+ Util.alignText(`${ref}`, intvlColLen, 0)
				+ Util.alignText(n, nameColLen, 0)
				+ Util.alignText(d, diceColLen, 0)
				+ Util.alignText(`${dmg}`, dmgColLen, 0)
				+ `${r}`;
		}
		if (str.length + 4 > 2000) {
			str = Util.trimString(str, 2000 - 4);
		}
		str += '\n```';
		return str;
	}

	/**
	 * @typedef {Object} YZAttack
	 * A Year Zero Attack.
	 * @property {string} ref The roll reference of the attack
	 * @property {string} name The name of the attack
	 * @property {number} base The base dice bonus of the attack
	 * @property {number} damage The damage of the attack
	 * @property {number} range The range of the attack
	 * @property {string} effect The effect of the attack
	 */

	/**
	 * Gets a random monster attack from the available signature attacks.
	 * @param {?number} reference Specific attack, if any.
	 * @returns {YZAttack}
	 */
	getAttack(reference = null) {
		if (typeof this.attacks === 'string') {
			return { effect: this.attacks };
		}
		if (this.attacks instanceof RollTable) {
			let ref;
			if (this.attacks.length <= 6) ref = Util.rand(1, 6);
			else if (this.attacks.length <= 36) ref = Util.rollD66();
			else if (this.attacks.length <= 216) ref = Util.rollD666();
			else throw new RangeError('[YZMonster.Attack] - Reference Out of Range');

			if (reference && Util.isNumber(reference)) {
				ref = Util.modifOrSet(`${reference}`, ref);
				ref = Util.clamp(ref, 1, this.attacks.length);
			}

			const attack = this.attacks.get(ref);
			if (!attack) return undefined;
			if (attack.name === '{REROLL}' || !attack.effect) {
				return this.getAttack();
			}
			return attack;
		}
		return undefined;
	}

	getRollPhrase(attack) {
		//const attack = this.getAttack(reference);
		const out = [];

		// Fixed roll (only Base dice).
		if (/\(\d+\)/.test(attack.base)) {
			out.push(`${Util.resolveNumber(attack.base)}d[base]`);
		}
		// Unfixed roll.
		else {
			const b = attack.ranged ? this.agi : this.str;
			const s = attack.ranged ? this.skills.shoot : this.skills.fight;
			const g = attack.base;
			if (b) out.push(`${b}d[base]`);
			if (s) out.push(`${s}d[skill]`);
			if (g) out.push(`${g}d[gear]`);
		}
		return out.join('+');
	}
}

/**
 * A Year Zero Weapon.
 * @extends {YZObject}
 */
class YZWeapon extends YZObject {

	constructor(data) {
		super(data);
		this.ranged = Util.getBoolean(this.ranged);
		this._createFeatures();
	}

	get base() { return this.bonus; }
	get effect() {
		return '__'
		+ (this.bonus ? `**${Util.resolveNumber(this.bonus)}** ${__('base-dice', this.lang)}` : '')
		+ (this.bonus && this.damage ? ', ' : '')
		+ (this.damage ? `${Util.capitalize(__('damage', this.lang))} **${Util.resolveNumber(this.damage)}**` : '')
		+ '__.'
		+ (this.range >= 0 ? ` \`${__(RANGES[this.game][this.range], this.lang).toUpperCase()}\` range.` : '')
		+ (this.special ? ` ${this.special.split('|').join(', ')}` : '')
		+ (Object.keys(this.features).length ? ` *(${this.featuresToString()}.)*` : '');
	}

	_createFeatures() {
		const features = (this.features || '').split('|');
		this.features = {};

		if (!features[0]) return;
		for (const feature of features) {
			const name = feature.trim().split(' ');
			let value;
			if (Util.isNumber(name[name.length - 1])) {
				value = name.pop();
			}
			const feat = name.join('-').toLowerCase();
			if (WEAPON_FEATURES.boolean.includes(feat)) {
				this.features[feat] = true;
			}
			else if (WEAPON_FEATURES.number.includes(feat)) {
				this.features[feat] = +value;
			}
			else {
				throw new SyntaxError(`Unknown weapon feature: "${feat}".`);
			}
		}
	}

	featuresToString() {
		const out = [];
		for (const feat in this.features) {
			const feature = Util.kebabToStrUcFirst(feat);
			if (Util.isNumber(this.features[feat])) {
				out.push(`${feature} **${this.features[feat]}**`);
			}
			else if (this.features[feat] === true) {
				out.push(feature);
			}
			else {
				out.push(`${feature}: ${this.features[feat]}`);
			}
		}
		return out.join(', ');
	}

	static getAvailableGames() { return super.getAvailableGames('WEAPONS'); }
	static async fetch(ctx, game, str = null) { return super.fetch(ctx, 'WEAPONS', game, str); }
	static async fetchGame(ctx, game = null) { return super.fetchGame(ctx, 'WEAPONS', game); }

	static getDefault(name, source = 'myz') {
		return new YZWeapon({
			id: name,
			grip: 1,
			bonus: 0,
			damage: 1,
			range: 0,
			ranged: true,
			source,
		});
	}
}

module.exports = { YZObject, YZMonster, YZWeapon };

// Prefetches all the catalogs.
console.log('[+] - Catalogs');
console.log('      > Indexation...');
for (const cat in CATALOG_SOURCES) {
	CATALOGS[cat] = {};
	for (const game in CATALOG_SOURCES[cat]) {
		CATALOGS[cat][game] = YZObject.all(cat, CATALOG_SOURCES[cat][game]);
		console.log(`        • ${cat}: ${game} (${CATALOGS[cat][game].size})`);
	}
}
console.log('      > Loaded & Ready!');