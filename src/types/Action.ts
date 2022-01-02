export type DropdownActionOptionChoice = {
    /**
     * Choice ID
     */
    id: string,

    /**
     * Choice label
     */
    label: string
}

export type DropdownActionOption = {
    type: 'dropdown'

    /**
     * Option label
     */

    label: string

    /**
     * Option ID
     */
    id?: string

    choices: Array<DropdownActionOptionChoice>

    /**
     * Default choice id
     */
    default?: string

}

export type ActionOption = DropdownActionOption

export interface Action {
    label: string
    options: ActionOption[]
}

export type Actions = { [id: string]: Action }