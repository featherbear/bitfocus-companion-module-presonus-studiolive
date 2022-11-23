export class FunctionDebouncer {
    #delay: number
    #shouldExtendOnTouch: boolean
    #timeout: NodeJS.Timeout
    #callback: Function
    
    /**
     * 
     * @param delayMs Timeout time
     * @param extendOnTouch Should the timeout be extended on touch
     * @param newFunction Callback function to use when the debounce is complete
     */
    constructor(delayMs: number, extendOnTouch?: boolean, newFunction?: Function) {
        this.#delay = delayMs
        this.#shouldExtendOnTouch = extendOnTouch
        this.#timeout = null
        this.#callback = newFunction ?? null
    }

    #clearTimeout() {
        clearTimeout(this.#timeout)
        this.#timeout = null
    }

    #createTimeout() {
        this.#clearTimeout()
        this.#timeout = setTimeout(() => this.touchImmediate(), this.#delay)
    }

    /**
     * Notify the debouncer of an event
     * @param newFunction New callback function to use when the debounce is complete
     */
    touch(newFunction?: Function) {
        if (this.#shouldExtendOnTouch) this.#clearTimeout()
        if (typeof newFunction === 'function') this.#callback = newFunction
        if (this.#shouldExtendOnTouch) this.#createTimeout()
    }

    /**
     * Immediate execute the callback, cancelling the timer
     */
    touchImmediate() {
        this.#clearTimeout()
        this.#callback?.()
    }
}