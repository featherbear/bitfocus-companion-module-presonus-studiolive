const instance_skel = require('../../../instance_skel')
const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { Client as StudioLiveAPI } from 'presonus-studiolive-api'
import companionActions, { ActionKeys } from './companionActions'

type ConfigFields = 'host' | 'port' | 'name'


module.exports = class extends instance_skel {
  client: StudioLiveAPI
  config: { [k in ConfigFields]: any }

  constructor(system, id, config) {
    super(system, id, config)

    this.setActions(companionActions)
  }

  init() {
    // const variables = [
    //   { name: 'dynamic1', label: 'dynamic variable' }
    //   // { name: 'dynamic2', label: 'dynamic var2' },
    // ]
    // this.setVariableDefinitions(variables)

    this.client?.close?.()
    if (!this.config.host || !this.config.port) {
      this.status(this.STATUS_ERROR, 'Setup')
    } else {
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
  }

  config_fields() {
    const fields: { [k in ConfigFields]: { [s: string]: any } } & { [s: string]: any } = {
      info: {
        type: 'text',
        width: 12,
        label: 'Information',
        value: 'This module communicates to a PreSonus StudioLive III console'
      },
      host: {
        type: 'textinput',
        label: 'StudioLive Console IP',
        width: 6,
        default: '',
        regex: this.REGEX_IP
      },
      port: {
        type: 'textinput',
        label: 'StudioLive Console Port',
        width: 6,
        default: 53000,
        regex: this.REGEX_PORT
      },
      name: {
        type: 'textinput',
        label: 'Client name',
        width: 6,
        default: 'Companion'
      }
    }

    return Object.entries(fields).map(
      ([id, obj]) => ({ ...obj, id })
    )
  }

  action(data: { action: string, options }) {
    const id = data.action as ActionKeys
    const opt = data.options

    switch (id) {
      case 'mute': {
        const [type, channel] = opt.channel.split(',')
        this.client.mute({ type, channel: Math.trunc(channel) })
        break
      }
      case 'unmute': {
        const [type, channel] = opt.channel.split(',')
        this.client.unmute({ type, channel: Math.trunc(channel) })
        break
      }
      case 'toggleMute': {
        const [type, channel] = opt.channel.split(',')
        this.client.toggleMute({ type, channel: Math.trunc(channel) })
        break
      }
    }
  }

  destroy() {
    this.debug('destroy', this.id)
  }

  updateConfig(config) {
    this.config = config


    this.init()
  }
}

