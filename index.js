const instance_skel = require('../../instance_skel')
const api = require('presonus-studiolive-api')
const actions = require('./actions')

class instance extends instance_skel {
  constructor (system, id, config) {
    super(system, id, config)

    Object.assign(this, { ...actions })

    this.actions()
  }

  actions (system) {
    this.setActions(this.getActions())
  }

  config_fields () {
    return [
      {
        type: 'text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: 'This module communicates to a PreSonus StudioLive III console'
      },
      {
        type: 'textinput',
        id: 'host',
        label: 'StudioLive Console IP',
        width: 6,
        default: '',
        regex: this.REGEX_IP
      },
      {
        type: 'textinput',
        id: 'name',
        label: 'Client name',
        width: 6,
        default: 'Companion'
      },
      {
        type: 'text',
        id: 'passcode-note',
        width: 12,
        label: 'Note',
        value: 'Currently, permission must be granted from an already authorised device'
      }
      // ,{
      //    type: 'textinput',
      //    id: 'pass',
      //    label: 'Access Code',
      //    width: 6,
      // }
    ]
  }

  action (action) {
    const id = action.action
    let cmd
    const opt = action.options

    switch (id) {
      case 'info':
        cmd = opt.url
        break
    }
  }

  destroy () {
    this.debug('destroy', this.id)
  }

  init () {
    this.init_variables()

    this.status(this.STATE_OK)
  }

  updateConfig (config) {
    this.config = config

    this.actions()
  }

  init_variables () {
    const variables = [
      { name: 'dynamic1', label: 'dynamic variable' }
      // { name: 'dynamic2', label: 'dynamic var2' },
    ]

    this.setVariableDefinitions(variables)
  }
}

exports = module.exports = instance
