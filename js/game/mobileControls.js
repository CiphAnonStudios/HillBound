/*
 * Hillbound
 * Mobile Controls
 * js/game/mobileControls.js
 *
 * Handles:
 * - Touch controls
 * - Gas / brake buttons
 * - Touch and pointer events
 * - Input-system integration
 * - Multi-touch support
 * - Preventing accidental page scrolling
 * - Enabling/disabling mobile controls
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const MobileControls = {

        initialized: false,
        enabled: true,

        buttons: {
            gas: null,
            brake: null
        },

        touches: {
            gas: new Set(),
            brake: new Set()
        },

        options: {
            gasSelector: "#mobile-gas",
            brakeSelector: "#mobile-brake",

            preventDefault: true,
            usePointerEvents: true,

            hapticFeedback: true,
            hapticDuration: 10
        },

        init(options) {
            if (this.initialized) {
                return this;
            }

            options = options || {};

            Object.keys(this.options).forEach(
                (key) => {
                    if (
                        options[key] !== undefined
                    ) {
                        this.options[key] =
                            options[key];
                    }
                }
            );

            this.findButtons();

            this.bindButtons();

            this.initialized = true;

            this.updateVisibility();

            return this;
        },

        findButtons() {
            this.buttons.gas =
                document.querySelector(
                    this.options.gasSelector
                );

            this.buttons.brake =
                document.querySelector(
                    this.options.brakeSelector
                );

            /*
             * Support the current Hillbound markup if the
             * IDs are ever changed to data attributes.
             */
            if (!this.buttons.gas) {
                this.buttons.gas =
                    document.querySelector(
                        "[data-control='gas']"
                    );
            }

            if (!this.buttons.brake) {
                this.buttons.brake =
                    document.querySelector(
                        "[data-control='brake']"
                    );
            }
        },

        bindButtons() {
            this.bindButton(
                this.buttons.gas,
                "gas"
            );

            this.bindButton(
                this.buttons.brake,
                "brake"
            );
        },

        bindButton(element, action) {
            if (!element) {
                return;
            }

            /*
             * Prevent browser scrolling, text selection,
             * image dragging, and long-press behavior.
             */
            element.style.touchAction = "none";
            element.style.userSelect = "none";
            element.style.webkitUserSelect = "none";
            element.style.webkitTouchCallout = "none";

            if (
                this.options.usePointerEvents &&
                window.PointerEvent
            ) {
                element.addEventListener(
                    "pointerdown",
                    (event) => {
                        this.pointerDown(
                            event,
                            action
                        );
                    },
                    { passive: false }
                );

                element.addEventListener(
                    "pointerup",
                    (event) => {
                        this.pointerUp(
                            event,
                            action
                        );
                    },
                    { passive: false }
                );

                element.addEventListener(
                    "pointercancel",
                    (event) => {
                        this.pointerUp(
                            event,
                            action
                        );
                    },
                    { passive: false }
                );

                element.addEventListener(
                    "pointerleave",
                    (event) => {
                        /*
                         * Only release a pointer if it was
                         * actually being held.
                         */
                        if (
                            event.buttons === 0
                        ) {
                            this.pointerUp(
                                event,
                                action
                            );
                        }
                    },
                    { passive: false }
                );

                element.addEventListener(
                    "contextmenu",
                    (event) => {
                        event.preventDefault();
                    }
                );

                return;
            }

            /*
             * Touch-event fallback for older browsers.
             */
            element.addEventListener(
                "touchstart",
                (event) => {
                    this.touchStart(
                        event,
                        action
                    );
                },
                { passive: false }
            );

            element.addEventListener(
                "touchend",
                (event) => {
                    this.touchEnd(
                        event,
                        action
                    );
                },
                { passive: false }
            );

            element.addEventListener(
                "touchcancel",
                (event) => {
                    this.touchEnd(
                        event,
                        action
                    );
                },
                { passive: false }
            );

            element.addEventListener(
                "mousedown",
                (event) => {
                    this.mouseDown(
                        event,
                        action
                    );
                }
            );

            element.addEventListener(
                "mouseup",
                (event) => {
                    this.mouseUp(
                        event,
                        action
                    );
                }
            );

            element.addEventListener(
                "mouseleave",
                (event) => {
                    this.mouseUp(
                        event,
                        action
                    );
                }
            );

            element.addEventListener(
                "contextmenu",
                (event) => {
                    event.preventDefault();
                }
            );
        },

        pointerDown(event, action) {
            if (!this.enabled) {
                return;
            }

            if (
                this.options.preventDefault &&
                event
            ) {
                event.preventDefault();
            }

            const pointerId =
                event &&
                event.pointerId !== undefined
                    ? event.pointerId
                    : 0;

            this.touches[action].add(
                pointerId
            );

            this.setAction(
                action,
                true
            );

            this.visualPress(
                action,
                true
            );

            this.haptic();
        },

        pointerUp(event, action) {
            if (event && this.options.preventDefault) {
                event.preventDefault();
            }

            const pointerId =
                event &&
                event.pointerId !== undefined
                    ? event.pointerId
                    : 0;

            this.touches[action].delete(
                pointerId
            );

            /*
             * Only release the action when no other touch is
             * still holding that same button.
             */
            if (
                this.touches[action].size === 0
            ) {
                this.setAction(
                    action,
                    false
                );

                this.visualPress(
                    action,
                    false
                );
            }
        },

        touchStart(event, action) {
            if (!this.enabled) {
                return;
            }

            if (
                this.options.preventDefault &&
                event
            ) {
                event.preventDefault();
            }

            const changedTouches =
                event.changedTouches || [];

            for (
                let i = 0;
                i < changedTouches.length;
                i++
            ) {
                this.touches[action].add(
                    changedTouches[i].identifier
                );
            }

            this.setAction(
                action,
                true
            );

            this.visualPress(
                action,
                true
            );

            this.haptic();
        },

        touchEnd(event, action) {
            if (
                this.options.preventDefault &&
                event
            ) {
                event.preventDefault();
            }

            const changedTouches =
                event &&
                event.changedTouches
                    ? event.changedTouches
                    : [];

            for (
                let i = 0;
                i < changedTouches.length;
                i++
            ) {
                this.touches[action].delete(
                    changedTouches[i].identifier
                );
            }

            if (
                this.touches[action].size === 0
            ) {
                this.setAction(
                    action,
                    false
                );

                this.visualPress(
                    action,
                    false
                );
            }
        },

        mouseDown(event, action) {
            /*
             * Mouse fallback is useful when testing the mobile
             * controls on desktop or in browser dev tools.
             */
            if (!this.enabled) {
                return;
            }

            if (
                event &&
                event.button !== undefined &&
                event.button !== 0
            ) {
                return;
            }

            this.setAction(
                action,
                true
            );

            this.visualPress(
                action,
                true
            );
        },

        mouseUp(event, action) {
            this.setAction(
                action,
                false
            );

            this.visualPress(
                action,
                false
            );
        },

        setAction(action, pressed) {
            if (!action) {
                return;
            }

            /*
             * Prefer the main input system so physics.js and
             * vehicle.js receive exactly the same input format
             * as keyboard controls.
             */
            const input =
                window.Hillbound &&
                window.Hillbound.Input;

            if (input) {
                if (pressed) {
                    input.press(action);
                } else {
                    input.release(action);
                }

                return;
            }

            /*
             * Compatibility fallback.
             */
            if (
                window.HillboundInput
            ) {
                if (pressed) {
                    window.HillboundInput.press(
                        action
                    );
                } else {
                    window.HillboundInput.release(
                        action
                    );
                }
            }
        },

        visualPress(action, pressed) {
            const button =
                this.buttons[action];

            if (!button) {
                return;
            }

            button.classList.toggle(
                "active",
                pressed
            );

            button.classList.toggle(
                "pressed",
                pressed
            );

            button.setAttribute(
                "aria-pressed",
                pressed
                    ? "true"
                    : "false"
            );
        },

        haptic() {
            if (!this.options.hapticFeedback) {
                return;
            }

            /*
             * navigator.vibrate is not available on every
             * browser/device, so always check first.
             */
            if (
                navigator &&
                typeof navigator.vibrate ===
                    "function"
            ) {
                try {
                    navigator.vibrate(
                        this.options.hapticDuration
                    );
                } catch (error) {
                    /*
                     * Haptic feedback is optional. Failure
                     * should never affect gameplay.
                     */
                }
            }
        },

        /*
         * Returns whether either mobile button is currently
         * being held.
         */
        isDriving() {
            return (
                this.touches.gas.size > 0 ||
                this.touches.brake.size > 0
            );
        },

        isPressed(action) {
            if (
                !this.touches[action]
            ) {
                return false;
            }

            return (
                this.touches[action].size > 0
            );
        },

        getState() {
            return {
                gas:
                    this.isPressed("gas"),

                brake:
                    this.isPressed("brake")
            };
        },

        /*
         * Update called by the game loop.
         *
         * Most touch handling is event-driven, but this keeps
         * the visual state synchronized if the browser interrupts
         * a touch.
         */
        update() {
            if (!this.initialized) {
                return;
            }

            const actions = [
                "gas",
                "brake"
            ];

            actions.forEach(
                (action) => {
                    this.visualPress(
                        action,
                        this.isPressed(action)
                    );
                }
            );
        },

        enable() {
            this.enabled = true;
            this.updateVisibility();
        },

        disable() {
            this.enabled = false;
            this.releaseAll();
            this.updateVisibility();
        },

        releaseAll() {
            this.touches.gas.clear();
            this.touches.brake.clear();

            this.setAction(
                "gas",
                false
            );

            this.setAction(
                "brake",
                false
            );

            this.visualPress(
                "gas",
                false
            );

            this.visualPress(
                "brake",
                false
            );
        },

        updateVisibility() {
            const controls =
                document.querySelector(
                    ".mobile-controls"
                );

            if (!controls) {
                return;
            }

            /*
             * CSS already handles most of the responsive
             * visibility. This only prevents disabled controls
             * from receiving input.
             */
            controls.classList.toggle(
                "controls-disabled",
                !this.enabled
            );

            controls.setAttribute(
                "aria-hidden",
                this.enabled
                    ? "false"
                    : "true"
            );
        },

        /*
         * Detect whether the current device is touch capable.
         */
        isTouchDevice() {
            return (
                "ontouchstart" in window ||
                navigator.maxTouchPoints > 0
            );
        },

        /*
         * Detect whether the screen is currently portrait.
         */
        isPortrait() {
            if (
                window.matchMedia
            ) {
                return window.matchMedia(
                    "(orientation: portrait)"
                ).matches;
            }

            return window.innerHeight >
                window.innerWidth;
        },

        /*
         * Controls should normally only be active when the
         * screen is landscape on touch devices.
         */
        shouldShowControls() {
            if (!this.isTouchDevice()) {
                return false;
            }

            return !this.isPortrait();
        },

        /*
         * Settings helpers.
         */
        setHapticFeedback(enabled) {
            this.options.hapticFeedback =
                !!enabled;
        },

        setHapticDuration(duration) {
            this.options.hapticDuration =
                Math.max(
                    0,
                    Number(duration) || 0
                );
        },

        /*
         * Re-scan the DOM if game.html dynamically replaces
         * the controls.
         */
        refresh() {
            this.releaseAll();

            this.findButtons();
        },

        /*
         * Useful when the game is paused or the page is hidden.
         */
        onPause() {
            this.releaseAll();
        },

        onResume() {
            this.updateVisibility();
        },

        debug() {
            return {
                initialized:
                    this.initialized,

                enabled:
                    this.enabled,

                touchDevice:
                    this.isTouchDevice(),

                portrait:
                    this.isPortrait(),

                shouldShow:
                    this.shouldShowControls(),

                state:
                    this.getState()
            };
        }
    };

    /*
     * Initialize immediately.
     *
     * game.html loads this file after the DOM elements have
     * already been created, so the buttons can be found here.
     */
    MobileControls.init();

    window.Hillbound.MobileControls =
        MobileControls;

    /*
     * Compatibility aliases.
     */
    window.HillboundMobileControls =
        MobileControls;

    window.MobileControls =
        MobileControls;

})();