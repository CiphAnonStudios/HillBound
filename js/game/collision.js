/* =========================================================
   HILLBOUND
   Collision System
   js/game/collision.js
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Collision = {};

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

    function getTerrain() {
        return window.Hillbound.Terrain || null;
    }

    function getWheels() {
        return window.Hillbound.Wheels || null;
    }

    /* ---------------------------------------------------------
       Defaults
       --------------------------------------------------------- */

    const DEFAULTS = {
        wheelTolerance: 4,
        bodyTolerance: 2,

        crashAngle: Math.PI * 0.48,
        hardImpactSpeed: 28,
        hardImpactVelocity: 42,

        minimumCrashSpeed: 8,

        restitution: 0.12,

        maxCorrection: 18,

        enabled: true
    };

    /* ---------------------------------------------------------
       Collision State
       --------------------------------------------------------- */

    function createState() {
        return {
            grounded: false,

            wheelContacts: 0,
            wheelCount: 0,

            bodyContact: false,

            penetration: 0,

            impactSpeed: 0,
            impactStrength: 0,

            hardImpact: false,

            crashed: false,

            lastGrounded: false,

            wasAirborne: false,

            landing: false,

            crashReason: "",

            cooldown: 0
        };
    }

    Collision.createState = createState;

    /* ---------------------------------------------------------
       Ensure State
       --------------------------------------------------------- */

    function ensureState(vehicle) {
        if (!vehicle) return null;

        if (!vehicle.collision) {
            vehicle.collision =
                createState();
        }

        return vehicle.collision;
    }

    Collision.ensureState =
        ensureState;

    /* ---------------------------------------------------------
       Vehicle Bounds
       --------------------------------------------------------- */

    function getVehicleSize(vehicle) {
        if (!vehicle) {
            return {
                width: 90,
                height: 45
            };
        }

        const size =
            vehicle.size || {};

        return {
            width: Math.max(
                1,
                number(
                    vehicle.width,
                    number(
                        size.width,
                        90
                    )
                )
            ),

            height: Math.max(
                1,
                number(
                    vehicle.height,
                    number(
                        size.height,
                        45
                    )
                )
            )
        };
    }

    Collision.getVehicleSize =
        getVehicleSize;

    /* ---------------------------------------------------------
       Rotated Body Corners
       --------------------------------------------------------- */

    function getBodyCorners(vehicle) {
        if (!vehicle) return [];

        const size =
            getVehicleSize(vehicle);

        const halfWidth =
            size.width / 2;

        const halfHeight =
            size.height / 2;

        const rotation =
            number(
                vehicle.rotation
            );

        const cos =
            Math.cos(rotation);

        const sin =
            Math.sin(rotation);

        const localCorners = [
            {
                x: -halfWidth,
                y: -halfHeight
            },

            {
                x: halfWidth,
                y: -halfHeight
            },

            {
                x: halfWidth,
                y: halfHeight
            },

            {
                x: -halfWidth,
                y: halfHeight
            }
        ];

        return localCorners.map(
            function (corner) {
                return {
                    x:
                        number(vehicle.x) +
                        corner.x * cos -
                        corner.y * sin,

                    y:
                        number(vehicle.y) +
                        corner.x * sin +
                        corner.y * cos
                };
            }
        );
    }

    Collision.getBodyCorners =
        getBodyCorners;

    /* ---------------------------------------------------------
       Body Bottom
       --------------------------------------------------------- */

    function getBottomPoint(vehicle) {
        const corners =
            getBodyCorners(
                vehicle
            );

        if (!corners.length) {
            return null;
        }

        let bottom =
            corners[0];

        for (
            let i = 1;
            i < corners.length;
            i++
        ) {
            if (
                corners[i].y >
                bottom.y
            ) {
                bottom =
                    corners[i];
            }
        }

        return bottom;
    }

    Collision.getBottomPoint =
        getBottomPoint;

    /* ---------------------------------------------------------
       Terrain Height
       --------------------------------------------------------- */

    function getGroundHeight(
        terrain,
        x
    ) {
        if (!terrain) return 0;

        const Terrain =
            getTerrain();

        if (
            Terrain &&
            typeof Terrain.getHeight ===
                "function"
        ) {
            return number(
                Terrain.getHeight(
                    terrain,
                    x
                ),
                0
            );
        }

        if (
            typeof terrain.getHeight ===
                "function"
        ) {
            return number(
                terrain.getHeight(x),
                0
            );
        }

        if (
            typeof terrain.heightAt ===
                "function"
        ) {
            return number(
                terrain.heightAt(x),
                0
            );
        }

        return number(
            terrain.baseHeight,
            0
        );
    }

    /* ---------------------------------------------------------
       Wheel Collision
       --------------------------------------------------------- */

    function checkWheel(
        vehicle,
        wheel,
        terrain
    ) {
        if (!wheel) {
            return {
                grounded: false,
                penetration: 0,
                x: 0,
                y: 0
            };
        }

        let position = null;

        const Wheels =
            getWheels();

        if (
            Wheels &&
            typeof Wheels.getWorldPosition ===
                "function"
        ) {
            position =
                Wheels.getWorldPosition(
                    vehicle,
                    wheel
                );
        } else {
            position = {
                x:
                    number(vehicle.x) +
                    number(wheel.offsetX),

                y:
                    number(vehicle.y) +
                    number(wheel.offsetY)
            };
        }

        const radius =
            Math.max(
                1,
                number(
                    wheel.radius,
                    16
                )
            );

        const ground =
            getGroundHeight(
                terrain,
                position.x
            );

        const bottom =
            position.y +
            radius;

        const penetration =
            bottom -
            ground;

        return {
            grounded:
                penetration >=
                -DEFAULTS.wheelTolerance,

            penetration,

            x: position.x,

            y: position.y,

            groundY: ground,

            radius
        };
    }

    Collision.checkWheel =
        checkWheel;

    /* ---------------------------------------------------------
       Check All Wheels
       --------------------------------------------------------- */

    function checkWheels(
        vehicle,
        terrain
    ) {
        const wheels =
            vehicle &&
            Array.isArray(
                vehicle.wheels
            )
                ? vehicle.wheels
                : [];

        const contacts = [];

        let grounded = 0;
        let penetration = 0;

        for (
            let i = 0;
            i < wheels.length;
            i++
        ) {
            const contact =
                checkWheel(
                    vehicle,
                    wheels[i],
                    terrain
                );

            contacts.push(
                contact
            );

            if (
                contact.grounded
            ) {
                grounded++;
            }

            penetration =
                Math.max(
                    penetration,
                    Math.max(
                        0,
                        contact.penetration
                    )
                );
        }

        return {
            contacts,
            grounded,
            total: wheels.length,
            penetration
        };
    }

    Collision.checkWheels =
        checkWheels;

    /* ---------------------------------------------------------
       Body Collision
       --------------------------------------------------------- */

    function checkBody(
        vehicle,
        terrain
    ) {
        const corners =
            getBodyCorners(
                vehicle
            );

        if (!corners.length) {
            return {
                contact: false,
                penetration: 0
            };
        }

        let contact = false;
        let maximumPenetration = 0;

        for (
            let i = 0;
            i < corners.length;
            i++
        ) {
            const corner =
                corners[i];

            const ground =
                getGroundHeight(
                    terrain,
                    corner.x
                );

            const penetration =
                corner.y -
                ground;

            if (
                penetration >=
                -DEFAULTS.bodyTolerance
            ) {
                contact = true;
            }

            maximumPenetration =
                Math.max(
                    maximumPenetration,
                    Math.max(
                        0,
                        penetration
                    )
                );
        }

        return {
            contact,
            penetration:
                maximumPenetration
        };
    }

    Collision.checkBody =
        checkBody;

    /* ---------------------------------------------------------
       Vehicle Ground Check
       --------------------------------------------------------- */

    function checkGround(
        vehicle,
        terrain
    ) {
        if (!vehicle || !terrain) {
            return {
                grounded: false,
                wheelContacts: 0,
                wheelCount: 0,
                bodyContact: false,
                penetration: 0,
                contacts: []
            };
        }

        const wheelResult =
            checkWheels(
                vehicle,
                terrain
            );

        const bodyResult =
            checkBody(
                vehicle,
                terrain
            );

        return {
            grounded:
                wheelResult.grounded > 0,

            wheelContacts:
                wheelResult.grounded,

            wheelCount:
                wheelResult.total,

            bodyContact:
                bodyResult.contact,

            penetration:
                Math.max(
                    wheelResult.penetration,
                    bodyResult.penetration
                ),

            contacts:
                wheelResult.contacts
        };
    }

    Collision.checkGround =
        checkGround;

    /* ---------------------------------------------------------
       Ground Correction
       --------------------------------------------------------- */

    function resolveWheelPenetration(
        vehicle,
        contact
    ) {
        if (
            !vehicle ||
            !contact ||
            contact.penetration <= 0
        ) {
            return 0;
        }

        const correction =
            Math.min(
                contact.penetration,
                DEFAULTS.maxCorrection
            );

        /*
         * Positive Y points downward in the game world,
         * so move the vehicle upward.
         */
        vehicle.y =
            number(vehicle.y) -
            correction;

        if (!vehicle.velocity) {
            vehicle.velocity = {
                x: 0,
                y: 0
            };
        }

        /*
         * Prevent the vehicle from continuing downward
         * through the terrain.
         */
        if (
            vehicle.velocity.y > 0
        ) {
            vehicle.velocity.y *=
                -DEFAULTS.restitution;
        }

        return correction;
    }

    Collision.resolveWheelPenetration =
        resolveWheelPenetration;

    /* ---------------------------------------------------------
       Resolve Ground Collision
       --------------------------------------------------------- */

    function resolveGround(
        vehicle,
        terrain
    ) {
        if (!vehicle || !terrain) {
            return 0;
        }

        const result =
            checkGround(
                vehicle,
                terrain
            );

        let correction = 0;

        for (
            let i = 0;
            i < result.contacts.length;
            i++
        ) {
            const contact =
                result.contacts[i];

            if (
                contact.penetration >
                0
            ) {
                correction +=
                    resolveWheelPenetration(
                        vehicle,
                        contact
                    );
            }
        }

        /*
         * Body correction is intentionally weaker than
         * wheel correction. This prevents the vehicle from
         * getting glued to steep terrain.
         */
        if (
            result.bodyContact &&
            result.penetration > 0
        ) {
            const bodyCorrection =
                Math.min(
                    result.penetration * 0.35,
                    DEFAULTS.maxCorrection
                );

            vehicle.y -=
                bodyCorrection;

            correction +=
                bodyCorrection;
        }

        return correction;
    }

    Collision.resolveGround =
        resolveGround;

    /* ---------------------------------------------------------
       Impact Speed
       --------------------------------------------------------- */

    function getImpactSpeed(
        vehicle
    ) {
        if (!vehicle) return 0;

        const velocity =
            vehicle.velocity || {};

        const vx =
            number(velocity.x);

        const vy =
            number(velocity.y);

        return Math.sqrt(
            vx * vx +
            vy * vy
        );
    }

    Collision.getImpactSpeed =
        getImpactSpeed;

    /* ---------------------------------------------------------
       Vertical Impact
       --------------------------------------------------------- */

    function getVerticalImpact(
        vehicle
    ) {
        if (!vehicle) return 0;

        return Math.abs(
            number(
                vehicle.velocity &&
                vehicle.velocity.y
            )
        );
    }

    Collision.getVerticalImpact =
        getVerticalImpact;

    /* ---------------------------------------------------------
       Landing Detection
       --------------------------------------------------------- */

    function checkLanding(
        vehicle,
        grounded
    ) {
        const state =
            ensureState(
                vehicle
            );

        if (!state) return false;

        const wasAirborne =
            state.wasAirborne;

        const landing =
            !state.lastGrounded &&
            grounded &&
            wasAirborne;

        state.landing =
            landing;

        if (grounded) {
            state.wasAirborne =
                false;
        } else {
            state.wasAirborne =
                true;
        }

        state.lastGrounded =
            grounded;

        return landing;
    }

    Collision.checkLanding =
        checkLanding;

    /* ---------------------------------------------------------
       Landing Impact
       --------------------------------------------------------- */

    function handleLanding(
        vehicle
    ) {
        if (!vehicle) return;

        const impact =
            getVerticalImpact(
                vehicle
            );

        const state =
            ensureState(
                vehicle
            );

        state.impactSpeed =
            impact;

        state.impactStrength =
            clamp(
                impact / 50,
                0,
                1
            );

        state.hardImpact =
            impact >=
            DEFAULTS.hardImpactVelocity;

        /*
         * Notify suspension when available.
         */
        const Suspension =
            window.Hillbound.Suspension;

        if (
            Suspension &&
            typeof Suspension.impact ===
                "function"
        ) {
            Suspension.impact(
                vehicle,
                clamp(
                    impact * 2,
                    0,
                    100
                )
            );
        }

        /*
         * Notify game systems.
         */
        if (
            typeof window.Hillbound.emit ===
                "function"
        ) {
            window.Hillbound.emit(
                "vehiclelanding",
                {
                    vehicle,
                    impact
                }
            );
        }

        return impact;
    }

    Collision.handleLanding =
        handleLanding;

    /* ---------------------------------------------------------
       Crash Angle
       --------------------------------------------------------- */

    function normalizeAngle(
        angle
    ) {
        let result =
            number(angle);

        while (
            result > Math.PI
        ) {
            result -=
                Math.PI * 2;
        }

        while (
            result < -Math.PI
        ) {
            result +=
                Math.PI * 2;
        }

        return result;
    }

    function getCrashAngle(
        vehicle
    ) {
        if (!vehicle) return 0;

        return Math.abs(
            normalizeAngle(
                vehicle.rotation
            )
        );
    }

    Collision.getCrashAngle =
        getCrashAngle;

    /* ---------------------------------------------------------
       Crash Detection
       --------------------------------------------------------- */

    function shouldCrash(
        vehicle,
        collisionState
    ) {
        if (
            !vehicle ||
            !collisionState
        ) {
            return false;
        }

        if (
            vehicle.crashed ||
            vehicle.destroyed
        ) {
            return true;
        }

        const angle =
            getCrashAngle(
                vehicle
            );

        const impact =
            number(
                collisionState.impactSpeed
            );

        const verticalImpact =
            getVerticalImpact(
                vehicle
            );

        /*
         * A very severe landing can cause a crash.
         */
        if (
            collisionState.landing &&
            verticalImpact >=
                DEFAULTS.hardImpactVelocity
        ) {
            return true;
        }

        /*
         * Large impacts at meaningful speed can cause
         * a crash.
         */
        if (
            collisionState.hardImpact &&
            impact >=
                DEFAULTS.hardImpactSpeed &&
            Math.abs(
                number(
                    vehicle.velocity &&
                    vehicle.velocity.y
                )
            ) >=
                DEFAULTS.minimumCrashSpeed
        ) {
            return true;
        }

        /*
         * If the vehicle is nearly upside down and is
         * touching the terrain, count it as a crash.
         */
        if (
            collisionState.bodyContact &&
            angle >=
                DEFAULTS.crashAngle
        ) {
            return true;
        }

        return false;
    }

    Collision.shouldCrash =
        shouldCrash;

    /* ---------------------------------------------------------
       Crash Vehicle
       --------------------------------------------------------- */

    function crash(
        vehicle,
        reason = "collision"
    ) {
        if (!vehicle) return false;

        const state =
            ensureState(
                vehicle
            );

        if (
            vehicle.crashed ||
            vehicle.destroyed
        ) {
            return false;
        }

        vehicle.crashed =
            true;

        state.crashed =
            true;

        state.crashReason =
            String(reason);

        /*
         * Let the vehicle's own crash handler run when
         * available.
         */
        if (
            typeof vehicle.crash ===
                "function"
        ) {
            vehicle.crash(
                reason
            );
        }

        /*
         * Notify other game systems.
         */
        if (
            typeof window.Hillbound.emit ===
                "function"
        ) {
            window.Hillbound.emit(
                "vehiclecrash",
                {
                    vehicle,
                    reason
                }
            );
        }

        return true;
    }

    Collision.crash =
        crash;

    /* ---------------------------------------------------------
       Clear Crash
       --------------------------------------------------------- */

    function clearCrash(
        vehicle
    ) {
        if (!vehicle) return;

        const state =
            ensureState(
                vehicle
            );

        vehicle.crashed =
            false;

        vehicle.destroyed =
            false;

        state.crashed =
            false;

        state.crashReason =
            "";

        state.impactSpeed =
            0;

        state.impactStrength =
            0;

        state.hardImpact =
            false;

        return vehicle;
    }

    Collision.clearCrash =
        clearCrash;

    /* ---------------------------------------------------------
       Main Collision Update
       --------------------------------------------------------- */

    function update(
        vehicle,
        terrain,
        dt
    ) {
        if (
            !vehicle ||
            !terrain
        ) {
            return null;
        }

        const state =
            ensureState(
                vehicle
            );

        const safeDt =
            Math.max(
                0,
                number(dt)
            );

        if (
            state.cooldown > 0
        ) {
            state.cooldown =
                Math.max(
                    0,
                    state.cooldown -
                    safeDt
                );
        }

        /*
         * Read current collision state before resolving it.
         */
        const result =
            checkGround(
                vehicle,
                terrain
            );

        state.grounded =
            result.grounded;

        state.wheelContacts =
            result.wheelContacts;

        state.wheelCount =
            result.wheelCount;

        state.bodyContact =
            result.bodyContact;

        state.penetration =
            result.penetration;

        /*
         * Detect landing before resolving the contact.
         */
        const landing =
            checkLanding(
                vehicle,
                result.grounded
            );

        if (landing) {
            handleLanding(
                vehicle
            );
        }

        /*
         * Resolve terrain penetration.
         */
        if (
            result.grounded ||
            result.bodyContact
        ) {
            resolveGround(
                vehicle,
                terrain
            );
        }

        /*
         * Refresh impact information after correction.
         */
        state.impactSpeed =
            getImpactSpeed(
                vehicle
            );

        state.impactStrength =
            clamp(
                state.impactSpeed /
                50,
                0,
                1
            );

        state.hardImpact =
            landing &&
            getVerticalImpact(
                vehicle
            ) >=
                DEFAULTS.hardImpactVelocity;

        /*
         * Check whether the current collision should
         * end the run.
         */
        if (
            !state.crashed &&
            shouldCrash(
                vehicle,
                state
            )
        ) {
            crash(
                vehicle,
                state.bodyContact
                    ? "vehicle_body_collision"
                    : "hard_impact"
            );
        }

        return state;
    }

    Collision.update =
        update;

    /* ---------------------------------------------------------
       Point Collision
       --------------------------------------------------------- */

    function pointAgainstTerrain(
        x,
        y,
        terrain,
        tolerance = 0
    ) {
        const ground =
            getGroundHeight(
                terrain,
                x
            );

        return {
            collision:
                y >=
                ground -
                number(tolerance),

            penetration:
                Math.max(
                    0,
                    y - ground
                ),

            groundY:
                ground
        };
    }

    Collision.pointAgainstTerrain =
        pointAgainstTerrain;

    /* ---------------------------------------------------------
       Circle Collision
       --------------------------------------------------------- */

    function circleAgainstTerrain(
        x,
        y,
        radius,
        terrain
    ) {
        const ground =
            getGroundHeight(
                terrain,
                x
            );

        const bottom =
            number(y) +
            Math.max(
                0,
                number(radius)
            );

        return {
            collision:
                bottom >=
                ground,

            penetration:
                Math.max(
                    0,
                    bottom -
                    ground
                ),

            groundY:
                ground
        };
    }

    Collision.circleAgainstTerrain =
        circleAgainstTerrain;

    /* ---------------------------------------------------------
       Distance To Terrain
       --------------------------------------------------------- */

    function distanceToTerrain(
        x,
        y,
        terrain
    ) {
        const ground =
            getGroundHeight(
                terrain,
                x
            );

        return ground -
            number(y);
    }

    Collision.distanceToTerrain =
        distanceToTerrain;

    /* ---------------------------------------------------------
       Reset
       --------------------------------------------------------- */

    function reset(
        vehicle
    ) {
        if (!vehicle) return;

        vehicle.collision =
            createState();

        return vehicle.collision;
    }

    Collision.reset =
        reset;

    /* ---------------------------------------------------------
       Configure
       --------------------------------------------------------- */

    function configure(
        options = {}
    ) {
        Object.keys(options).forEach(
            function (key) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        DEFAULTS,
                        key
                    )
                ) {
                    DEFAULTS[key] =
                        options[key];
                }
            }
        );

        return DEFAULTS;
    }

    Collision.configure =
        configure;

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    window.Hillbound.Collision =
        Collision;

    /*
     * Compatibility aliases.
     */
    window.Collision =
        Collision;

})();