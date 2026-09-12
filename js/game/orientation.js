/*
 * Hillbound
 * Orientation System
 * js/game/orientation.js
 *
 * Handles:
 * - Portrait / landscape detection
 * - Mobile orientation locking behavior
 * - Orientation screen
 * - Game pause/resume when orientation changes
 * - Screen resize handling
 * - Fullscreen compatibility
 * - Safe interaction with mobile controls
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Orientation = {

        initialized: false,

        isMobile: false,
        isPortrait: false,
        isLandscape: true,

        gameActive: true,
        wasPausedByOrientation: false,

        screen: null,

        options: {
            mobileOnly: true,
            pauseInPortrait: true,
            hideGameInPortrait: true,
            useFullscreen: false,
            autoResume: true
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

            this.screen =
                document.getElementById(
                    "orientation-screen"
                );

            this.detectDevice();

            this.bindEvents();

            this.initialized = true;

            this.update();

            return this;
        },

        detectDevice() {
            this.isMobile =
                this.detectMobile();

            this.updateOrientationState();
        },

        detectMobile() {
            /*
             * Touch support is the primary signal.
             * The width check prevents desktop browser
             * resizing from being treated as mobile.
             */
            const touch =
                "ontouchstart" in window ||
                navigator.maxTouchPoints > 0;

            const narrowScreen =
                Math.min(
                    window.innerWidth,
                    window.innerHeight
                ) <= 900;

            const userAgent =
                navigator.userAgent ||
                "";

            const mobileUserAgent =
                /Android|iPhone|iPad|iPod|Mobile/i
                    .test(userAgent);

            return (
                mobileUserAgent ||
                (touch && narrowScreen)
            );
        },

        updateOrientationState() {
            let portrait;

            if (window.matchMedia) {
                portrait =
                    window.matchMedia(
                        "(orientation: portrait)"
                    ).matches;
            } else {
                portrait =
                    window.innerHeight >
                    window.innerWidth;
            }

            this.isPortrait = !!portrait;
            this.isLandscape =
                !this.isPortrait;
        },

        bindEvents() {
            /*
             * Modern orientation API.
             */
            if (
                screen.orientation &&
                screen.orientation.addEventListener
            ) {
                screen.orientation.addEventListener(
                    "change",
                    () => {
                        this.handleChange();
                    }
                );
            }

            /*
             * Legacy orientation event.
             */
            window.addEventListener(
                "orientationchange",
                () => {
                    this.handleChange();
                }
            );

            /*
             * Resize catches phones/tablets that don't fire
             * orientationchange consistently.
             */
            window.addEventListener(
                "resize",
                () => {
                    this.handleChange();
                }
            );

            /*
             * Visual viewport is useful on mobile browsers
             * where the browser UI changes the viewport size.
             */
            if (window.visualViewport) {
                window.visualViewport.addEventListener(
                    "resize",
                    () => {
                        this.handleChange();
                    }
                );
            }

            document.addEventListener(
                "visibilitychange",
                () => {
                    if (document.hidden) {
                        this.onHidden();
                    } else {
                        this.onVisible();
                    }
                }
            );
        },

        handleChange() {
            /*
             * Wait one frame so the browser has finished
             * updating innerWidth/innerHeight.
             */
            window.requestAnimationFrame(() => {
                this.updateOrientationState();

                this.update();

                this.resizeGame();

                if (
                    this.isLandscape
                ) {
                    this.onLandscape();
                } else {
                    this.onPortrait();
                }
            });
        },

        update() {
            this.updateOrientationState();

            if (
                !this.options.mobileOnly ||
                this.isMobile
            ) {
                if (
                    this.isPortrait
                ) {
                    this.showScreen();
                } else {
                    this.hideScreen();
                }
            } else {
                this.hideScreen();
            }
        },

        showScreen() {
            if (!this.screen) {
                this.screen =
                    document.getElementById(
                        "orientation-screen"
                    );
            }

            if (!this.screen) {
                return;
            }

            this.screen.classList.add(
                "active"
            );

            this.screen.setAttribute(
                "aria-hidden",
                "false"
            );

            this.screen.style.display =
                "flex";

            document.body.classList.add(
                "orientation-portrait"
            );

            document.body.classList.remove(
                "orientation-landscape"
            );

            this.pauseGame();
        },

        hideScreen() {
            if (!this.screen) {
                this.screen =
                    document.getElementById(
                        "orientation-screen"
                    );
            }

            if (!this.screen) {
                return;
            }

            this.screen.classList.remove(
                "active"
            );

            this.screen.setAttribute(
                "aria-hidden",
                "true"
            );

            /*
             * CSS normally controls this. Clearing the
             * inline value lets orientation.css take over.
             */
            this.screen.style.display = "";

            document.body.classList.remove(
                "orientation-portrait"
            );

            document.body.classList.add(
                "orientation-landscape"
            );
        },

        onPortrait() {
            this.showScreen();

            this.releaseMobileControls();

            this.resizeGame();

            this.dispatch(
                "hillboundorientationchange",
                {
                    orientation: "portrait",
                    portrait: true,
                    landscape: false
                }
            );
        },

        onLandscape() {
            this.hideScreen();

            this.resizeGame();

            /*
             * Only resume automatically if this system was
             * responsible for pausing the game.
             */
            if (
                this.options.autoResume &&
                this.wasPausedByOrientation
            ) {
                this.resumeGame();

                this.wasPausedByOrientation =
                    false;
            }

            this.dispatch(
                "hillboundorientationchange",
                {
                    orientation: "landscape",
                    portrait: false,
                    landscape: true
                }
            );
        },

        pauseGame() {
            if (
                !this.options.pauseInPortrait
            ) {
                return;
            }

            const game =
                window.Hillbound &&
                window.Hillbound.Game;

            if (!game) {
                return;
            }

            /*
             * Don't pause an already-paused game.
             */
            if (
                typeof game.isPaused ===
                "boolean"
            ) {
                if (game.isPaused) {
                    return;
                }
            }

            if (
                typeof game.pause ===
                "function"
            ) {
                game.pause();

                this.wasPausedByOrientation =
                    true;
            }
        },

        resumeGame() {
            const game =
                window.Hillbound &&
                window.Hillbound.Game;

            if (!game) {
                return;
            }

            if (
                typeof game.resume ===
                "function"
            ) {
                game.resume();
            }
        },

        releaseMobileControls() {
            const controls =
                window.Hillbound &&
                window.Hillbound.MobileControls;

            if (
                controls &&
                typeof controls.releaseAll ===
                "function"
            ) {
                controls.releaseAll();
            }

            /*
             * Also clear the main input system so a held
             * button cannot remain active after rotation.
             */
            const input =
                window.Hillbound &&
                window.Hillbound.Input;

            if (
                input &&
                typeof input.clear ===
                "function"
            ) {
                input.clear();
            }
        },

        resizeGame() {
            const game =
                window.Hillbound &&
                window.Hillbound.Game;

            if (!game) {
                return;
            }

            /*
             * game.js exposes resizeCanvas().
             */
            if (
                typeof game.resizeCanvas ===
                "function"
            ) {
                game.resizeCanvas();
                return;
            }

            /*
             * Compatibility with alternate naming.
             */
            if (
                typeof game.resize ===
                "function"
            ) {
                game.resize();
            }
        },

        async requestFullscreen() {
            if (!this.options.useFullscreen) {
                return false;
            }

            const element =
                document.documentElement;

            if (
                !element ||
                !element.requestFullscreen
            ) {
                return false;
            }

            try {
                await element.requestFullscreen();

                return true;
            } catch (error) {
                return false;
            }
        },

        async lockLandscape() {
            /*
             * Orientation locking is browser/device dependent.
             * It usually requires fullscreen and user interaction.
             */
            if (
                !screen.orientation ||
                !screen.orientation.lock
            ) {
                return false;
            }

            try {
                await screen.orientation.lock(
                    "landscape"
                );

                return true;
            } catch (error) {
                return false;
            }
        },

        async requestLandscape() {
            let fullscreen =
                false;

            if (
                this.options.useFullscreen
            ) {
                fullscreen =
                    await this.requestFullscreen();
            }

            const locked =
                await this.lockLandscape();

            return {
                fullscreen,
                locked
            };
        },

        isPortraitMode() {
            return this.isPortrait;
        },

        isLandscapeMode() {
            return this.isLandscape;
        },

        isMobileDevice() {
            return this.isMobile;
        },

        shouldBlockGameplay() {
            return (
                this.isMobile &&
                this.isPortrait
            );
        },

        /*
         * Allows game.js to explicitly tell the orientation
         * system whether gameplay is currently active.
         */
        setGameActive(active) {
            this.gameActive = !!active;

            if (!this.gameActive) {
                this.releaseMobileControls();
            }
        },

        onHidden() {
            /*
             * Never leave controls held while the page is
             * backgrounded.
             */
            this.releaseMobileControls();

            const game =
                window.Hillbound &&
                window.Hillbound.Game;

            if (
                game &&
                typeof game.pause ===
                "function"
            ) {
                game.pause();
            }
        },

        onVisible() {
            this.handleChange();
        },

        dispatch(name, detail) {
            try {
                window.dispatchEvent(
                    new CustomEvent(
                        name,
                        {
                            detail: detail || {}
                        }
                    )
                );
            } catch (error) {
                /*
                 * Older browser fallback.
                 */
                const event =
                    document.createEvent(
                        "Event"
                    );

                event.initEvent(
                    name,
                    false,
                    false
                );

                window.dispatchEvent(
                    event
                );
            }
        },

        getState() {
            return {
                initialized:
                    this.initialized,

                mobile:
                    this.isMobile,

                portrait:
                    this.isPortrait,

                landscape:
                    this.isLandscape,

                gameActive:
                    this.gameActive,

                blocked:
                    this.shouldBlockGameplay(),

                pausedByOrientation:
                    this.wasPausedByOrientation,

                viewport: {
                    width:
                        window.innerWidth,

                    height:
                        window.innerHeight
                }
            };
        },

        debug() {
            return this.getState();
        },

        destroy() {
            this.releaseMobileControls();

            this.initialized = false;
        }
    };

    /*
     * Initialize after the DOM is available.
     */
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                Orientation.init();
            },
            { once: true }
        );
    } else {
        Orientation.init();
    }

    window.Hillbound.Orientation =
        Orientation;

    /*
     * Compatibility aliases.
     */
    window.HillboundOrientation =
        Orientation;

    window.Orientation =
        Orientation;

})();