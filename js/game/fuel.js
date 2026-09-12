/*
 * Hillbound
 * Fuel System
 * js/game/fuel.js
 *
 * Handles:
 * - Vehicle fuel
 * - Fuel consumption
 * - Fuel capacity
 * - Fuel pickups
 * - Fuel upgrades
 * - Low-fuel warnings
 * - Empty-fuel state
 * - HUD compatibility
 * - Save/restore support
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Fuel = {

        defaults: {
            consumptionRate: 0.18,
            idleConsumption: 0.015,

            lowFuelPercent: 0.25,
            criticalFuelPercent: 0.10,

            minimumFuel: 0,

            pickupAmount: 25,
            pickupMultiplier: 1,

            drainInAir: true,
            drainWhileBraking: false,
            drainWhilePaused: false
        },

        create(options) {
            options = options || {};

            const config = this.merge(
                this.defaults,
                options
            );

            return {
                amount: this.number(
                    options.amount,
                    0
                ),

                capacity: this.number(
                    options.capacity,
                    100
                ),

                consumptionRate:
                    this.number(
                        config.consumptionRate,
                        this.defaults.consumptionRate
                    ),

                idleConsumption:
                    this.number(
                        config.idleConsumption,
                        this.defaults.idleConsumption
                    ),

                lowFuelPercent:
                    this.number(
                        config.lowFuelPercent,
                        this.defaults.lowFuelPercent
                    ),

                criticalFuelPercent:
                    this.number(
                        config.criticalFuelPercent,
                        this.defaults.criticalFuelPercent
                    ),

                pickupAmount:
                    this.number(
                        config.pickupAmount,
                        this.defaults.pickupAmount
                    ),

                pickupMultiplier:
                    this.number(
                        config.pickupMultiplier,
                        1
                    ),

                drainInAir:
                    config.drainInAir !== false,

                drainWhileBraking:
                    !!config.drainWhileBraking,

                drainWhilePaused:
                    !!config.drainWhilePaused,

                empty: false,
                low: false,
                critical: false,

                enabled: true,
                paused: false,

                totalConsumed: 0,
                totalCollected: 0,

                lastConsumed: 0,
                lastCollected: 0,

                initialized: false
            };
        },

        merge(base, override) {
            const result = {};

            Object.keys(base).forEach(
                (key) => {
                    if (
                        base[key] &&
                        typeof base[key] === "object" &&
                        !Array.isArray(base[key])
                    ) {
                        result[key] = this.merge(
                            base[key],
                            override &&
                            override[key]
                                ? override[key]
                                : {}
                        );
                    } else {
                        result[key] =
                            override &&
                            override[key] !== undefined
                                ? override[key]
                                : base[key];
                    }
                }
            );

            if (override) {
                Object.keys(override).forEach(
                    (key) => {
                        if (
                            result[key] ===
                            undefined
                        ) {
                            result[key] =
                                override[key];
                        }
                    }
                );
            }

            return result;
        },

        number(value, fallback) {
            const parsed = Number(value);

            return Number.isFinite(parsed)
                ? parsed
                : fallback;
        },

        clamp(value, min, max) {
            return Math.max(
                min,
                Math.min(max, value)
            );
        },

        /*
         * Attach the fuel system to a vehicle.
         */
        attach(vehicle, options) {
            if (!vehicle) {
                return null;
            }

            options = options || {};

            const stats =
                vehicle.stats || {};

            const capacity =
                this.number(
                    options.capacity,
                    this.getVehicleCapacity(
                        vehicle
                    )
                );

            const fuel =
                this.create({
                    ...options,
                    capacity
                });

            /*
             * Start with a full tank unless an explicit amount
             * was supplied.
             */
            if (
                options.amount === undefined
            ) {
                fuel.amount = capacity;
            }

            fuel.amount =
                this.clamp(
                    fuel.amount,
                    0,
                    capacity
                );

            fuel.initialized = true;

            vehicle.fuelSystem = fuel;

            /*
             * Keep the vehicle's existing fuel fields
             * synchronized for compatibility.
             */
            vehicle.fuel = fuel.amount;
            vehicle.fuelCapacity = capacity;

            this.updateState(
                vehicle,
                fuel
            );

            return fuel;
        },

        ensure(vehicle) {
            if (!vehicle) {
                return null;
            }

            if (
                vehicle.fuelSystem
            ) {
                return vehicle.fuelSystem;
            }

            return this.attach(
                vehicle
            );
        },

        getVehicleCapacity(vehicle) {
            if (!vehicle) {
                return 100;
            }

            if (
                vehicle.fuelSystem &&
                vehicle.fuelSystem.capacity
            ) {
                return this.number(
                    vehicle.fuelSystem.capacity,
                    100
                );
            }

            const stats =
                vehicle.stats || {};

            /*
             * Vehicle.js uses fuelCapacity as a stat.
             * Its values are generally 0–100, so use that as
             * the base capacity.
             */
            if (
                stats.fuelCapacity !== undefined
            ) {
                return Math.max(
                    1,
                    this.number(
                        stats.fuelCapacity,
                        100
                    )
                );
            }

            if (
                vehicle.fuelCapacity !== undefined
            ) {
                return Math.max(
                    1,
                    this.number(
                        vehicle.fuelCapacity,
                        100
                    )
                );
            }

            return 100;
        },

        getAmount(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return 0;
            }

            return fuel.amount;
        },

        getCapacity(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return 0;
            }

            return fuel.capacity;
        },

        getPercent(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (!fuel || fuel.capacity <= 0) {
                return 0;
            }

            return this.clamp(
                fuel.amount /
                fuel.capacity,
                0,
                1
            );
        },

        /*
         * Consume fuel directly.
         */
        consume(vehicle, amount) {
            if (!vehicle) {
                return 0;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel || !fuel.enabled) {
                return 0;
            }

            amount = Math.max(
                0,
                this.number(amount, 0)
            );

            if (amount <= 0) {
                return 0;
            }

            const previous =
                fuel.amount;

            fuel.amount =
                this.clamp(
                    fuel.amount - amount,
                    0,
                    fuel.capacity
                );

            const consumed =
                previous - fuel.amount;

            fuel.lastConsumed =
                consumed;

            fuel.totalConsumed +=
                consumed;

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );

            return consumed;
        },

        /*
         * Refuel the vehicle.
         */
        add(vehicle, amount) {
            if (!vehicle) {
                return 0;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return 0;
            }

            amount = Math.max(
                0,
                this.number(amount, 0)
            );

            if (amount <= 0) {
                return 0;
            }

            const previous =
                fuel.amount;

            fuel.amount =
                this.clamp(
                    fuel.amount + amount,
                    0,
                    fuel.capacity
                );

            const added =
                fuel.amount - previous;

            fuel.lastCollected =
                added;

            fuel.totalCollected +=
                added;

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );

            return added;
        },

        /*
         * Fill the tank completely.
         */
        fill(vehicle) {
            if (!vehicle) {
                return 0;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return 0;
            }

            return this.add(
                vehicle,
                fuel.capacity -
                fuel.amount
            );
        },

        /*
         * Consume fuel based on vehicle movement.
         */
        update(vehicle, dt, options) {
            if (!vehicle) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel || !fuel.enabled) {
                return;
            }

            options = options || {};

            const delta =
                Math.max(
                    0,
                    this.number(
                        dt,
                        1 / 60
                    )
                );

            if (
                fuel.paused &&
                !fuel.drainWhilePaused
            ) {
                this.updateState(
                    vehicle,
                    fuel
                );

                return;
            }

            if (
                vehicle.crashed ||
                vehicle.destroyed
            ) {
                this.updateState(
                    vehicle,
                    fuel
                );

                return;
            }

            const input =
                this.getVehicleInput();

            let consumption = 0;

            /*
             * Main engine consumption.
             */
            const throttle =
                this.getThrottle(
                    input
                );

            if (throttle > 0) {
                consumption +=
                    fuel.consumptionRate *
                    throttle *
                    delta;
            }

            /*
             * Small idle drain keeps the fuel system
             * meaningful even when the engine is running.
             */
            if (
                options.engineRunning !== false &&
                throttle <= 0
            ) {
                consumption +=
                    fuel.idleConsumption *
                    delta;
            }

            /*
             * Braking normally doesn't consume fuel.
             * This can be changed through configuration.
             */
            if (
                input.brake &&
                !fuel.drainWhileBraking
            ) {
                /*
                 * Nothing extra to add.
                 */
            }

            /*
             * Airborne engine consumption can be disabled
             * through the configuration.
             */
            if (
                vehicle.grounded === false &&
                !fuel.drainInAir
            ) {
                consumption = 0;
            }

            /*
             * Optional multiplier supplied by game systems.
             */
            if (
                options.multiplier !== undefined
            ) {
                consumption *=
                    Math.max(
                        0,
                        this.number(
                            options.multiplier,
                            1
                        )
                    );
            }

            this.consume(
                vehicle,
                consumption
            );
        },

        getVehicleInput() {
            const input =
                window.Hillbound &&
                window.Hillbound.Input;

            if (
                input &&
                typeof input.getVehicleInput ===
                "function"
            ) {
                return input.getVehicleInput();
            }

            if (
                window.HillboundInput &&
                typeof window.HillboundInput.get ===
                "function"
            ) {
                return window.HillboundInput.get();
            }

            return {
                gas: 0,
                brake: 0,
                throttle: 0
            };
        },

        getThrottle(input) {
            if (!input) {
                return 0;
            }

            if (
                input.throttle !== undefined
            ) {
                return this.clamp(
                    this.number(
                        input.throttle,
                        0
                    ),
                    0,
                    1
                );
            }

            if (
                input.gas !== undefined
            ) {
                return this.clamp(
                    this.number(
                        input.gas,
                        0
                    ),
                    0,
                    1
                );
            }

            return 0;
        },

        updateState(vehicle, fuel) {
            if (!fuel) {
                return;
            }

            const percent =
                fuel.capacity > 0
                    ? fuel.amount /
                      fuel.capacity
                    : 0;

            fuel.empty =
                fuel.amount <=
                this.defaults.minimumFuel;

            fuel.low =
                percent <=
                fuel.lowFuelPercent;

            fuel.critical =
                percent <=
                fuel.criticalFuelPercent;

            if (vehicle) {
                vehicle.fuel =
                    fuel.amount;

                vehicle.fuelCapacity =
                    fuel.capacity;
            }
        },

        isEmpty(vehicle) {
            const fuel =
                this.ensure(vehicle);

            return !fuel ||
                fuel.empty;
        },

        isLow(vehicle) {
            const fuel =
                this.ensure(vehicle);

            return !!(
                fuel &&
                fuel.low
            );
        },

        isCritical(vehicle) {
            const fuel =
                this.ensure(vehicle);

            return !!(
                fuel &&
                fuel.critical
            );
        },

        canDrive(vehicle) {
            return !this.isEmpty(
                vehicle
            );
        },

        setAmount(vehicle, amount) {
            if (!vehicle) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            fuel.amount =
                this.clamp(
                    this.number(
                        amount,
                        fuel.amount
                    ),
                    0,
                    fuel.capacity
                );

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );
        },

        setCapacity(vehicle, capacity) {
            if (!vehicle) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            capacity =
                Math.max(
                    1,
                    this.number(
                        capacity,
                        fuel.capacity
                    )
                );

            fuel.capacity =
                capacity;

            if (
                fuel.amount >
                capacity
            ) {
                fuel.amount =
                    capacity;
            }

            vehicle.fuelCapacity =
                capacity;

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );
        },

        /*
         * Applies a fuel upgrade.
         *
         * upgradeLevel is expected to be a positive integer.
         */
        applyUpgrade(
            vehicle,
            upgradeLevel,
            amountPerLevel
        ) {
            if (!vehicle) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            upgradeLevel =
                Math.max(
                    0,
                    this.number(
                        upgradeLevel,
                        0
                    )
                );

            amountPerLevel =
                Math.max(
                    0,
                    this.number(
                        amountPerLevel,
                        5
                    )
                );

            const baseCapacity =
                this.getBaseCapacity(
                    vehicle
                );

            const newCapacity =
                baseCapacity +
                upgradeLevel *
                amountPerLevel;

            const previousCapacity =
                fuel.capacity;

            fuel.capacity =
                Math.max(
                    1,
                    newCapacity
                );

            /*
             * Preserve the same fuel percentage when the tank
             * becomes larger.
             */
            if (
                previousCapacity > 0
            ) {
                const percentage =
                    fuel.amount /
                    previousCapacity;

                fuel.amount =
                    this.clamp(
                        percentage *
                        fuel.capacity,
                        0,
                        fuel.capacity
                    );
            }

            vehicle.fuelCapacity =
                fuel.capacity;

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );
        },

        getBaseCapacity(vehicle) {
            if (!vehicle) {
                return 100;
            }

            const stats =
                vehicle.stats || {};

            if (
                stats.fuelCapacity !==
                undefined
            ) {
                return Math.max(
                    1,
                    this.number(
                        stats.fuelCapacity,
                        100
                    )
                );
            }

            return 100;
        },

        /*
         * Fuel pickup helper.
         */
        collectPickup(
            vehicle,
            amount
        ) {
            amount =
                amount !== undefined
                    ? amount
                    : this.defaults.pickupAmount;

            amount *=
                this.defaults.pickupMultiplier;

            const added =
                this.add(
                    vehicle,
                    amount
                );

            if (added > 0) {
                this.emitPickup(
                    vehicle,
                    added
                );
            }

            return added;
        },

        emitPickup(vehicle, amount) {
            try {
                if (
                    window.Hillbound &&
                    typeof window.Hillbound.emit ===
                    "function"
                ) {
                    window.Hillbound.emit(
                        "fuelCollected",
                        {
                            vehicle,
                            amount
                        }
                    );
                }

                window.dispatchEvent(
                    new CustomEvent(
                        "hillboundfuelcollected",
                        {
                            detail: {
                                vehicle,
                                amount
                            }
                        }
                    )
                );
            } catch (error) {
                /*
                 * Event notifications are optional and should
                 * never interrupt gameplay.
                 */
            }
        },

        /*
         * Configure the fuel system globally for a vehicle.
         */
        configure(vehicle, options) {
            if (!vehicle || !options) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            if (
                options.consumptionRate !==
                undefined
            ) {
                fuel.consumptionRate =
                    Math.max(
                        0,
                        this.number(
                            options.consumptionRate,
                            fuel.consumptionRate
                        )
                    );
            }

            if (
                options.idleConsumption !==
                undefined
            ) {
                fuel.idleConsumption =
                    Math.max(
                        0,
                        this.number(
                            options.idleConsumption,
                            fuel.idleConsumption
                        )
                    );
            }

            if (
                options.lowFuelPercent !==
                undefined
            ) {
                fuel.lowFuelPercent =
                    this.clamp(
                        this.number(
                            options.lowFuelPercent,
                            fuel.lowFuelPercent
                        ),
                        0,
                        1
                    );
            }

            if (
                options.criticalFuelPercent !==
                undefined
            ) {
                fuel.criticalFuelPercent =
                    this.clamp(
                        this.number(
                            options.criticalFuelPercent,
                            fuel.criticalFuelPercent
                        ),
                        0,
                        1
                    );
            }

            if (
                options.drainInAir !==
                undefined
            ) {
                fuel.drainInAir =
                    !!options.drainInAir;
            }

            if (
                options.drainWhileBraking !==
                undefined
            ) {
                fuel.drainWhileBraking =
                    !!options.drainWhileBraking;
            }

            if (
                options.drainWhilePaused !==
                undefined
            ) {
                fuel.drainWhilePaused =
                    !!options.drainWhilePaused;
            }

            this.updateState(
                vehicle,
                fuel
            );
        },

        pause(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (fuel) {
                fuel.paused = true;
            }
        },

        resume(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (fuel) {
                fuel.paused = false;
            }
        },

        reset(vehicle, fullTank) {
            if (!vehicle) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            if (fullTank !== false) {
                fuel.amount =
                    fuel.capacity;
            }

            fuel.empty = false;
            fuel.low = false;
            fuel.critical = false;

            fuel.totalConsumed = 0;
            fuel.totalCollected = 0;

            fuel.lastConsumed = 0;
            fuel.lastCollected = 0;

            fuel.paused = false;

            vehicle.fuel =
                fuel.amount;

            this.updateState(
                vehicle,
                fuel
            );
        },

        serialize(vehicle) {
            if (!vehicle) {
                return null;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return null;
            }

            return {
                amount: fuel.amount,
                capacity: fuel.capacity,

                totalConsumed:
                    fuel.totalConsumed,

                totalCollected:
                    fuel.totalCollected,

                empty: fuel.empty,
                low: fuel.low,
                critical: fuel.critical
            };
        },

        restore(vehicle, data) {
            if (
                !vehicle ||
                !data
            ) {
                return;
            }

            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return;
            }

            if (
                data.capacity !==
                undefined
            ) {
                fuel.capacity =
                    Math.max(
                        1,
                        this.number(
                            data.capacity,
                            fuel.capacity
                        )
                    );
            }

            if (
                data.amount !==
                undefined
            ) {
                fuel.amount =
                    this.clamp(
                        this.number(
                            data.amount,
                            fuel.amount
                        ),
                        0,
                        fuel.capacity
                    );
            }

            if (
                data.totalConsumed !==
                undefined
            ) {
                fuel.totalConsumed =
                    Math.max(
                        0,
                        this.number(
                            data.totalConsumed,
                            0
                        )
                    );
            }

            if (
                data.totalCollected !==
                undefined
            ) {
                fuel.totalCollected =
                    Math.max(
                        0,
                        this.number(
                            data.totalCollected,
                            0
                        )
                    );
            }

            vehicle.fuel =
                fuel.amount;

            vehicle.fuelCapacity =
                fuel.capacity;

            this.updateState(
                vehicle,
                fuel
            );
        },

        /*
         * HUD-friendly data.
         */
        getHUDData(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return {
                    amount: 0,
                    capacity: 0,
                    percent: 0,
                    empty: true,
                    low: false,
                    critical: false
                };
            }

            return {
                amount: fuel.amount,
                capacity: fuel.capacity,

                percent:
                    this.getPercent(
                        vehicle
                    ),

                empty:
                    fuel.empty,

                low:
                    fuel.low,

                critical:
                    fuel.critical
            };
        },

        debug(vehicle) {
            const fuel =
                this.ensure(vehicle);

            if (!fuel) {
                return null;
            }

            return {
                amount:
                    fuel.amount,

                capacity:
                    fuel.capacity,

                percent:
                    this.getPercent(
                        vehicle
                    ),

                empty:
                    fuel.empty,

                low:
                    fuel.low,

                critical:
                    fuel.critical,

                consumptionRate:
                    fuel.consumptionRate,

                totalConsumed:
                    fuel.totalConsumed,

                totalCollected:
                    fuel.totalCollected
            };
        }
    };

    /*
     * Compatibility aliases.
     */
    window.Hillbound.Fuel = Fuel;
    window.HillboundFuel = Fuel;
    window.Fuel = Fuel;

})();