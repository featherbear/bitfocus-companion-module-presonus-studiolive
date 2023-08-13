const mid = require('node-machine-id').machineIdSync({ original: true }).replace(/-/g, '')

import { ChannelSelector, Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import generateChannels from './channels'
import { generateRecallProjectSceneEntry } from './util/actionsUtils'
// import generateFeedbacks from './companionFeedbacks.ts.off'
// import generatePresets from './companionPresets.ts.off'
import generateMixes from './mixes'

import { ValueSeparator } from './util/Constants'
import { FunctionDebouncer } from './util/FunctionDebouncer'




import { CompanionActionDefinitions, CompanionConfigField, Regex, CompanionVariableDefinition, InstanceBase, InstanceStatus, SomeCompanionConfigField, CompanionInputFieldStaticText, runEntrypoint } from '@companion-module/base'
import ConfigType from './types/Config'
import DEFAULTS from './defaults'
import generateActions from './actions'


class Instance extends InstanceBase<ConfigType> {
  constructor(internal) {
		super(internal)
	}

  client: StudioLiveAPI
  consoleStateVariables: Array<CompanionVariableDefinition & { resolver: string, fallback: any }>
  intervals: NodeJS.Timeout[]

  async destroy(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  async configUpdated(config: ConfigType): Promise<void> {
    throw new Error('Method not implemented.')
  }

  /**
   * Clear any existing intervals
   */
  #__resetIntervals() {
    this.intervals?.forEach(id => clearInterval(id))
    this.intervals = []
  }



  async reconnect(config: ConfigType) {
    this.#__resetIntervals()
    this.client?.close?.()

    if (!config.host || !config.port) {
      this.updateStatus(InstanceStatus.BadConfig, "Console address not set")
      return
    }

    /**
     * Create instance
     */
    this.client = new StudioLiveAPI({
      host: config.host,
      port: config.port
    }, {
      autoreconnect: true
    })

    /**
     * Register listeners
     */
    this.client.on(MessageCode.ParamValue, () => {
      this.checkFeedbacks('channel_mute')
    })

    this.client.on(MessageCode.ParamChars, () => {
      this.checkFeedbacks('channel_colour')
    })

    /**
     * Connect
     */
    this.updateStatus(InstanceStatus.Connecting)
    await this.client.connect({
      clientDescription: config.name, // Name of the client
      clientIdentifier: `bitfocus:${mid}` // ID of the client
    })

    /**
     * Update Companion with console states
     */
    this.setVariableValues({
      console_model: this.client.state.get('global.mixer_name'),
      console_version: this.client.state.get('global.mixer_version'),
      console_serial: this.client.state.get('global.mixer_serial'),
    })

    let channels = generateChannels(this.client.channelCounts)
    let mixes = generateMixes(this.client.channelCounts)

    const baseActionDefinitions = generateActions.call(this, channels, mixes)
    this.setActionDefinitions(baseActionDefinitions)
    // this.setFeedbackDefinitions(generateFeedbacks.call(this, channels, mixes));
    // this.setPresetDefinitions(generatePresets.call(this, channels, mixes))

    this.checkFeedbacks('channel_mute')
    this.checkFeedbacks('channel_colour')


    if (this.consoleStateVariables.length > 0) {
      this.intervals.push(
        setInterval(() => {
          this.setVariableValues(
            this.consoleStateVariables.reduce(
              (obj, variable) => ({
                ...obj,
                [variable.name]: this.client.state.get(variable.resolver, variable.fallback)
              }), {})
          )

        }, 1000))
    }

    /**
     * Initialise scene debouncer
     */
    {
      const SceneDebouncer = new FunctionDebouncer(200, true, async () => {
        const projects = await this.client.getProjects(true)
        const list: {
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
          }))
        ])

        this.setActionDefinitions({
          ...baseActionDefinitions,
          ...generateRecallProjectSceneEntry(
            list.map((map) => ({
              id: [map.projectName, map.sceneName].filter(v => v).join(ValueSeparator),
              label: [map.projectTitle, map.sceneTitle].filter(v => v).join(" - ")
            }))
          )
        })
      })

      SceneDebouncer.touchImmediate()
      this.client.on(MessageCode.JSON, (json) => {
        if (json.id == 'RenamedPreset' || json.id == 'StoredPreset') SceneDebouncer.touch()
      })
    }

    this.updateStatus(InstanceStatus.Ok)
  }

  async init(config: ConfigType, isFirstInit: boolean): Promise<void> {
    // throw new Error('Method not implemented.')

    this.#__resetIntervals()

    if (isFirstInit) {
      this.setActionDefinitions(generateActions.call(this, DEFAULTS.dummyChannels, DEFAULTS.dummyMixes))
      // this.setFeedbackDefinitions(generateFeedbacks.call(this, DEFAULTS.dummyChannels, DEFAULTS.dummyMixes));
    }

    /**
     * Console state variables
     */
    {
      this.consoleStateVariables = []

      let consoleStateVariables = config.customVariables?.split(";")
      if (consoleStateVariables?.length > 0) {
        consoleStateVariables.map((s) => {
          const [key, value, fallback] = /^(.+?)=(.+?)(?:\|(.+?))?$/.exec(s)?.slice(1)
          if (!key || !value) return
          this.consoleStateVariables.push({
            variableId: key,
            name: "Custom: " + key,
            resolver: value,
            fallback
          })
        })
      }

      this.setVariableDefinitions([...DEFAULTS.consoleStateVariables, ...this.consoleStateVariables]);
    }

    try {
      await this.reconnect(config)
    } catch (e) {
      this.updateStatus(InstanceStatus.UnknownError, e.message)
    }
  }


  getConfigFields(): SomeCompanionConfigField[] {
    const fields: {
      [k in keyof ConfigType]: Omit<SomeCompanionConfigField, 'id'> & { default?, regex?}
    } | {
      [K: string]: Omit<CompanionInputFieldStaticText, 'id'>
    }
      = {
      info: {
        type: 'static-text',
        label: 'Information',
        value: 'This module communicates to a PreSonus StudioLive III console',
      },
      host: {
        type: 'textinput',
        label: 'StudioLive Console IP',
        width: 6,
        default: '',
        regex: Regex.IP
      },
      port: {
        type: 'textinput',
        label: 'StudioLive Console Port',
        width: 6,
        default: 53000,
        regex: Regex.PORT
      },
      name: {
        type: 'textinput',
        label: 'Client name',
        width: 6,
        default: 'Companion'
      },
      info2: {
        type: 'static-text',
        label: 'Custom Variables',
        value: 'Semi-colon separated list of `variable=resolver|default` entries. `|default` is optional'
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

  

  // action(data: { action: string, options }) {
  //   const id = data.action
  //   const opt = data.options



  //   const handle = (id) => {
  //     switch (id) {
  //       case 'mute': {
  //         this.client.mute(readChannel())
  //         break
  //       }
  //       case 'unmute': {
  //         this.client.unmute(readChannel())
  //         break
  //       }
  //       case 'toggleMute': {
  //         this.client.toggleMute(readChannel())
  //         break
  //       }
  //       case 'mute_smooth': {
  //         const selector = readChannel()
  //        
  //         break
  //       }
  //       case 'unmute_smooth': {
  //         const selector = readChannel()
  //         

  //         break
  //       }
  //       case 'toggleMute_smooth': {
  //         break
  //       }
  //       case 'recallProjectOrScene': {
  //         let [project, scene] = (<string>opt.project_scene).split(ValueSeparator)
  //         if (scene) {
  //           this.client.recallProjectScene(project, scene)
  //         } else {
  //           this.client.recallProject(project)
  //         }
  //         break
  //       }
  //     }

  //   }
  //   handle(id)
  // }

  // destroy() {
  //   this.intervals?.forEach(id => clearInterval(id))
  //   this.client?.close()
  //   this.debug('destroy', this.id)
  // }

  // updateConfig(config) {
  //   this.config = config

  //   this.init()
  // }
}

// type InstanceType = typeof Instance
// export default InstanceType
export default Instance

runEntrypoint(Instance, [])