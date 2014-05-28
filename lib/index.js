var Q = require('q'),
	wd = require('wd'),
	actions = require('./actions'),
	Metrics = require('./metrics'),
	helpers = require('./helpers');

var debug = require('debug')('browserperf:Main');

function main(url, cb, cfg) {
	var opts = require('./options').scrub(cfg),
		errors = [],
		results = [];
	var res = [],
		err = [];
	opts.browsers.map(function(browserConfig) {
		return function() {
			return runOnBrowser(url, browserConfig, opts).then(function(data) {
				data._browserName = browserConfig.browserName;
				res.push(data);
			}, function(error) {
				err.push(error);
			});
		}
	}).reduce(Q.when, Q()).then(function() {
		cb(err.length === 0 ? undefined : err, res);
	}, function(err) {
		cb(err);
	}).done();
}

function runOnBrowser(url, browserConfig, opts) {
	browser = wd.promiseRemote(opts.selenium);
	debug('Selenium is on %s', browser.noAuthConfigUrl.hostname);
	browser.on('status', function(data) {
		//debug(data);
	});
	browser.on('command', function(meth, path, data) {
		if (data && typeof data === 'object') {
			var str = JSON.stringify(data);
			if (str.length > 80)
				data = str.substring(0, 75) + '...';
		}
		//debug(' > ', meth, path, data);
	});
	var metrics = new Metrics(opts.metrics);
	return metrics.setup(opts).then(function() {
		return browser.init(browserConfig);
	}).then(function() {
		debug('Session is ' + browser.sessionID);
		debug('Running Prescript');
		return opts.preScript(browser);
	}).then(function() {
		if (url) {
			return browser.get(url);
		}
	}).then(function() {
		return metrics.start(browser);
	}).then(function() {
		return actions.perform(browser, opts.actions);
	}).then(function() {
		return metrics.teardown(browser);
	}).then(function() {
		return metrics.getResults();
	}).fin(function() {
		if (opts.debugBrowser) {
			debug('debugBrowser is ON, so not closing the browser');
		} else {
			return browser.quit();
		}
	});
}

module.exports = main;
module.exports.actions = actions.actions;
module.exports.runner = require('./runner');