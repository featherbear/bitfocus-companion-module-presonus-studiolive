### Configuration

- **StudioLive Console IP** - The IP address or hostname of the console
- **StudioLive Console Port** - Port number (default: `53000`)
- **Client name** - Client identifier

### Available Actions

- Mute
- Unmute
- Toggle Mute
- Recall Project / Scene

Mute actions can be configured as smooth 'fade to zero' / 'fade from zero' mutes

### Available Feedbacks

- Mute Status
- Channel Colour

### Available Variables

|Variable|Description|Example|
|:---:|:---|:---|
|`console_model`|Console Model|StudioLive 16R|
|`console_version`|Console Version|2.5.17953|
|`console_serial`|Console Serial|RA1E11030210|

#### Custom Variables

A semi-colon separated list of `variable=resolver|default` entries can be provided in the module configuration.

* `variable` - Name of the variable
* `resolver` - Key of the value
* `default` - (optional) Default value if the key could not be found

For example, `current_scene=presets.loaded_scene_title;current_project=presets.loaded_project_title` will generate the two variables

|Variable|Value|
|:---:|:---|
|`current_scene`|Standard Service|
|`current_project`|Sunday Sounds|