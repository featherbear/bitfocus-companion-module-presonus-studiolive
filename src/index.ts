const instance_skel = require('../../../instance_skel')
const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { ChannelSelector, Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import { generateChannels } from './channels'
import { generateActions } from './companionActions'
import generateFeedback from './companionFeedbacks'
import { generateMixes } from './mixes'
import { Action } from './types/Action'

type ConfigFields = 'host' | 'port' | 'name'

class Instance extends instance_skel {
  client: StudioLiveAPI
  config: { [k in ConfigFields]: any }

  init() {
    let dummyChannels = generateChannels(<any>{})
    let dummyMixes = generateMixes(<any>{})

    this.setActions(generateActions(dummyChannels, dummyMixes))
    this.setFeedbackDefinitions(generateFeedback.call(this, dummyChannels, dummyMixes));

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
      this.client = new StudioLiveAPI({
        host: this.config.host,
        port: this.config.port
      }, {
        autoreconnect: true
      })
      this.client.on(MessageCode.ParamValue, () => {
        this.checkFeedbacks('channel_mute')
      })
      this.client.on(MessageCode.ParamChars, () => {
        this.checkFeedbacks('channel_colour')
      })


      this.status(this.STATUS_UNKNOWN, 'Connecting')
      this.client.connect({
        clientDescription: this.config.name, // Name of the client
        clientIdentifier: `bitfocus:${mid}` // ID of the client
      })
        .then(() => {
          let channels = generateChannels(this.client.channelCounts)
          let mixes = generateMixes(this.client.channelCounts)

          this.setActions(generateActions(channels, mixes))
          this.setFeedbackDefinitions(generateFeedback.call(this, channels, mixes));

          this.checkFeedbacks('channel_mute')
          this.checkFeedbacks('channel_colour')

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

    const [type, channel] = opt.channel.split(',')
    let selector: ChannelSelector = {
      type,
      channel
    }

    if (opt.mix) {
      const [type, channel] = opt.mix.split(',');
      (<ChannelSelector>selector).mixType = type;
      (<ChannelSelector>selector).mixNumber = channel;
    }

    switch (id) {
      case 'mute': {
        this.client.mute(selector)
        break
      }
      case 'unmute': {
        this.client.unmute(selector)
        break
      }
      case 'toggleMute': {
        this.client.toggleMute(selector)
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