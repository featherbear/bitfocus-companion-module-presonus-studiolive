const instance_skel = require('../../instance_skel')
const { Client: StudioLiveAPI } = require('presonus-studiolive-api')
const actions = require('./companionActions')
const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

class instance extends instance_skel {
  constructor (system, id, config) {
    super(system, id, config)

    this.setActions(actions)
  }

  init () {
    // const variables = [
    //   { name: 'dynamic1', label: 'dynamic variable' }
    //   // { name: 'dynamic2', label: 'dynamic var2' },
    // ]
    // this.setVariableDefinitions(variables)

    this.client = new StudioLiveAPI(this.config.host, this.config.port)
    this.status(this.STATUS_UNKNOWN, 'Connecting')

    this.client.connect({
      clientDescription: this.config.name, // Name of the client
      clientIdentifier: `bitfocus:${mid}` // ID of the client
    })
      .then(() => {
        this.status(this.STATE_OK)
      }).catch(e => {
        this.status(this.STATUS_ERROR, e.message)
      })
  }

  config_fields () {
    return [
      {
        type: 'text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: 'This module communicates to a PreSonus StudioLive III console. Commands will not work until the module is authorised.'
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
        id: 'port',
        label: 'StudioLive Console Port',
        width: 6,
        default: 53000,
        regex: this.REGEX_PORT
      },
      {
        type: 'textinput',
        id: 'name',
        label: 'Client name',
        width: 6,
        default: 'Companion'
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
    const opt = action.options

    switch (id) {
      case 'mute':
        this.client.mute(...opt.channel.split(','))
        break
      case 'unmute':
        this.client.unmute(...opt.channel.split(','))
        break
    }
  }

  destroy () {
    this.debug('destroy', this.id)
  }

  updateConfig (config) {
    this.config = config

    this.client && this.client.close()
    this.init()
  }
}

exports = module.exports = instance
