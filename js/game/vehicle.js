/* =========================================================
   HILLBOUND — VEHICLE
   js/game/vehicle.js
   Shared vehicle base class and vehicle factory
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};
    Hillbound.Vehicle = Hillbound.Vehicle || {};

    const VehicleSystem = Hillbound.Vehicle;

    /* ---------------------------------------------------------
       Defaults
       --------------------------------------------------------- */

    const DEFAULT_STATS = {
        speed: 50,
        acceleration: 50,
        weight: 50,
        torque: 50,
        grip: 50,
        suspension: 50,
        fuelCapacity: 50,
        airControl: 50,
        stability: 50
    };

    const DEFAULT_SIZE = {
        width: 90,
        height: 44
    };

    const DEFAULT_PHYSICS = {
        maxSpeed: 850,
        acceleration: 420,
        braking: 650,
        reverseSpeed: 260,
        gravityScale: 1,
        airControl: 2.2,
        rotationSpeed: 3.5
    };

    /* ---------------------------------------------------------
       Utility
       --------------------------------------------------------- */

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function number(value, fallback) {
        const result = Number(value);

        return Number.isFinite(result)
            ? result
            : fallback;
    }

    function merge(target, source) {
        if (
            !source ||
            typeof source !== "object"
        ) {
            return target;
        }

        Object.keys(source).forEach(function (key) {
            if (
                source[key] &&
                typeof source[key] === "object" &&
                !Array.isArray(source[key]) &&
                target[key] &&
                typeof target[key] === "object"
            ) {
                merge(
                    target[key],
                    source[key]
                );
            } else {
                target[key] = source[key];
            }
        });

        return target;
    }

    function clone(object) {
        return JSON.parse(
            JSON.stringify(object)
        );
    }

    /* ---------------------------------------------------------
       Vehicle Constructor
       --------------------------------------------------------- */

    class Vehicle {

        constructor(options) {
            options =
                options || {};

            this.id =
                options.id ||
                "starter-car";

            this.name =
                options.name ||
                "Starter Car";

            this.type =
                options.type ||
                "car";

            this.description =
                options.description ||
                "A reliable vehicle built for learning the hills.";

            this.image =
                options.image ||
                "";

            this.stats =
                merge(
                    clone(DEFAULT_STATS),
                    options.stats || {}
                );

            this.size =
                merge(
                    clone(DEFAULT_SIZE),
                    options.size || {}
                );

            this.physics =
                merge(
                    clone(DEFAULT_PHYSICS),
                    options.physics || {}
                );

            this.position = {
                x:
                    number(
                        options.x,
                        120
                    ),

                y:
                    number(
                        options.y,
                        100
                    )
            };

            this.velocity = {
                x: 0,
                y: 0
            };

            this.x =
                this.position.x;

            this.y =
                this.position.y;

            this.velocityX = 0;
            this.velocityY = 0;

            this.rotation =
                number(
                    options.rotation,
                    0
                );

            this.angularVelocity = 0;

            this.grounded = false;
            this.crashed = false;
            this.destroyed = false;

            this.throttle = 0;
            this.brake = 0;
            this.steer = 0;

            this.fuel =
                number(
                    options.fuel,
                    this.getFuelCapacity()
                );

            this.maxFuel =
                this.getFuelCapacity();

            this.distanceTravelled = 0;

            this.spawnX =
                this.x;

            this.spawnY =
                this.y;

            this.previousX =
                this.x;

            this.previousY =
                this.y;

            this.wheelRotation = 0;

            this.upgrades = {
                engine: 0,
                tires: 0,
                suspension: 0,
                fuel: 0
            };

            this.color =
                options.color ||
                "#ff6a00";

            this.initialized =
                false;
        }

        /* -----------------------------------------------------
           Initialization
           ----------------------------------------------------- */

        init() {
            this.initialized =
                true;

            this.maxFuel =
                this.getFuelCapacity();

            if (
                this.fuel <= 0
            ) {
                this.fuel =
                    this.maxFuel;
            }

            return this;
        }

        /* -----------------------------------------------------
           Position
           ----------------------------------------------------- */

        setPosition(x, y) {
            this.x =
                number(x, 0);

            this.y =
                number(y, 0);

            this.position.x =
                this.x;

            this.position.y =
                this.y;

            this.spawnX =
                this.x;

            this.spawnY =
                this.y;

            this.previousX =
                this.x;

            this.previousY =
                this.y;

            return this;
        }

        getPosition() {
            return {
                x: this.x,
                y: this.y
            };
        }

        /* -----------------------------------------------------
           Velocity
           ----------------------------------------------------- */

        setVelocity(x, y) {
            this.velocityX =
                number(x, 0);

            this.velocityY =
                number(y, 0);

            this.velocity.x =
                this.velocityX;

            this.velocity.y =
                this.velocityY;

            return this;
        }

        getSpeed() {
            return Math.sqrt(
                this.velocityX *
                this.velocityX +
                this.velocityY *
                this.velocityY
            );
        }

        getHorizontalSpeed() {
            return Math.abs(
                this.velocityX
            );
        }

        /* -----------------------------------------------------
           Stats
           ----------------------------------------------------- */

        getStat(name) {
            return number(
                this.stats[name],
                0
            );
        }

        setStat(name, value) {
            if (
                Object.prototype.hasOwnProperty.call(
                    this.stats,
                    name
                )
            ) {
                this.stats[name] =
                    clamp(
                        number(value, 0),
                        0,
                        100
                    );
            }

            return this;
        }

        getFuelCapacity() {
            const base =
                this.getStat(
                    "fuelCapacity"
                );

            return (
                30 +
                base * 0.7
            );
        }

        getMaxSpeed() {
            const speed =
                this.getStat(
                    "speed"
                );

            return (
                this.physics.maxSpeed *
                (
                    0.5 +
                    speed / 100 *
                    0.7
                )
            );
        }

        getAcceleration() {
            const acceleration =
                this.getStat(
                    "acceleration"
                );

            const torque =
                this.getStat(
                    "torque"
                );

            const weight =
                Math.max(
                    0.5,
                    this.getMass()
                );

            return (
                this.physics.acceleration *
                (
                    0.45 +
                    acceleration /
                    100 *
                    0.55
                ) *
                (
                    0.45 +
                    torque /
                    100 *
                    0.75
                ) /
                weight
            );
        }

        getMass() {
            const weight =
                this.getStat(
                    "weight"
                );

            return (
                0.8 +
                weight /
                100 *
                1.7
            );
        }

        getGrip() {
            return clamp(
                this.getStat("grip") /
                100,
                0.2,
                1.25
            );
        }

        getAirControl() {
            return (
                this.physics.airControl *
                (
                    0.35 +
                    this.getStat(
                        "airControl"
                    ) /
                    100 *
                    0.65
                )
            );
        }

        getStability() {
            return clamp(
                this.getStat(
                    "stability"
                ) /
                100,
                0,
                1
            );
        }

        /* -----------------------------------------------------
           Upgrades
           ----------------------------------------------------- */

        setUpgrade(
            type,
            level
        ) {
            if (
                !Object.prototype.hasOwnProperty.call(
                    this.upgrades,
                    type
                )
            ) {
                return this;
            }

            this.upgrades[type] =
                clamp(
                    Math.floor(
                        number(
                            level,
                            0
                        )
                    ),
                    0,
                    10
                );

            return this;
        }

        addUpgrade(type) {
            return this.setUpgrade(
                type,
                this.upgrades[type] + 1
            );
        }

        getUpgradeLevel(type) {
            return number(
                this.upgrades[type],
                0
            );
        }

        getUpgradeMultiplier(type) {
            const level =
                this.getUpgradeLevel(
                    type
                );

            return (
                1 +
                level * 0.08
            );
        }

        applyUpgradeStats() {
            const engine =
                this.getUpgradeMultiplier(
                    "engine"
                );

            const tires =
                this.getUpgradeMultiplier(
                    "tires"
                );

            const suspension =
                this.getUpgradeMultiplier(
                    "suspension"
                );

            const fuel =
                this.getUpgradeMultiplier(
                    "fuel"
                );

            this.runtimeStats = {
                acceleration:
                    this.getStat(
                        "acceleration"
                    ) *
                    engine,

                torque:
                    this.getStat(
                        "torque"
                    ) *
                    engine,

                grip:
                    this.getStat(
                        "grip"
                    ) *
                    tires,

                suspension:
                    this.getStat(
                        "suspension"
                    ) *
                    suspension,

                fuelCapacity:
                    this.getStat(
                        "fuelCapacity"
                    ) *
                    fuel
            };

            return this.runtimeStats;
        }

        /* -----------------------------------------------------
           Input
           ----------------------------------------------------- */

        setInput(
            throttle,
            brake,
            steer
        ) {
            this.throttle =
                clamp(
                    number(
                        throttle,
                        0
                    ),
                    0,
                    1
                );

            this.brake =
                clamp(
                    number(
                        brake,
                        0
                    ),
                    0,
                    1
                );

            this.steer =
                clamp(
                    number(
                        steer,
                        0
                    ),
                    -1,
                    1
                );

            return this;
        }

        readInput() {
            const input =
                window.HillboundInput ||
                window.Input;

            if (!input) {
                this.setInput(
                    0,
                    0,
                    0
                );

                return;
            }

            let throttle = 0;
            let brake = 0;
            let steer = 0;

            if (
                typeof input.getThrottle ===
                "function"
            ) {
                throttle =
                    input.getThrottle();
            } else if (
                Number.isFinite(
                    Number(
                        input.throttle
                    )
                )
            ) {
                throttle =
                    input.throttle;
            } else if (
                input.gas ||
                input.accelerate
            ) {
                throttle = 1;
            }

            if (
                typeof input.getBrake ===
                "function"
            ) {
                brake =
                    input.getBrake();
            } else if (
                Number.isFinite(
                    Number(
                        input.brake
                    )
                )
            ) {
                brake =
                    input.brake;
            } else if (
                input.reverse ||
                input.brakePressed
            ) {
                brake = 1;
            }

            if (
                typeof input.getSteer ===
                "function"
            ) {
                steer =
                    input.getSteer();
            } else if (
                Number.isFinite(
                    Number(
                        input.steer
                    )
                )
            ) {
                steer =
                    input.steer;
            }

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

            this.setInput(
                throttle,
                brake,
                steer
            );
        }

        /* -----------------------------------------------------
           Fuel
           ----------------------------------------------------- */

        getFuel() {
            return this.fuel;
        }

        getFuelPercentage() {
            if (
                this.maxFuel <= 0
            ) {
                return 0;
            }

            return clamp(
                this.fuel /
                this.maxFuel *
                100,
                0,
                100
            );
        }

        consumeFuel(amount) {
            this.fuel =
                Math.max(
                    0,
                    this.fuel -
                    Math.max(
                        0,
                        number(
                            amount,
                            0
                        )
                    )
                );

            return this.fuel;
        }

        addFuel(amount) {
            this.fuel =
                Math.min(
                    this.maxFuel,
                    this.fuel +
                    Math.max(
                        0,
                        number(
                            amount,
                            0
                        )
                    )
                );

            return this.fuel;
        }

        isOutOfFuel() {
            return (
                this.fuel <= 0
            );
        }

        /* -----------------------------------------------------
           Physics Hook
           ----------------------------------------------------- */

        update(
            dt,
            terrain
        ) {
            this.previousX =
                this.x;

            this.previousY =
                this.y;

            this.readInput();

            /*
             * The central physics system normally controls
             * movement. This fallback only runs if physics.js
             * is unavailable.
             */

            if (
                !window.Hillbound.Physics ||
                typeof Hillbound.Physics.update !==
                "function"
            ) {
                this.basicUpdate(
                    dt,
                    terrain
                );
            }

            this.position.x =
                this.x;

            this.position.y =
                this.y;

            this.velocity.x =
                this.velocityX;

            this.velocity.y =
                this.velocityY;

            this.distanceTravelled +=
                Math.max(
                    0,
                    this.x -
                    this.previousX
                );

            this.updateWheelRotation(
                dt
            );
        }

        /* -----------------------------------------------------
           Basic Fallback Physics
           ----------------------------------------------------- */

        basicUpdate(
            dt,
            terrain
        ) {
            dt =
                clamp(
                    number(
                        dt,
                        1 / 60
                    ),
                    0,
                    0.033
                );

            const gravity =
                1250;

            this.velocityY +=
                gravity *
                dt;

            if (
                this.throttle > 0
            ) {
                this.velocityX +=
                    this.getAcceleration() *
                    this.throttle *
                    dt;
            }

            if (
                this.brake > 0
            ) {
                this.velocityX -=
                    650 *
                    this.brake *
                    dt;
            }

            this.velocityX =
                clamp(
                    this.velocityX,
                    -260,
                    this.getMaxSpeed()
                );

            this.x +=
                this.velocityX *
                dt;

            this.y +=
                this.velocityY *
                dt;

            if (
                terrain &&
                typeof terrain.getHeight ===
                "function"
            ) {
                const terrainY =
                    terrain.getHeight(
                        this.x
                    );

                const bottom =
                    this.y +
                    this.size.height /
                    2;

                if (
                    bottom >=
                    terrainY
                ) {
                    this.y =
                        terrainY -
                        this.size.height /
                        2;

                    if (
                        this.velocityY > 0
                    ) {
                        this.velocityY = 0;
                    }

                    this.grounded =
                        true;

                    this.rotation =
                        this.rotation * 0.9;
                } else {
                    this.grounded =
                        false;
                }
            }
        }

        /* -----------------------------------------------------
           Wheel Rotation
           ----------------------------------------------------- */

        updateWheelRotation(
            dt
        ) {
            const speed =
                this.velocityX;

            this.wheelRotation +=
                speed *
                dt /
                20;
        }

        /* -----------------------------------------------------
           Crash State
           ----------------------------------------------------- */

        crash(reason) {
            if (
                this.crashed
            ) {
                return;
            }

            this.crashed =
                true;

            this.crashReason =
                reason ||
                "crash";

            if (
                typeof this.onCrash ===
                "function"
            ) {
                this.onCrash(
                    this.crashReason
                );
            }
        }

        destroy() {
            this.destroyed =
                true;

            this.crashed =
                true;
        }

        repair() {
            this.crashed =
                false;

            this.destroyed =
                false;

            this.crashReason =
                null;
        }

        /* -----------------------------------------------------
           Reset
           ----------------------------------------------------- */

        reset() {
            this.x =
                this.spawnX;

            this.y =
                this.spawnY;

            this.velocityX =
                0;

            this.velocityY =
                0;

            this.velocity.x =
                0;

            this.velocity.y =
                0;

            this.rotation =
                0;

            this.angularVelocity =
                0;

            this.throttle =
                0;

            this.brake =
                0;

            this.steer =
                0;

            this.grounded =
                false;

            this.crashed =
                false;

            this.destroyed =
                false;

            this.distanceTravelled =
                0;

            this.wheelRotation =
                0;

            this.maxFuel =
                this.getFuelCapacity();

            this.fuel =
                this.maxFuel;

            return this;
        }

        /* -----------------------------------------------------
           Drawing
           ----------------------------------------------------- */

        draw(ctx) {
            if (!ctx) {
                return;
            }

            /*
             * Vehicle-specific classes can override this
             * method. This provides a clean fallback until
             * custom vehicle artwork is connected.
             */

            ctx.save();

            ctx.translate(
                this.x,
                this.y
            );

            ctx.rotate(
                this.rotation
            );

            this.drawBody(
                ctx
            );

            this.drawWheels(
                ctx
            );

            ctx.restore();
        }

        drawBody(ctx) {
            const width =
                this.size.width;

            const height =
                this.size.height;

            ctx.fillStyle =
                this.color;

            ctx.beginPath();

            ctx.roundRect(
                -width / 2,
                -height / 2,
                width,
                height,
                8
            );

            ctx.fill();

            /*
             * Windows.
             */

            ctx.fillStyle =
                "rgba(20, 20, 20, 0.9)";

            ctx.beginPath();

            ctx.moveTo(
                -width * 0.25,
                -height * 0.48
            );

            ctx.lineTo(
                width * 0.08,
                -height * 0.48
            );

            ctx.lineTo(
                width * 0.23,
                -height * 0.05
            );

            ctx.lineTo(
                -width * 0.2,
                -height * 0.05
            );

            ctx.closePath();

            ctx.fill();
        }

        drawWheels(ctx) {
            const wheelRadius =
                Math.max(
                    8,
                    this.size.height *
                    0.32
                );

            const wheelOffset =
                this.size.width *
                0.31;

            this.drawWheel(
                ctx,
                -wheelOffset,
                this.size.height *
                0.45,
                wheelRadius
            );

            this.drawWheel(
                ctx,
                wheelOffset,
                this.size.height *
                0.45,
                wheelRadius
            );
        }

        drawWheel(
            ctx,
            x,
            y,
            radius
        ) {
            ctx.save();

            ctx.translate(
                x,
                y
            );

            ctx.rotate(
                this.wheelRotation
            );

            ctx.fillStyle =
                "#151515";

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.fillStyle =
                "#3a3a3a";

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                radius *
                0.42,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.strokeStyle =
                "#555555";

            ctx.lineWidth =
                2;

            ctx.beginPath();

            ctx.moveTo(
                -radius * 0.55,
                0
            );

            ctx.lineTo(
                radius * 0.55,
                0
            );

            ctx.moveTo(
                0,
                -radius * 0.55
            );

            ctx.lineTo(
                0,
                radius * 0.55
            );

            ctx.stroke();

            ctx.restore();
        }

        /* -----------------------------------------------------
           Serialization
           ----------------------------------------------------- */

        toJSON() {
            return {
                id:
                    this.id,

                name:
                    this.name,

                type:
                    this.type,

                stats:
                    clone(this.stats),

                physics:
                    clone(this.physics),

                upgrades:
                    clone(this.upgrades),

                fuel:
                    this.fuel,

                x:
                    this.x,

                y:
                    this.y,

                rotation:
                    this.rotation
            };
        }
    }

    /* ---------------------------------------------------------
       Vehicle Registry
       --------------------------------------------------------- */

    const registry = {};

    function register(
        id,
        definition
    ) {
        if (
            !id ||
            !definition
        ) {
            return false;
        }

        registry[id] =
            definition;

        return true;
    }

    function getDefinition(
        id
    ) {
        return registry[id] ||
            null;
    }

    function create(
        id,
        overrides
    ) {
        const definition =
            getDefinition(id);

        let options = {};

        if (
            definition
        ) {
            options =
                clone(
                    definition
                );
        }

        options =
            merge(
                options,
                overrides || {}
            );

        options.id =
            options.id ||
            id;

        const vehicle =
            new Vehicle(
                options
            );

        vehicle.init();

        return vehicle;
    }

    function has(id) {
        return Boolean(
            registry[id]
        );
    }

    function getAll() {
        return Object.keys(
            registry
        ).map(function (id) {
            return registry[id];
        });
    }

    /* ---------------------------------------------------------
       Default Starter Vehicles
       --------------------------------------------------------- */

    register(
        "starter-car",
        {
            id:
                "starter-car",

            name:
                "Starter Car",

            type:
                "car",

            description:
                "A balanced starter vehicle built for reliable climbs.",

            image:
                "assets/images/vehicles/cars/starter-car.png",

            color:
                "#ff6a00",

            stats: {
                speed: 55,
                acceleration: 55,
                weight: 50,
                torque: 55,
                grip: 55,
                suspension: 50,
                fuelCapacity: 55,
                airControl: 45,
                stability: 60
            },

            size: {
                width: 92,
                height: 44
            },

            physics: {
                maxSpeed: 850,
                acceleration: 420,
                braking: 650,
                reverseSpeed: 260,
                airControl: 2.2,
                rotationSpeed: 3.5
            }
        }
    );

    register(
        "starter-bike",
        {
            id:
                "starter-bike",

            name:
                "Starter Bike",

            type:
                "bike",

            description:
                "Light and agile with excellent air control.",

            image:
                "assets/images/vehicles/bikes/starter-bike.png",

            color:
                "#4da3ff",

            stats: {
                speed: 68,
                acceleration: 70,
                weight: 30,
                torque: 48,
                grip: 50,
                suspension: 55,
                fuelCapacity: 40,
                airControl: 82,
                stability: 38
            },

            size: {
                width: 72,
                height: 48
            },

            physics: {
                maxSpeed: 900,
                acceleration: 470,
                braking: 560,
                reverseSpeed: 220,
                airControl: 3.4,
                rotationSpeed: 4.2
            }
        }
    );

    register(
        "starter-truck",
        {
            id:
                "starter-truck",

            name:
                "Starter Truck",

            type:
                "truck",

            description:
                "Heavy, powerful, and built to handle difficult terrain.",

            image:
                "assets/images/vehicles/trucks/starter-truck.png",

            color:
                "#35c76f",

            stats: {
                speed: 42,
                acceleration: 42,
                weight: 82,
                torque: 85,
                grip: 72,
                suspension: 78,
                fuelCapacity: 78,
                airControl: 30,
                stability: 82
            },

            size: {
                width: 108,
                height: 52
            },

            physics: {
                maxSpeed: 760,
                acceleration: 390,
                braking: 760,
                reverseSpeed: 230,
                airControl: 1.6,
                rotationSpeed: 2.8
            }
        }
    );

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    VehicleSystem.Vehicle =
        Vehicle;

    VehicleSystem.create =
        create;

    VehicleSystem.register =
        register;

    VehicleSystem.get =
        getDefinition;

    VehicleSystem.has =
        has;

    VehicleSystem.getAll =
        getAll;

    VehicleSystem.defaults = {
        stats:
            clone(
                DEFAULT_STATS
            ),

        size:
            clone(
                DEFAULT_SIZE
            ),

        physics:
            clone(
                DEFAULT_PHYSICS
            )
    };

    /*
     * Compatibility aliases.
     *
     * game.js and future vehicle files can use either
     * Hillbound.Vehicle or HillboundVehicle.
     */

    window.HillboundVehicle =
        VehicleSystem;

    window.Vehicle =
        VehicleSystem;

})();
