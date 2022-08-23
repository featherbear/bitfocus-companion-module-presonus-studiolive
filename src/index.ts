const instance_skel = require('../../../instance_skel')
const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import { generateChannels } from './channels'
import { generateActions } from './companionActions'
import generateFeedback from './companionFeedbacks'
import { Action } from './types/Action'

type ConfigFields = 'host' | 'port' | 'name'

class Instance extends instance_skel {
  client: StudioLiveAPI
  config: { [k in ConfigFields]: any }

  init() {
    let channels = generateChannels(<any>{})
    this.setActions(generateActions(channels))
    this.setFeedbackDefinitions(generateFeedback.call(this, channels));

    this.setVariableDefinitions([
      {
        label: "Console Model",
        name: 'console_model',
      },
      {
        label: "Console Version",
        name: 'console_version',
      },
      {
        label: "Console Serial",
        name: 'console_serial',
      }
    ]);

    this.client?.close?.()

    if (!this.config.host || !this.config.port) {
      this.status(this.STATUS_ERROR, 'Setup')
    } else {
      this.client = new StudioLiveAPI(this.config.host, this.config.port)
      this.client.on(MessageCode.ParamValue, () => {
        this.checkFeedbacks('channel_mute')
      })

      this.status(this.STATUS_UNKNOWN, 'Connecting')
      this.client.connect({
        clientDescription: this.config.name, // Name of the client
        clientIdentifier: `bitfocus:${mid}` // ID of the client
      })
        .then(() => {
          let channels = generateChannels(this.client.channelCounts)
          this.setActions(generateActions(channels))
          this.setFeedbackDefinitions(generateFeedback.call(this, channels));

          this.setVariable('console_model', this.client.state.get('global.mixer_name'))
          this.setVariable('console_version', this.client.state.get('global.mixer_version'))
          this.setVariable('console_serial', this.client.state.get('global.mixer_serial'))


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
    const id = data.action
    const opt = data.options

    switch (id) {
      case 'mute': {
        const [type, channel] = opt.channel.split(',')
        this.client.mute({ type, channel })
        break
      }
      case 'unmute': {
        const [type, channel] = opt.channel.split(',')
        this.client.unmute({ type, channel })
        break
      }
      case 'toggleMute': {
        const [type, channel] = opt.channel.split(',')
        this.client.toggleMute({ type, channel })
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

module.exports = Instance
export default Instance