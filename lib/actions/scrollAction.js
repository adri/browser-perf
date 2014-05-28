module.exports = function(cfg) {
	return function(browser) {
		var fs = require('fs'),
			wd = require('wd'),
			jsmin = require('jsmin').jsmin,
			helpers = require('../helpers');

		var debug = require('debug')('browserperf:scrollAction');

		var scroll = jsmin(fs.readFileSync(__dirname + '/page_scripts/scroll.js', 'utf-8')),
			gesture_common = jsmin(fs.readFileSync(__dirname + '/page_scripts/gesture_common.js', 'utf-8'));

		var runner = function(opts) {
			console.log("Scrolling with ", opts);
			window.__scrollActionDone = false;
			window.__scrollAction = new __ScrollAction(function() {
				window.__scrollActionDone = true;
			});
			window.__scrollAction.start({
				element: opts.el || document.body,
				left_start_percentage: opts.left_start_percentage,
				top_start_percentage: opts.top_start_percentage,
				direction: opts.direction,
				speed: opts.speed,
				gesture_source_type: opts.gesture_source_type
			});
		};

		debug('Initializing Scroll function');
		return browser.execute(gesture_common + scroll + helpers.fnCall(runner, {
			left_start_percentage: 0.5,
			top_start_percentage: 0.5,
			direction: 'down',
			speed: 800,
			gesture_source_type: 0
		})).then(function() {
			debug('Waiting for Scrolling to finish');
			return browser.waitFor({
				asserter: wd.asserters.jsCondition('(window.__scrollActionDone === true)', false),
				timeout: 1000 * 60 * 10,
				pollFreq: 1000
			});
		})
	}
}