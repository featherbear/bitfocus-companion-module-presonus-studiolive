const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { ChannelSelector, Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import generateChannels from './channels'
import generateActions, { extendActions, generateRecallProjectSceneEntry } from './companionActions'
import generateFeedbacks from './companionFeedbacks'
import generatePresets from './companionPresets'
import generateMixes from './mixes'
import CompanionModule, { CompanionModuleInstance } from './types/CompanionModule'
import { ValueSeparator } from './util/Constants'
import { FunctionDebouncer } from './util/FunctionDebouncer'

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

          const staticActions = generateActions(channels, mixes)
          this.setActions(staticActions)
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

          let SceneDebouncer = new FunctionDebouncer(200, true, async () => {
            let projects = await this.client.getProjects(true)
            let list: {
              projectName: string
              projectTitle: string
              sceneName?: string
              sceneTitle?: string
            }[] = projects.flatMap((project) => [
              {
                projectName: project.name,
                projectTitle: project.title
              },
              ...project.scenes.map((scene) => ({
                projectName: project.name,
                projectTitle: project.title,
                sceneName: scene.name,
                sceneTitle: scene.title
              }))])

            this.setActions(extendActions(staticActions, generateRecallProjectSceneEntry(
              list.map((map) => ({
                id: [map.projectName, map.sceneName].join(ValueSeparator),
                label: [map.projectTitle, map.sceneTitle].join(" - ")
              }))
            )))
          })

          SceneDebouncer.touchImmediate()
          this.client.on(MessageCode.JSON, (json) => {
            if (json.id == 'RenamedPreset' || json.id == 'StoredPreset') SceneDebouncer.touch()
          })

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

    const [type, channel] = opt.channel.split(ValueSeparator)
    let selector: ChannelSelector = {
      type,
      channel
    }

    if (opt.mix) {
      const [type, channel] = opt.mix.split(ValueSeparator);
      (<ChannelSelector>selector).mixType = type;
      (<ChannelSelector>selector).mixNumber = channel;
    }

    const handle = (id) => {
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
        case 'mute_smooth': {
          let currentLevel = this.client.getLevel(selector)
          this.client.setChannelVolumeLinear(selector, 0, opt.transition).then(() => {
            this.client.mute(selector)
            this.client.setChannelVolumeLinear(selector, currentLevel)
          })
          break
        }
        case 'unmute_smooth': {
          let currentLevel = this.client.getLevel(selector)
          this.client.setChannelVolumeLinear(selector, 0, 0).then(() => {
            this.client.unmute(selector)
            this.client.setChannelVolumeLinear(selector, currentLevel, opt.transition)
          })

          break
        }
        case 'toggleMute_smooth': {
          handle(this.client.getMute(selector) ? 'unmute_smooth' : 'mute_smooth')
          break
        }
        case 'recallProjectOrScene': {
          let [project, scene] = (<string>opt.project_scene).split(ValueSeparator)
          if (scene) {
            this.client.recallProjectScene(project, scene)
          } else {
            this.client.recallProject(project)
          }
        }
      }

    }
    handle(id)
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