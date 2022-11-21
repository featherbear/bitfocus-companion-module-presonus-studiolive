const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { ChannelSelector, Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import generateChannels from './channels'
import generateActions from './companionActions'
import generateFeedbacks from './companionFeedbacks'
import generatePresets from './companionPresets'
import generateMixes from './mixes'
import CompanionModule, { CompanionModuleInstance } from './types/CompanionModule'

type ConfigType = {
  host: string
  port: number
  name: string
  customVariables: string
}

const defaultVariables: { label: string, name: string }[] = [
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
  },
]
class Instance extends CompanionModuleInstance<ConfigType> {
  client: StudioLiveAPI
  extraVariables: (typeof defaultVariables[number] & { resolver: string, fallback: any })[]
  intervals: NodeJS.Timeout[]

  init() {
    this.intervals?.forEach(id => clearInterval(id))
    this.intervals = []

    let dummyChannels = generateChannels(<any>{})
    let dummyMixes = generateMixes(<any>{})

    this.setActions(generateActions(dummyChannels, dummyMixes))
    this.setFeedbackDefinitions(generateFeedbacks.call(this, dummyChannels, dummyMixes));

    let customVariables = this.config.customVariables?.split(";")
    this.extraVariables = []
    if (customVariables?.length > 0) {
      customVariables.map((s) => {
        const [key, value, fallback] = /^(.+?)=(.+?)(?:\|(.+?))?$/.exec(s)?.slice(1)
        if (!key || !value) return
        this.extraVariables.push({
          name: key,
          label: "Custom: " + key,
          resolver: value,
          fallback
        })
      }
      )
    }
    this.setVariableDefinitions([...defaultVariables, ...this.extraVariables]);

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
          this.setFeedbackDefinitions(generateFeedbacks.call(this, channels, mixes));
          this.setPresetDefinitions(generatePresets.call(this, channels, mixes))

          this.checkFeedbacks('channel_mute')
          this.checkFeedbacks('channel_colour')

          if (this.extraVariables.length > 0) {
            this.intervals.push(setInterval(() => {
              this.extraVariables.forEach((variable) => {
                this.setVariable(variable.name, this.client.state.get(variable.resolver, variable.fallback))
              })
            }, 1000))
          }


          this.setVariable('console_model', this.client.state.get('global.mixer_name'))
          this.setVariable('console_version', this.client.state.get('global.mixer_version'))
          this.setVariable('console_serial', this.client.state.get('global.mixer_serial'))

          this.status(this.STATUS_OK)
        }).catch(e => {
          this.status(this.STATUS_ERROR, e.message)
        })
    }
  }

  config_fields() {
    const fields: { [k in keyof ConfigType]: Omit<CompanionModule.CompanionConfigField, 'id'> & { default?, regex?} } & {
      info, info2
    } = {
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
      },
      info2: {
        type: 'text',
        width: 12,
        label: 'Custom Variables',
        value: 'Semicolon separated list of `variable=resolver|default` entries. `|default` is optional'
      },
      customVariables: {
        type: 'textinput',
        label: '',
        default: 'current_scene=presets.loaded_scene_title;current_project=presets.loaded_project_title',
        width: 12
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
    this.intervals?.forEach(id => clearInterval(id))
    this.client?.close()
    this.debug('destroy', this.id)
  }

  updateConfig(config) {
    this.config = config

    this.init()
  }
}

module.exports = Instance
export default Instance