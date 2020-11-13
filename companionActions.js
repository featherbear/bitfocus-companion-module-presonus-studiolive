const { CHANNELS } = require('presonus-studiolive-api')

const choiceMapChannels = [{id: "", label: ""}].concat(Object.entries(CHANNELS).map(([k, v]) => ({
  id: v,
  label: k.replace(/_/g, ' ')
})))

module.exports = {
  mute: {
    label: 'Mute Channel',
    options: [
      {
        label: 'Channel to mute',
        type: 'dropdown',
        id: 'channel',
        choices: choiceMapChannels
      }
    ]
  },
  unmute: {
    label: 'Unmute Channel',
    options: [
      {
        label: 'Channel to unmute',
        type: 'dropdown',
        id: 'channel',
        choices: choiceMapChannels
      }
    ]
  }
}
