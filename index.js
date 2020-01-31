var instance_skel = require('../../instance_skel');
var actions       = require('./actions');

var debug;
var log;

class instance extends instance_skel {

	constructor(system,id,config) {
		super(system,id,config)

		Object.assign(this, {...actions})

		this.actions()
	}

	actions(system) {
		this.setActions(this.getActions());
	}

	config_fields() {

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module is a template.'
		}
	]
	}

		action(action) {
		let id = action.action;
		let cmd;
		let opt = action.options;

		switch (id){
			case 'info':
					cmd = opt.url
					break
		}
	}

	destroy() {

		debug("destroy", this.id);
	}

	init() {
		debug = this.debug;
		log = this.log;

		this.init_variables()

		this.status(this.STATE_OK)

	}

	updateConfig(config) {

		this.config = config

		this.actions()

	}

	init_variables() {

		var variables = [
			{ name: 'dynamic1', label: 'dynamic variable' },
			// { name: 'dynamic2', label: 'dynamic var2' },
		]

		this.setVariableDefinitions(variables)

	}

}

exports = module.exports = instance;
