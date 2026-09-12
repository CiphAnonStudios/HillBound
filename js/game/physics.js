/* =========================================================
   HILLBOUND — PHYSICS
   js/game/physics.js
   Core vehicle physics system
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};
    Hillbound.Physics = Hillbound.Physics || {};

    const Physics = Hillbound.Physics;

    /* ---------------------------------------------------------
       Default Physics Configuration
       --------------------------------------------------------- */

    const DEFAULTS = {
        gravity: 1250,

        airDensity: 1,

        groundFriction: 0.82,
        airDrag: 0.015,

        maxSpeed: 850,
        reverseSpeed: 260,

        acceleration: 420,
        braking: 650,

        airControl: 2.2,

        rotationSpeed: 3.5,
        rotationDamping: 0.86,

        velocityDamping: 0.995,

        slopeGravity: 0.65,

        bounce: 0.08,

        groundSnap: 8,

        maxDeltaTime: 0.033
    };

    Physics.config = Object.assign(
        {},
        DEFAULTS
    );

    /* ---------------------------------------------------------
       Runtime State
       --------------------------------------------------------- */

    Physics.initialized = false;

    Physics.world = {
        gravity:
            DEFAULTS.gravity
    };

    /* ---------------------------------------------------------
       Utility
       --------------------------------------------------------- */

    function clamp(
        value,
        min,
        max
    ) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function lerp(
        a,
        b,
        amount
    ) {
        return (
            a +
            (b - a) *
            amount
        );
    }

    function approach(
        current,
        target,
        amount
    ) {
        if (
            current < target
        ) {
            return Math.min(
                current + amount,
                target
            );
        }

        if (
            current > target
        ) {
            return Math.max(
                current - amount,
                target
            );
        }

        return target;
    }

    function safeNumber(
        value,
        fallback
    ) {
        return Number.isFinite(
            Number(value)
        )
            ? Number(value)
            : fallback;
    }

    function getInputValue(
        input,
        names
    ) {
        if (!input) {
            return 0;
        }

        for (
            let i = 0;
            i < names.length;
            i++
        ) {
            const name =
                names[i];

            if (
                typeof input[name] ===
                "function"
            ) {
                const value =
                    Number(
                        input[name]()
                    );

                if (
                    Number.isFinite(value)
                ) {
                    return value;
                }
            }

            if (
                Number.isFinite(
                    Number(input[name])
                )
            ) {
                return Number(
                    input[name]
                );
            }
        }

        return 0;
    }

    /* ---------------------------------------------------------
       Vehicle Stats
       --------------------------------------------------------- */

    function getVehicleStats(
        vehicle
    ) {
        const stats =
            vehicle &&
            vehicle.stats
                ? vehicle.stats
                : {};

        return {
            speed:
                safeNumber(
                    stats.speed,
                    50
                ),

            acceleration:
                safeNumber(
                    stats.acceleration,
                    50
                ),

            weight:
                safeNumber(
                    stats.weight,
                    50
                ),

            torque:
                safeNumber(
                    stats.torque,
                    50
                ),

            grip:
                safeNumber(
                    stats.grip,
                    50
                ),

            suspension:
                safeNumber(
                    stats.suspension,
                    50
                ),

            stability:
                safeNumber(
                    stats.stability,
                    50
                ),

            airControl:
                safeNumber(
                    stats.airControl,
                    50
                )
        };
    }

    function getVehicleMass(
        vehicle
    ) {
        if (
            Number.isFinite(
                vehicle.mass
            )
        ) {
            return Math.max(
                0.1,
                vehicle.mass
            );
        }

        const stats =
            getVehicleStats(
                vehicle
            );

        return lerp(
            0.8,
            2.5,
            clamp(
                stats.weight / 100,
                0,
                1
            )
        );
    }

    /* ---------------------------------------------------------
       Input
       --------------------------------------------------------- */

    function getInput(
        vehicle
    ) {
        let input =
            window.HillboundInput ||
            window.Input ||
            null;

        if (!input) {
            return {
                throttle: 0,
                brake: 0,
                steer: 0
            };
        }

        let throttle =
            getInputValue(
                input,
                [
                    "getThrottle",
                    "throttle",
                    "gas",
                    "accelerate"
                ]
            );

        let brake =
            getInputValue(
                input,
                [
                    "getBrake",
                    "brake",
                    "reverse"
                ]
            );

        let steer =
            getInputValue(
                input,
                [
                    "getSteer",
                    "steer",
                    "rotation"
                ]
            );

        /*
         * Support boolean-style input systems.
         */

        if (
            throttle === 0 &&
            (
                input.gasPressed ||
                input.accelerating
            )
        ) {
            throttle = 1;
        }

        if (
            brake === 0 &&
            (
                input.brakePressed ||
                input.braking
            )
        ) {
            brake = 1;
        }

        if (
            steer === 0
        ) {
            if (
                input.left ||
                input.turnLeft
            ) {
                steer -= 1;
            }

            if (
                input.right ||
                input.turnRight
            ) {
                steer += 1;
            }
        }

        return {
            throttle:
                clamp(
                    throttle,
                    0,
                    1
                ),

            brake:
                clamp(
                    brake,
                    0,
                    1
                ),

            steer:
                clamp(
                    steer,
                    -1,
                    1
                )
        };
    }

    /* ---------------------------------------------------------
       Position Helpers
       --------------------------------------------------------- */

    function getX(
        vehicle
    ) {
        return safeNumber(
            vehicle.x,
            0
        );
    }

    function getY(
        vehicle
    ) {
        return safeNumber(
            vehicle.y,
            0
        );
    }

    function getVelocityX(
        vehicle
    ) {
        if (
            Number.isFinite(
                vehicle.velocityX
            )
        ) {
            return vehicle.velocityX;
        }

        if (
            vehicle.velocity &&
            Number.isFinite(
                vehicle.velocity.x
            )
        ) {
            return vehicle.velocity.x;
        }

        return 0;
    }

    function getVelocityY(
        vehicle
    ) {
        if (
            Number.isFinite(
                vehicle.velocityY
            )
        ) {
            return vehicle.velocityY;
        }

        if (
            vehicle.velocity &&
            Number.isFinite(
                vehicle.velocity.y
            )
        ) {
            return vehicle.velocity.y;
        }

        return 0;
    }

    function setVelocity(
        vehicle,
        x,
        y
    ) {
        if (
            "velocityX" in vehicle
        ) {
            vehicle.velocityX =
                x;
        }

        if (
            "velocityY" in vehicle
        ) {
            vehicle.velocityY =
                y;
        }

        if (
            vehicle.velocity
        ) {
            vehicle.velocity.x =
                x;

            vehicle.velocity.y =
                y;
        }
    }

    function getRotation(
        vehicle
    ) {
        return safeNumber(
            vehicle.rotation,
            0
        );
    }

    function setRotation(
        vehicle,
        value
    ) {
        vehicle.rotation =
            value;
    }

    function getAngularVelocity(
        vehicle
    ) {
        return safeNumber(
            vehicle.angularVelocity,
            0
        );
    }

    function setAngularVelocity(
        vehicle,
        value
    ) {
        vehicle.angularVelocity =
            value;
    }

    /* ---------------------------------------------------------
       Vehicle Dimensions
       --------------------------------------------------------- */

    function getVehicleWidth(
        vehicle
    ) {
        return safeNumber(
            vehicle.width,
            80
        );
    }

    function getVehicleHeight(
        vehicle
    ) {
        return safeNumber(
            vehicle.height,
            40
        );
    }

    function getGroundPoint(
        vehicle
    ) {
        return {
            x:
                getX(vehicle),

            y:
                getY(vehicle) +
                getVehicleHeight(vehicle) *
                0.5
        };
    }

    /* ---------------------------------------------------------
       Terrain Height
       --------------------------------------------------------- */

    function getTerrainHeight(
        terrain,
        x
    ) {
        if (
            !terrain
        ) {
            return null;
        }

        if (
            typeof terrain.getHeight ===
            "function"
        ) {
            const height =
                Number(
                    terrain.getHeight(x)
                );

            if (
                Number.isFinite(height)
            ) {
                return height;
            }
        }

        if (
            typeof terrain.heightAt ===
            "function"
        ) {
            const height =
                Number(
                    terrain.heightAt(x)
                );

            if (
                Number.isFinite(height)
            ) {
                return height;
            }
        }

        return null;
    }

    function getTerrainSlope(
        terrain,
        x
    ) {
        if (
            !terrain
        ) {
            return 0;
        }

        if (
            typeof terrain.getSlope ===
            "function"
        ) {
            return safeNumber(
                terrain.getSlope(x),
                0
            );
        }

        const sample =
            8;

        const current =
            getTerrainHeight(
                terrain,
                x
            );

        const next =
            getTerrainHeight(
                terrain,
                x + sample
            );

        if (
            current === null ||
            next === null
        ) {
            return 0;
        }

        return (
            (next - current) /
            sample
        );
    }

    /* ---------------------------------------------------------
       Ground Detection
       --------------------------------------------------------- */

    function getGroundInfo(
        vehicle,
        terrain
    ) {
        const point =
            getGroundPoint(
                vehicle
            );

        const terrainY =
            getTerrainHeight(
                terrain,
                point.x
            );

        if (
            terrainY === null
        ) {
            return {
                grounded: false,
                terrainY: null,
                penetration: 0,
                slope: 0
            };
        }

        const penetration =
            point.y -
            terrainY;

        const snapDistance =
            Physics.config.groundSnap;

        return {
            grounded:
                penetration >= -snapDistance,

            terrainY:
                terrainY,

            penetration:
                Math.max(
                    0,
                    penetration
                ),

            slope:
                getTerrainSlope(
                    terrain,
                    point.x
                )
        };
    }

    /* ---------------------------------------------------------
       Gravity
       --------------------------------------------------------- */

    function applyGravity(
        vehicle,
        dt
    ) {
        const mass =
            getVehicleMass(
                vehicle
            );

        const gravity =
            Physics.config.gravity;

        let velocityY =
            getVelocityY(
                vehicle
            );

        velocityY +=
            gravity *
            mass *
            dt;

        setVelocity(
            vehicle,
            getVelocityX(vehicle),
            velocityY
        );
    }

    /* ---------------------------------------------------------
       Engine Force
       --------------------------------------------------------- */

    function calculateEngineForce(
        vehicle,
        input
    ) {
        const stats =
            getVehicleStats(
                vehicle
            );

        const acceleration =
            Physics.config.acceleration *
            (
                0.45 +
                stats.acceleration /
                100 *
                0.55
            );

        const torque =
            0.45 +
            stats.torque /
            100 *
            0.75;

        const weight =
            getVehicleMass(
                vehicle
            );

        return (
            acceleration *
            torque /
            weight *
            input.throttle
        );
    }

    /* ---------------------------------------------------------
       Ground Acceleration
       --------------------------------------------------------- */

    function applyGroundDrive(
        vehicle,
        input,
        dt,
        ground
    ) {
        const stats =
            getVehicleStats(
                vehicle
            );

        let velocityX =
            getVelocityX(
                vehicle
            );

        const engineForce =
            calculateEngineForce(
                vehicle,
                input
            );

        /*
         * Uphill slows the vehicle down naturally.
         * Downhill provides additional acceleration.
         */

        const slopeForce =
            -ground.slope *
            Physics.config.slopeGravity *
            Physics.config.gravity *
            dt;

        velocityX +=
            engineForce *
            dt;

        velocityX +=
            slopeForce;

        /*
         * Braking / reverse.
         */

        if (
            input.brake > 0
        ) {
            const braking =
                Physics.config.braking *
                input.brake *
                dt;

            velocityX =
                approach(
                    velocityX,
                    -Physics.config.reverseSpeed *
                    input.brake,
                    braking
                );
        }

        /*
         * Ground friction.
         */

        const grip =
            clamp(
                stats.grip /
                100,
                0.2,
                1.25
            );

        const friction =
            Math.pow(
                Physics.config.groundFriction,
                dt * 60
            );

        velocityX *=
            lerp(
                1,
                friction,
                grip
            );

        /*
         * Vehicle speed stat.
         */

        const maxSpeed =
            Physics.config.maxSpeed *
            (
                0.5 +
                stats.speed /
                100 *
                0.7
            );

        velocityX =
            clamp(
                velocityX,
                -Physics.config.reverseSpeed,
                maxSpeed
            );

        setVelocity(
            vehicle,
            velocityX,
            getVelocityY(vehicle)
        );
    }

    /* ---------------------------------------------------------
       Air Movement
       --------------------------------------------------------- */

    function applyAirControl(
        vehicle,
        input,
        dt
    ) {
        const stats =
            getVehicleStats(
                vehicle
            );

        const controlStrength =
            Physics.config.airControl *
            (
                0.35 +
                stats.airControl /
                100 *
                0.65
            );

        let angularVelocity =
            getAngularVelocity(
                vehicle
            );

        angularVelocity +=
            input.steer *
            controlStrength *
            dt;

        /*
         * Some control systems use gas/brake for
         * forward/backward rotation in the air.
         */

        angularVelocity +=
            input.throttle *
            controlStrength *
            0.35 *
            dt;

        angularVelocity -=
            input.brake *
            controlStrength *
            0.35 *
            dt;

        const stability =
            clamp(
                stats.stability /
                100,
                0,
                1
            );

        angularVelocity *=
            lerp(
                1,
                Physics.config.rotationDamping,
                stability
            );

        setAngularVelocity(
            vehicle,
            angularVelocity
        );
    }

    /* ---------------------------------------------------------
       Ground Rotation
       --------------------------------------------------------- */

    function alignVehicleToTerrain(
        vehicle,
        ground,
        dt
    ) {
        if (
            !ground.grounded
        ) {
            return;
        }

        const targetRotation =
            Math.atan(
                ground.slope
            );

        let rotation =
            getRotation(
                vehicle
            );

        /*
         * Keep the vehicle's rotation close to the
         * terrain while still allowing jumps/flips.
         */

        const stats =
            getVehicleStats(
                vehicle
            );

        const stability =
            clamp(
                stats.stability /
                100,
                0,
                1
            );

        const correction =
            (
                3 +
                stability * 4
            ) *
            dt;

        rotation =
            lerp(
                rotation,
                targetRotation,
                clamp(
                    correction,
                    0,
                    1
                )
            );

        setRotation(
            vehicle,
            rotation
        );

        setAngularVelocity(
            vehicle,
            getAngularVelocity(vehicle) *
            0.55
        );
    }

    /* ---------------------------------------------------------
       Ground Collision Response
       --------------------------------------------------------- */

    function resolveGroundCollision(
        vehicle,
        ground
    ) {
        if (
            !ground.grounded ||
            ground.terrainY === null
        ) {
            return;
        }

        const halfHeight =
            getVehicleHeight(
                vehicle
            ) *
            0.5;

        const targetY =
            ground.terrainY -
            halfHeight;

        if (
            getY(vehicle) >
            targetY
        ) {
            vehicle.y =
                targetY;

            let velocityY =
                getVelocityY(
                    vehicle
                );

            if (
                velocityY > 0
            ) {
                velocityY *=
                    -Physics.config.bounce;

                if (
                    Math.abs(
                        velocityY
                    ) < 20
                ) {
                    velocityY = 0;
                }
            }

            setVelocity(
                vehicle,
                getVelocityX(vehicle),
                velocityY
            );
        }
    }

    /* ---------------------------------------------------------
       Air Drag
       --------------------------------------------------------- */

    function applyAirDrag(
        vehicle,
        dt
    ) {
        let velocityX =
            getVelocityX(
                vehicle
            );

        let velocityY =
            getVelocityY(
                vehicle
            );

        const speed =
            Math.sqrt(
                velocityX *
                velocityX +
                velocityY *
                velocityY
            );

        const drag =
            1 -
            clamp(
                Physics.config.airDrag *
                speed *
                dt,
                0,
                0.4
            );

        velocityX *=
            drag;

        velocityY *=
            drag;

        setVelocity(
            vehicle,
            velocityX,
            velocityY
        );
    }

    /* ---------------------------------------------------------
       Position Integration
       --------------------------------------------------------- */

    function integratePosition(
        vehicle,
        dt
    ) {
        let velocityX =
            getVelocityX(
                vehicle
            );

        let velocityY =
            getVelocityY(
                vehicle
            );

        vehicle.x +=
            velocityX *
            dt;

        vehicle.y +=
            velocityY *
            dt;

        vehicle.rotation +=
            getAngularVelocity(
                vehicle
            ) *
            dt;
    }

    /* ---------------------------------------------------------
       Vehicle Stabilization
       --------------------------------------------------------- */

    function stabilizeVehicle(
        vehicle,
        dt,
        grounded
    ) {
        if (
            grounded
        ) {
            return;
        }

        const stats =
            getVehicleStats(
                vehicle
            );

        const stability =
            clamp(
                stats.stability /
                100,
                0,
                1
            );

        let angularVelocity =
            getAngularVelocity(
                vehicle
            );

        angularVelocity *=
            Math.pow(
                lerp(
                    0.999,
                    0.96,
                    stability
                ),
                dt * 60
            );

        setAngularVelocity(
            vehicle,
            angularVelocity
        );
    }

    /* ---------------------------------------------------------
       Suspension Hook
       --------------------------------------------------------- */

    function updateSuspension(
        vehicle,
        terrain,
        dt,
        ground
    ) {
        const suspension =
            window.Suspension ||
            window.HillboundSuspension ||
            null;

        if (!suspension) {
            return;
        }

        if (
            typeof suspension.update ===
            "function"
        ) {
            try {
                suspension.update(
                    vehicle,
                    terrain,
                    dt,
                    ground
                );
            } catch (error) {
                console.error(
                    "[Hillbound Physics] Suspension error:",
                    error
                );
            }
        }
    }

    /* ---------------------------------------------------------
       Wheel Hook
       --------------------------------------------------------- */

    function updateWheels(
        vehicle,
        terrain,
        dt,
        ground
    ) {
        const wheels =
            window.Wheels ||
            window.HillboundWheels ||
            null;

        if (!wheels) {
            return;
        }

        if (
            typeof wheels.update ===
            "function"
        ) {
            try {
                wheels.update(
                    vehicle,
                    terrain,
                    dt,
                    ground
                );
            } catch (error) {
                console.error(
                    "[Hillbound Physics] Wheel error:",
                    error
                );
            }
        }
    }

    /* ---------------------------------------------------------
       Vehicle Physics Update
       --------------------------------------------------------- */

    function update(
        vehicle,
        terrain,
        dt
    ) {
        if (
            !vehicle
        ) {
            return;
        }

        dt =
            clamp(
                safeNumber(
                    dt,
                    1 / 60
                ),
                0,
                Physics.config.maxDeltaTime
            );

        const input =
            getInput(
                vehicle
            );

        const ground =
            getGroundInfo(
                vehicle,
                terrain
            );

        /*
         * Gravity always applies.
         */

        applyGravity(
            vehicle,
            dt
        );

        /*
         * Ground driving or airborne controls.
         */

        if (
            ground.grounded
        ) {
            applyGroundDrive(
                vehicle,
                input,
                dt,
                ground
            );

            alignVehicleToTerrain(
                vehicle,
                ground,
                dt
            );
        } else {
            applyAirControl(
                vehicle,
                input,
                dt
            );

            applyAirDrag(
                vehicle,
                dt
            );
        }

        /*
         * Suspension and wheels get a chance to modify
         * the base physics before position integration.
         */

        updateSuspension(
            vehicle,
            terrain,
            dt,
            ground
        );

        updateWheels(
            vehicle,
            terrain,
            dt,
            ground
        );

        stabilizeVehicle(
            vehicle,
            dt,
            ground.grounded
        );

        integratePosition(
            vehicle,
            dt
        );

        resolveGroundCollision(
            vehicle,
            getGroundInfo(
                vehicle,
                terrain
            )
        );

        /*
         * Keep the vehicle within reasonable numerical
         * limits so a bad physics state cannot explode.
         */

        const velocityX =
            clamp(
                getVelocityX(vehicle),
                -Physics.config.reverseSpeed *
                1.5,
                Physics.config.maxSpeed *
                2
            );

        const velocityY =
            clamp(
                getVelocityY(vehicle),
                -2500,
                2500
            );

        setVelocity(
            vehicle,
            velocityX,
            velocityY
        );

        /*
         * Allow the vehicle itself to perform any additional
         * custom physics after the core system.
         */

        if (
            typeof vehicle.afterPhysics ===
            "function"
        ) {
            vehicle.afterPhysics(
                dt,
                ground,
                input
            );
        }
    }

    /* ---------------------------------------------------------
       Collision Force
       --------------------------------------------------------- */

    function applyImpact(
        vehicle,
        force,
        direction
    ) {
        if (
            !vehicle
        ) {
            return;
        }

        const impact =
            Math.max(
                0,
                safeNumber(
                    force,
                    0
                )
            );

        const sign =
            direction >= 0
                ? 1
                : -1;

        let velocityX =
            getVelocityX(
                vehicle
            );

        let velocityY =
            getVelocityY(
                vehicle
            );

        velocityX +=
            sign *
            impact *
            0.25;

        velocityY -=
            impact *
            0.4;

        setVelocity(
            vehicle,
            velocityX,
            velocityY
        );

        setAngularVelocity(
            vehicle,
            getAngularVelocity(
                vehicle
            ) +
            sign *
            impact *
            0.005
        );
    }

    /* ---------------------------------------------------------
       Reset
       --------------------------------------------------------- */

    function reset() {
        Physics.config =
            Object.assign(
                {},
                DEFAULTS
            );

        Physics.world.gravity =
            DEFAULTS.gravity;

        Physics.initialized =
            true;
    }

    /* ---------------------------------------------------------
       Configuration
       --------------------------------------------------------- */

    function configure(
        settings
    ) {
        if (
            !settings ||
            typeof settings !==
            "object"
        ) {
            return;
        }

        Object.assign(
            Physics.config,
            settings
        );

        if (
            Number.isFinite(
                settings.gravity
            )
        ) {
            Physics.world.gravity =
                settings.gravity;
        }
    }

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    Physics.init =
        function () {
            reset();
        };

    Physics.update =
        update;

    Physics.applyImpact =
        applyImpact;

    Physics.configure =
        configure;

    Physics.getGroundInfo =
        getGroundInfo;

    Physics.getTerrainHeight =
        getTerrainHeight;

    Physics.getTerrainSlope =
        getTerrainSlope;

    Physics.getVehicleStats =
        getVehicleStats;

    Physics.clamp =
        clamp;

    Physics.lerp =
        lerp;

    /* ---------------------------------------------------------
       Initialize
       --------------------------------------------------------- */

    Physics.init();

})();
