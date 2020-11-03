module.exports = {

  getActions () {
    const actions = {}
    actions.mute = {
      label: 'Mute Channel',
      options: [{
        label: 'Channel to mute',
        type: 'textinput',
        id: 'channel'
      }]
    }

    actions.unmute = {
      label: 'Unmute Channel',
      options: [{
        label: 'Channel to unmute',
        type: 'textinput',
        id: 'channel'
      }]
    }

    return actions
  }
}
