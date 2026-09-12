/* =========================================================
   HILLBOUND
   Suspension System
   js/game/suspension.js
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Suspension = {};

    /* ---------------------------------------------------------
       Utilities
       --------------------------------------------------------- */

    function number(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, amount) {
        return a + (b - a) * amount;
    }

    function getWheels(vehicle) {
        if (!vehicle) return [];

        if (
            window.Hillbound.Wheels &&
            typeof window.Hillbound.Wheels.ensure === "function"
        ) {
            return window.Hillbound.Wheels.ensure(vehicle);
        }

        if (!Array.isArray(vehicle.wheels)) {
            vehicle.wheels = [];
        }

        return vehicle.wheels;
    }

    /* ---------------------------------------------------------
       Default Suspension Settings
       --------------------------------------------------------- */

    const DEFAULTS = {
        travel: 14,

        // Spring strength.
        stiffness: 0.72,

        // Dampens bouncing.
        damping: 0.82,

        // Maximum force applied by the suspension.
        maxForce: 18,

        // How quickly the suspension returns to normal.
        recovery: 5,

        // Prevents tiny movements from causing jitter.
        deadZone: 0.015,

        // Extra stability while both wheels are grounded.
        stability: 0.35
    };

    /* ---------------------------------------------------------
       Create Suspension
       --------------------------------------------------------- */

    function create(options = {}) {
        const suspension = {
            travel: Math.max(
                1,
                number(options.travel, DEFAULTS.travel)
            ),

            stiffness: Math.max(
                0,
                number(
                    options.stiffness,
                    DEFAULTS.stiffness
                )
            ),

            damping: clamp(
                number(
                    options.damping,
                    DEFAULTS.damping
                ),
                0,
                1
            ),

            maxForce: Math.max(
                0,
                number(
                    options.maxForce,
                    DEFAULTS.maxForce
                )
            ),

            recovery: Math.max(
                0,
                number(
                    options.recovery,
                    DEFAULTS.recovery
                )
            ),

            deadZone: Math.max(
                0,
                number(
                    options.deadZone,
                    DEFAULTS.deadZone
                )
            ),

            stability: Math.max(
                0,
                number(
                    options.stability,
                    DEFAULTS.stability
                )
            ),

            compression: 0,
            previousCompression: 0,
            velocity: 0,
            force: 0
        };

        return suspension;
    }

    Suspension.create = create;

    /* ---------------------------------------------------------
       Get Vehicle Suspension Stat
       --------------------------------------------------------- */

    function getVehicleSuspension(vehicle) {
        if (!vehicle) return 50;

        if (vehicle.stats) {
            return clamp(
                number(
                    vehicle.stats.suspension,
                    50
                ),
                0,
                100
            );
        }

        return 50;
    }

    /* ---------------------------------------------------------
       Get Suspension Settings From Vehicle
       --------------------------------------------------------- */

    function getSettings(vehicle) {
        const stat = getVehicleSuspension(vehicle);

        /*
         * Higher suspension stat:
         * - allows more travel
         * - handles larger impacts
         * - increases spring strength
         */
        const normalized = stat / 100;

        return {
            travel: lerp(10, 22, normalized),

            stiffness: lerp(
                0.45,
                0.95,
                normalized
            ),

            damping: lerp(
                0.68,
                0.94,
                normalized
            ),

            maxForce: lerp(
                10,
                28,
                normalized
            ),

            recovery: lerp(
                3,
                8,
                normalized
            ),

            deadZone: 0.015,

            stability: lerp(
                0.15,
                0.5,
                normalized
            )
        };
    }

    Suspension.getSettings = getSettings;

    /* ---------------------------------------------------------
       Ensure Vehicle Suspension
       --------------------------------------------------------- */

    function ensure(vehicle) {
        if (!vehicle) return null;

        if (!vehicle.suspension) {
            vehicle.suspension =
                create(
                    getSettings(vehicle)
                );
        }

        return vehicle.suspension;
    }

    Suspension.ensure = ensure;

    /* ---------------------------------------------------------
       Calculate Compression
       --------------------------------------------------------- */

    function calculateCompression(
        vehicle,
        wheel
    ) {
        if (!wheel) return 0;

        const settings =
            getSettings(vehicle);

        /*
         * Wheels already calculate their contact compression.
         * Clamp it again against suspension travel so it
         * cannot generate unreasonable forces.
         */
        const wheelCompression =
            clamp(
                number(
                    wheel.compression,
                    0
                ),
                0,
                1
            );

        const travel =
            Math.max(
                1,
                settings.travel
            );

        const actualCompression =
            wheelCompression *
            travel;

        return clamp(
            actualCompression / travel,
            0,
            1
        );
    }

    Suspension.calculateCompression =
        calculateCompression;

    /* ---------------------------------------------------------
       Update Individual Wheel Suspension
       --------------------------------------------------------- */

    function updateWheel(
        vehicle,
        wheel,
        suspension,
        dt
    ) {
        if (!wheel) return 0;

        const safeDt =
            Math.max(
                0,
                number(dt, 0)
            );

        const settings =
            getSettings(vehicle);

        const compression =
            calculateCompression(
                vehicle,
                wheel
            );

        const previous =
            number(
                wheel.suspensionCompression,
                compression
            );

        /*
         * Compression velocity.
         */
        let compressionVelocity = 0;

        if (safeDt > 0) {
            compressionVelocity =
                (compression - previous) /
                safeDt;
        }

        /*
         * Smooth the compression value.
         */
        const smoothing =
            clamp(
                safeDt * settings.recovery,
                0,
                1
            );

        wheel.suspensionCompression =
            lerp(
                previous,
                compression,
                smoothing
            );

        wheel.suspensionVelocity =
            compressionVelocity;

        /*
         * Spring force.
         */
        let springForce =
            wheel.suspensionCompression *
            settings.stiffness;

        /*
         * Damping counters fast compression/
         * expansion movement.
         */
        let dampingForce =
            compressionVelocity *
            (1 - settings.damping);

        /*
         * Positive force pushes the vehicle upward
         * when the wheel is compressed.
         */
        let force =
            springForce -
            dampingForce;

        force = clamp(
            force,
            -settings.maxForce,
            settings.maxForce
        );

        /*
         * Wheels that are not touching the ground
         * should not generate suspension force.
         */
        if (!wheel.grounded) {
            force = 0;
        }

        wheel.suspensionForce = force;

        /*
         * Save values for the vehicle-level system.
         */
        suspension.compression +=
            wheel.suspensionCompression;

        suspension.velocity +=
            compressionVelocity;

        suspension.force +=
            force;

        return force;
    }

    Suspension.updateWheel =
        updateWheel;

    /* ---------------------------------------------------------
       Apply Suspension Force
       --------------------------------------------------------- */

    function applyForce(
        vehicle,
        wheel,
        force,
        dt
    ) {
        if (
            !vehicle ||
            !wheel ||
            !wheel.grounded
        ) {
            return;
        }

        if (!vehicle.velocity) {
            vehicle.velocity = {
                x: 0,
                y: 0
            };
        }

        const safeDt =
            Math.max(
                0,
                number(dt, 0)
            );

        const safeForce =
            number(force, 0);

        /*
         * The core physics uses a positive-down Y axis.
         * Suspension therefore pushes upward with negative Y.
         */
        const mass =
            vehicle.mass ||
            (
                vehicle.physics &&
                vehicle.physics.mass
            ) ||
            1;

        vehicle.velocity.y -=
            (safeForce / Math.max(1, mass)) *
            safeDt;
    }

    Suspension.applyForce =
        applyForce;

    /* ---------------------------------------------------------
       Body Stability
       --------------------------------------------------------- */

    function applyStability(
        vehicle,
        dt
    ) {
        if (!vehicle) return;

        const wheels =
            getWheels(vehicle);

        if (wheels.length < 2) {
            return;
        }

        let grounded = 0;

        for (let i = 0; i < wheels.length; i++) {
            if (wheels[i].grounded) {
                grounded++;
            }
        }

        /*
         * Stability is strongest when the vehicle has
         * multiple grounded wheels.
         */
        if (grounded < 2) {
            return;
        }

        const settings =
            getSettings(vehicle);

        const safeDt =
            Math.max(
                0,
                number(dt, 0)
            );

        const stability =
            clamp(
                settings.stability,
                0,
                1
            );

        const rotation =
            number(
                vehicle.rotation,
                0
            );

        /*
         * Gently bring the vehicle back toward the
         * terrain-aligned orientation.
         *
         * This does NOT snap the vehicle upright.
         */
        let targetRotation = 0;

        if (
            window.Hillbound.Wheels &&
            typeof window.Hillbound.Wheels.getWorldPosition ===
                "function"
        ) {
            const first =
                wheels[0];

            const last =
                wheels[wheels.length - 1];

            if (
                first.contactX !== undefined &&
                last.contactX !== undefined
            ) {
                const dx =
                    number(
                        last.contactX,
                        0
                    ) -
                    number(
                        first.contactX,
                        0
                    );

                const dy =
                    number(
                        last.contactY,
                        0
                    ) -
                    number(
                        first.contactY,
                        0
                    );

                if (Math.abs(dx) > 0.001) {
                    targetRotation =
                        Math.atan2(
                            dy,
                            dx
                        );
                }
            }
        }

        /*
         * Normalize angle difference.
         */
        let difference =
            targetRotation -
            rotation;

        while (difference > Math.PI) {
            difference -=
                Math.PI * 2;
        }

        while (difference < -Math.PI) {
            difference +=
                Math.PI * 2;
        }

        const correction =
            difference *
            stability *
            safeDt *
            3;

        if (
            vehicle.angularVelocity !==
            undefined
        ) {
            vehicle.angularVelocity =
                number(
                    vehicle.angularVelocity
                );

            vehicle.angularVelocity +=
                correction;
        } else {
            vehicle.rotation +=
                correction;
        }
    }

    Suspension.applyStability =
        applyStability;

    /* ---------------------------------------------------------
       Update Suspension
       --------------------------------------------------------- */

    function update(
        vehicle,
        terrain,
        dt
    ) {
        if (!vehicle) return;

        const wheels =
            getWheels(vehicle);

        if (!wheels.length) {
            return;
        }

        const suspension =
            ensure(vehicle);

        suspension.compression = 0;
        suspension.velocity = 0;
        suspension.force = 0;

        /*
         * Wheel contacts should already have been updated
         * by Wheels.update(). If they have not, update them.
         */
        if (
            window.Hillbound.Wheels &&
            typeof window.Hillbound.Wheels.updateContacts ===
                "function"
        ) {
            window.Hillbound.Wheels.updateContacts(
                vehicle,
                terrain
            );
        }

        for (
            let i = 0;
            i < wheels.length;
            i++
        ) {
            const wheel =
                wheels[i];

            const force =
                updateWheel(
                    vehicle,
                    wheel,
                    suspension,
                    dt
                );

            applyForce(
                vehicle,
                wheel,
                force,
                dt
            );
        }

        /*
         * Average values for debugging/UI.
         */
        const count =
            Math.max(
                1,
                wheels.length
            );

        suspension.compression /=
            count;

        suspension.velocity /=
            count;

        suspension.force /=
            count;

        applyStability(
            vehicle,
            dt
        );

        return suspension;
    }

    Suspension.update = update;

    /* ---------------------------------------------------------
       Impact / Landing
       --------------------------------------------------------- */

    function impact(
        vehicle,
        strength
    ) {
        if (!vehicle) return;

        const suspension =
            ensure(vehicle);

        const impactStrength =
            clamp(
                number(
                    strength,
                    0
                ),
                0,
                100
            );

        /*
         * Convert impact into temporary suspension
         * compression rather than directly changing
         * the vehicle position.
         */
        const compression =
            clamp(
                impactStrength / 100,
                0,
                1
            );

        suspension.compression =
            Math.max(
                suspension.compression,
                compression
            );

        suspension.velocity +=
            compression * 2;

        return compression;
    }

    Suspension.impact = impact;

    /* ---------------------------------------------------------
       Reset
       --------------------------------------------------------- */

    function reset(vehicle) {
        if (!vehicle) return;

        const suspension =
            ensure(vehicle);

        suspension.compression = 0;
        suspension.previousCompression = 0;
        suspension.velocity = 0;
        suspension.force = 0;

        const wheels =
            getWheels(vehicle);

        for (
            let i = 0;
            i < wheels.length;
            i++
        ) {
            wheels[i].suspensionCompression = 0;
            wheels[i].suspensionVelocity = 0;
            wheels[i].suspensionForce = 0;
        }
    }

    Suspension.reset = reset;

    /* ---------------------------------------------------------
       Configure
       --------------------------------------------------------- */

    function configure(
        vehicle,
        options = {}
    ) {
        if (!vehicle) return null;

        const suspension =
            ensure(vehicle);

        Object.keys(options).forEach(
            function (key) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        suspension,
                        key
                    )
                ) {
                    suspension[key] =
                        number(
                            options[key],
                            suspension[key]
                        );
                }
            }
        );

        return suspension;
    }

    Suspension.configure =
        configure;

    /* ---------------------------------------------------------
       Debug Information
       --------------------------------------------------------- */

    function getDebugInfo(vehicle) {
        if (!vehicle) {
            return null;
        }

        const suspension =
            ensure(vehicle);

        return {
            compression:
                number(
                    suspension.compression
                ),

            velocity:
                number(
                    suspension.velocity
                ),

            force:
                number(
                    suspension.force
                ),

            settings:
                getSettings(vehicle)
        };
    }

    Suspension.getDebugInfo =
        getDebugInfo;

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    window.Hillbound.Suspension =
        Suspension;

    /*
     * Compatibility alias.
     */
    window.Suspension =
        Suspension;

})();