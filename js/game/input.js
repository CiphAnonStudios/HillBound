/*
 * Hillbound
 * Input System
 * js/game/input.js
 *
 * Handles:
 * - Keyboard controls
 * - Gas / brake
 * - Pause
 * - Restart
 * - Input state
 * - Key aliases
 * - Preventing unwanted browser behavior
 * - Mobile-control compatibility
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Input = {

        keys: {},
        previousKeys: {},

        state: {
            gas: false,
            brake: false,
            left: false,
            right: false,

            pause: false,
            restart: false,

            up: false,
            down: false,

            accelerate: false,
            reverse: false
        },

        previousState: {
            gas: false,
            brake: false,
            left: false,
            right: false,

            pause: false,
            restart: false,

            up: false,
            down: false,

            accelerate: false,
            reverse: false
        },

        initialized: false,

        options: {
            keyboardEnabled: true,
            preventDefault: true
        },

        keyMap: {
            ArrowRight: "gas",
            KeyD: "gas",

            ArrowLeft: "brake",
            KeyA: "brake",

            ArrowUp: "gas",
            KeyW: "gas",

            ArrowDown: "brake",
            KeyS: "brake",

            Space: "pause",
            Escape: "pause",

            KeyR: "restart"
        },

        init(options) {
            if (this.initialized) {
                return this;
            }

            options = options || {};

            this.options.keyboardEnabled =
                options.keyboardEnabled !== undefined
                    ? !!options.keyboardEnabled
                    : true;

            this.options.preventDefault =
                options.preventDefault !== undefined
                    ? !!options.preventDefault
                    : true;

            this.bindKeyboard();

            this.initialized = true;

            return this;
        },

        bindKeyboard() {
            window.addEventListener(
                "keydown",
                (event) => {
                    this.handleKeyDown(event);
                },
                { passive: false }
            );

            window.addEventListener(
                "keyup",
                (event) => {
                    this.handleKeyUp(event);
                },
                { passive: false }
            );

            /*
             * Clear stuck keys if the browser loses focus.
             */
            window.addEventListener(
                "blur",
                () => {
                    this.clear();
                }
            );

            document.addEventListener(
                "visibilitychange",
                () => {
                    if (document.hidden) {
                        this.clear();
                    }
                }
            );
        },

        handleKeyDown(event) {
            if (!this.options.keyboardEnabled) {
                return;
            }

            if (!event || !event.code) {
                return;
            }

            const code = event.code;

            this.keys[code] = true;

            const action =
                this.keyMap[code];

            if (action) {
                this.state[action] = true;
            }

            /*
             * Prevent the arrow keys and spacebar from scrolling
             * while playing.
             */
            if (
                this.options.preventDefault &&
                this.shouldPreventDefault(code)
            ) {
                event.preventDefault();
            }
        },

        handleKeyUp(event) {
            if (!event || !event.code) {
                return;
            }

            const code = event.code;

            this.keys[code] = false;

            const action =
                this.keyMap[code];

            if (action) {
                this.state[action] = false;
            }

            if (
                this.options.preventDefault &&
                this.shouldPreventDefault(code)
            ) {
                event.preventDefault();
            }
        },

        shouldPreventDefault(code) {
            return (
                code === "ArrowLeft" ||
                code === "ArrowRight" ||
                code === "ArrowUp" ||
                code === "ArrowDown" ||
                code === "Space"
            );
        },

        /*
         * Called once per game frame.
         * Copies the current state to previousState before
         * the next frame's input is evaluated.
         */
        update() {
            Object.keys(this.state).forEach(
                (action) => {
                    this.previousState[action] =
                        !!this.state[action];
                }
            );

            Object.keys(this.keys).forEach(
                (key) => {
                    this.previousKeys[key] =
                        !!this.keys[key];
                }
            );
        },

        /*
         * Returns whether an action is currently held.
         */
        isDown(action) {
            return !!this.state[action];
        },

        /*
         * Returns whether a keyboard key is currently held.
         */
        isKeyDown(code) {
            return !!this.keys[code];
        },

        /*
         * Returns true for the first frame an action becomes held.
         */
        justPressed(action) {
            return (
                !!this.state[action] &&
                !this.previousState[action]
            );
        },

        /*
         * Returns true for the first frame an action is released.
         */
        justReleased(action) {
            return (
                !this.state[action] &&
                !!this.previousState[action]
            );
        },

        keyJustPressed(code) {
            return (
                !!this.keys[code] &&
                !this.previousKeys[code]
            );
        },

        keyJustReleased(code) {
            return (
                !this.keys[code] &&
                !!this.previousKeys[code]
            );
        },

        /*
         * Vehicle-friendly input.
         *
         * gas:
         *   0 to 1
         *
         * brake:
         *   0 to 1
         *
         * steer:
         *   -1 to 1
         *
         * throttle:
         *   -1 to 1
         */
        getVehicleInput() {
            const gas =
                this.isDown("gas") ||
                this.isDown("accelerate");

            const brake =
                this.isDown("brake") ||
                this.isDown("reverse");

            let steer = 0;

            if (this.isDown("left")) {
                steer -= 1;
            }

            if (this.isDown("right")) {
                steer += 1;
            }

            /*
             * Hillbound uses gas/brake for the main driving
             * controls. Steering can still be used by future
             * vehicles or alternate control schemes.
             */
            let throttle = 0;

            if (gas) {
                throttle += 1;
            }

            if (brake) {
                throttle -= 1;
            }

            return {
                gas: gas ? 1 : 0,
                brake: brake ? 1 : 0,
                left: this.isDown("left") ? 1 : 0,
                right: this.isDown("right") ? 1 : 0,
                steer,
                throttle
            };
        },

        /*
         * Alias used by the physics system.
         */
        getInput() {
            return this.getVehicleInput();
        },

        get() {
            return this.getVehicleInput();
        },

        /*
         * MobileControls can call this to inject virtual input.
         */
        set(action, value) {
            if (
                !Object.prototype.hasOwnProperty.call(
                    this.state,
                    action
                )
            ) {
                return;
            }

            this.state[action] = !!value;
        },

        press(action) {
            this.set(action, true);
        },

        release(action) {
            this.set(action, false);
        },

        /*
         * Allows mobile controls to provide a complete input
         * object without needing to know the internal state.
         */
        setVehicleInput(input) {
            input = input || {};

            if (input.gas !== undefined) {
                this.state.gas =
                    Number(input.gas) > 0;
            }

            if (input.brake !== undefined) {
                this.state.brake =
                    Number(input.brake) > 0;
            }

            if (input.left !== undefined) {
                this.state.left =
                    Number(input.left) > 0;
            }

            if (input.right !== undefined) {
                this.state.right =
                    Number(input.right) > 0;
            }

            if (input.accelerate !== undefined) {
                this.state.accelerate =
                    Number(input.accelerate) > 0;
            }

            if (input.reverse !== undefined) {
                this.state.reverse =
                    Number(input.reverse) > 0;
            }
        },

        /*
         * Disable keyboard controls without destroying listeners.
         */
        enableKeyboard() {
            this.options.keyboardEnabled = true;
        },

        disableKeyboard() {
            this.options.keyboardEnabled = false;
            this.clearKeyboard();
        },

        /*
         * Clears only physical keyboard input.
         */
        clearKeyboard() {
            this.keys = {};

            [
                "gas",
                "brake",
                "left",
                "right",
                "up",
                "down",
                "accelerate",
                "reverse"
            ].forEach((action) => {
                this.state[action] = false;
            });
        },

        /*
         * Clears every active input.
         */
        clear() {
            this.keys = {};
            this.previousKeys = {};

            Object.keys(this.state).forEach(
                (action) => {
                    this.state[action] = false;
                    this.previousState[action] = false;
                }
            );
        },

        /*
         * Configure custom key bindings.
         *
         * Example:
         * Input.setKey("gas", "KeyW");
         */
        setKey(action, code) {
            if (!action || !code) {
                return false;
            }

            /*
             * Remove the action from its old key.
             */
            Object.keys(this.keyMap).forEach(
                (key) => {
                    if (
                        this.keyMap[key] === action
                    ) {
                        delete this.keyMap[key];
                    }
                }
            );

            this.keyMap[code] = action;

            return true;
        },

        /*
         * Add another key without removing an existing binding.
         */
        addKey(action, code) {
            if (!action || !code) {
                return false;
            }

            this.keyMap[code] = action;

            return true;
        },

        removeKey(code) {
            if (!code) {
                return;
            }

            delete this.keyMap[code];

            delete this.keys[code];
            delete this.previousKeys[code];
        },

        getKeyMap() {
            return Object.assign(
                {},
                this.keyMap
            );
        },

        resetKeyMap() {
            this.keyMap = {
                ArrowRight: "gas",
                KeyD: "gas",

                ArrowLeft: "brake",
                KeyA: "brake",

                ArrowUp: "gas",
                KeyW: "gas",

                ArrowDown: "brake",
                KeyS: "brake",

                Space: "pause",
                Escape: "pause",

                KeyR: "restart"
            };
        },

        /*
         * Prevent pause/restart from being triggered repeatedly
         * when the key is held.
         */
        consume(action) {
            if (!this.justPressed(action)) {
                return false;
            }

            this.state[action] = false;

            return true;
        },

        /*
         * Convenience helpers.
         */
        isDriving() {
            return (
                this.isDown("gas") ||
                this.isDown("accelerate") ||
                this.isDown("brake") ||
                this.isDown("reverse")
            );
        },

        isAccelerating() {
            return (
                this.isDown("gas") ||
                this.isDown("accelerate")
            );
        },

        isBraking() {
            return (
                this.isDown("brake") ||
                this.isDown("reverse")
            );
        },

        isPausedPressed() {
            return this.justPressed("pause");
        },

        isRestartPressed() {
            return this.justPressed("restart");
        },

        /*
         * Returns an easy-to-debug snapshot.
         */
        debug() {
            return {
                keys: Object.assign(
                    {},
                    this.keys
                ),

                state: Object.assign(
                    {},
                    this.state
                ),

                vehicle:
                    this.getVehicleInput()
            };
        },

        destroy() {
            this.clear();

            this.initialized = false;
        }
    };

    /*
     * Initialize the input system immediately.
     * game.js can safely call init() again because init()
     * prevents duplicate event listeners.
     */
    Input.init();

    window.Hillbound.Input = Input;

    /*
     * Compatibility aliases.
     */
    window.HillboundInput = Input;
    window.Input = Input;

})();