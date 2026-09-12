/* =========================================================
   HILLBOUND — MAIN
   js/main.js
   Shared site initialization and menu functionality
   ========================================================= */

(function () {
    "use strict";

    /* ---------------------------------------------------------
       Global Hillbound Namespace
       --------------------------------------------------------- */

    window.Hillbound = window.Hillbound || {};

    Hillbound.version = "0.1.0";
    Hillbound.name = "Hillbound";

    /* ---------------------------------------------------------
       Utility Helpers
       --------------------------------------------------------- */

    Hillbound.$ = function (selector, parent) {
        return (parent || document).querySelector(selector);
    };

    Hillbound.$$ = function (selector, parent) {
        return Array.from(
            (parent || document).querySelectorAll(selector)
        );
    };

    Hillbound.on = function (element, event, handler, options) {
        if (!element) return;

        element.addEventListener(
            event,
            handler,
            options || false
        );
    };

    Hillbound.storage = {
        get: function (key, fallback) {
            try {
                const value = localStorage.getItem(key);

                if (value === null) {
                    return fallback;
                }

                return JSON.parse(value);
            } catch (error) {
                console.warn(
                    "[Hillbound] Could not read local storage:",
                    key,
                    error
                );

                return fallback;
            }
        },

        set: function (key, value) {
            try {
                localStorage.setItem(
                    key,
                    JSON.stringify(value)
                );

                return true;
            } catch (error) {
                console.warn(
                    "[Hillbound] Could not save local storage:",
                    key,
                    error
                );

                return false;
            }
        },

        remove: function (key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn(
                    "[Hillbound] Could not remove local storage:",
                    key,
                    error
                );

                return false;
            }
        }
    };

    /* ---------------------------------------------------------
       Page Detection
       --------------------------------------------------------- */

    Hillbound.getPage = function () {
        const path = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        if (!path || path === "index.html") {
            return "home";
        }

        return path.replace(".html", "");
    };

    Hillbound.currentPage = Hillbound.getPage();

    /* ---------------------------------------------------------
       Loading Screen
       --------------------------------------------------------- */

    function initLoadingScreen() {
        const loadingScreen =
            document.getElementById("loading-screen");

        const progress =
            document.getElementById("loading-progress");

        const status =
            document.getElementById("loading-text");

        if (!loadingScreen) {
            return;
        }

        let currentProgress = 0;
        let finished = false;

        const loadingMessages = [
            "Starting Hillbound...",
            "Loading terrain...",
            "Preparing vehicles...",
            "Checking systems...",
            "Ready to climb."
        ];

        function updateProgress(value) {
            currentProgress = Math.max(
                0,
                Math.min(100, value)
            );

            if (progress) {
                progress.style.width =
                    currentProgress + "%";
            }

            if (status) {
                const index = Math.min(
                    loadingMessages.length - 1,
                    Math.floor(
                        currentProgress /
                        (100 / loadingMessages.length)
                    )
                );

                status.textContent =
                    loadingMessages[index];
            }
        }

        function finishLoading() {
            if (finished) {
                return;
            }

            finished = true;

            updateProgress(100);

            setTimeout(function () {
                loadingScreen.classList.add("loaded");

                setTimeout(function () {
                    loadingScreen.style.display = "none";
                }, 400);
            }, 150);
        }

        /*
         * The menu does not need to wait for every asset in the
         * entire game. This is intentionally lightweight so the
         * home page appears quickly.
         */

        let step = 0;

        const interval = setInterval(function () {
            step += 1;

            updateProgress(
                Math.min(90, step * 15)
            );

            if (step >= 6) {
                clearInterval(interval);
                finishLoading();
            }
        }, 80);

        window.addEventListener(
            "load",
            function () {
                setTimeout(
                    finishLoading,
                    100
                );
            },
            {
                once: true
            }
        );

        /*
         * Safety fallback in case an asset or browser event
         * prevents the normal loading sequence.
         */

        setTimeout(
            finishLoading,
            2500
        );
    }

    /* ---------------------------------------------------------
       Navigation
       --------------------------------------------------------- */

    Hillbound.navigate = function (url) {
        if (!url) {
            return;
        }

        window.location.href = url;
    };

    function initNavigation() {
        const links = document.querySelectorAll(
            "a[data-hillbound-nav]"
        );

        links.forEach(function (link) {
            link.addEventListener(
                "click",
                function () {
                    const destination =
                        link.getAttribute("href");

                    if (!destination) {
                        return;
                    }

                    link.classList.add("is-navigating");
                }
            );
        });
    }

    /* ---------------------------------------------------------
       Active Navigation Link
       --------------------------------------------------------- */

    function initActiveNavigation() {
        const current =
            Hillbound.currentPage;

        const links =
            document.querySelectorAll(
                "a[href]"
            );

        links.forEach(function (link) {
            const href =
                link.getAttribute("href");

            if (!href) {
                return;
            }

            if (
                href.startsWith("#") ||
                href.startsWith("http") ||
                href.startsWith("mailto:")
            ) {
                return;
            }

            const filename = href
                .split("/")
                .pop()
                .replace(".html", "")
                .toLowerCase();

            if (
                filename &&
                filename === current
            ) {
                link.classList.add("active");
                link.setAttribute(
                    "aria-current",
                    "page"
                );
            }
        });
    }

    /* ---------------------------------------------------------
       Default Settings
       --------------------------------------------------------- */

    const DEFAULT_SETTINGS = {
        gameplay: {
            showTutorial: true,
            autoPause: true,
            screenShake: true,
            showFPS: false
        },

        audio: {
            masterVolume: 1,
            music: true,
            soundEffects: true
        },

        graphics: {
            quality: "auto",
            particles: true,
            backgroundEffects: true
        },

        controls: {
            type: "automatic",
            mobileControls: true
        }
    };

    Hillbound.defaultSettings =
        DEFAULT_SETTINGS;

    Hillbound.getSettings = function () {
        const saved =
            Hillbound.storage.get(
                "hillbound_settings",
                null
            );

        if (!saved) {
            return structuredCloneSafe(
                DEFAULT_SETTINGS
            );
        }

        return mergeObjects(
            structuredCloneSafe(
                DEFAULT_SETTINGS
            ),
            saved
        );
    };

    Hillbound.saveSettings = function (
        settings
    ) {
        return Hillbound.storage.set(
            "hillbound_settings",
            settings
        );
    };

    function structuredCloneSafe(object) {
        try {
            return structuredClone(object);
        } catch (error) {
            return JSON.parse(
                JSON.stringify(object)
            );
        }
    }

    function mergeObjects(target, source) {
        if (!source || typeof source !== "object") {
            return target;
        }

        Object.keys(source).forEach(
            function (key) {
                if (
                    source[key] &&
                    typeof source[key] === "object" &&
                    !Array.isArray(source[key]) &&
                    target[key] &&
                    typeof target[key] === "object"
                ) {
                    mergeObjects(
                        target[key],
                        source[key]
                    );
                } else {
                    target[key] = source[key];
                }
            }
        );

        return target;
    }

    /* ---------------------------------------------------------
       Theme / Display Preferences
       --------------------------------------------------------- */

    function applyDisplayPreferences() {
        const settings =
            Hillbound.getSettings();

        const quality =
            settings.graphics &&
            settings.graphics.quality;

        if (quality) {
            document.documentElement.dataset
                .graphicsQuality = quality;
        }

        if (
            settings.graphics &&
            settings.graphics.particles === false
        ) {
            document.documentElement.classList.add(
                "no-particles"
            );
        }

        if (
            settings.graphics &&
            settings.graphics.backgroundEffects === false
        ) {
            document.documentElement.classList.add(
                "no-background-effects"
            );
        }

        if (
            settings.gameplay &&
            settings.gameplay.screenShake === false
        ) {
            document.documentElement.classList.add(
                "no-screen-shake"
            );
        }
    }

    /* ---------------------------------------------------------
       Page Visibility
       --------------------------------------------------------- */

    function initVisibilityHandling() {
        document.addEventListener(
            "visibilitychange",
            function () {
                window.HillboundPageHidden =
                    document.hidden;

                document.documentElement.classList.toggle(
                    "page-hidden",
                    document.hidden
                );
            }
        );
    }

    /* ---------------------------------------------------------
       External Link Protection
       --------------------------------------------------------- */

    function initExternalLinks() {
        const links =
            document.querySelectorAll(
                'a[target="_blank"]'
            );

        links.forEach(function (link) {
            const rel =
                link.getAttribute("rel") || "";

            if (
                !rel.includes("noopener")
            ) {
                link.setAttribute(
                    "rel",
                    (rel + " noopener noreferrer")
                        .trim()
                );
            }
        });
    }

    /* ---------------------------------------------------------
       Prevent Double Tap Zoom on Game Pages
       --------------------------------------------------------- */

    function initTouchBehavior() {
        if (
            !document.body.classList.contains(
                "game-page"
            )
        ) {
            return;
        }

        let lastTouch = 0;

        document.addEventListener(
            "touchend",
            function (event) {
                const now =
                    Date.now();

                if (
                    now - lastTouch <= 300
                ) {
                    event.preventDefault();
                }

                lastTouch = now;
            },
            {
                passive: false
            }
        );
    }

    /* ---------------------------------------------------------
       Error Logging
       --------------------------------------------------------- */

    window.addEventListener(
        "error",
        function (event) {
            if (
                !event ||
                !event.message
            ) {
                return;
            }

            console.error(
                "[Hillbound]",
                event.message
            );
        }
    );

    window.addEventListener(
        "unhandledrejection",
        function (event) {
            console.error(
                "[Hillbound] Unhandled promise rejection:",
                event.reason
            );
        }
    );

    /* ---------------------------------------------------------
       Global Initialization
       --------------------------------------------------------- */

    function init() {
        initLoadingScreen();
        initNavigation();
        initActiveNavigation();
        applyDisplayPreferences();
        initVisibilityHandling();
        initExternalLinks();
        initTouchBehavior();

        document.documentElement.dataset
            .hillboundReady = "true";

        document.dispatchEvent(
            new CustomEvent(
                "hillboundready",
                {
                    detail: {
                        version:
                            Hillbound.version,
                        page:
                            Hillbound.currentPage
                    }
                }
            )
        );
    }

    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})();
