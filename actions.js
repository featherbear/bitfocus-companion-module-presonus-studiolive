const { CHANNELS } = require('presonus-studiolive-api')

const choiceMapChannels = Object.entries(CHANNELS).map(([k, v]) => ({id: v, label: k.replace(/_/g, ' ')}))

module.exports = {

  getActions () {
    const actions = {}
    actions.mute = {
      label: 'Mute Channel',
      options: [{
        label: 'Channel to mute',
        type: 'dropdown',
        id: 'channel',
        choices: choiceMapChannels
      }]
    }

    actions.unmute = {
      label: 'Unmute Channel',
      options: [{
        label: 'Channel to unmute',
        type: 'dropdown',
        id: 'channel',
        choices: choiceMapChannels
      }]
    }

    return actions
  }
}
