const YZGenerator = require('./YZGenerator');
const LegendData = require('../gamedata/fbl/legend-generator.json');

class FBLLegendGenerator extends YZGenerator {
	constructor() {
		super(LegendData);

		/**
		 * The text of the legend.
		 * @type {string}
		 */
		this.story = '';

		// Completes the story.
		for (const key in this.data) {
			this.story += `${this.data[key].define}**${this.data[key].value.toLowerCase()}**`;
		}

		// Ends the story.
		this.story += '.';
	}
}

module.exports = FBLLegendGenerator;