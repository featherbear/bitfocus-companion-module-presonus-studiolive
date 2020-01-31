module.exports = {

	getActions() {
		var actions = {}
			actions['info'] = {
					label: 'module info',
					options: [{
							label: 'info to get',
							type: 'textinput',
							id: 'url',
							default: 'hello'
					}]
			}

				return actions
		}
}
