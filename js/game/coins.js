/*
 * Hillbound
 * Coin System
 * js/game/coins.js
 *
 * Handles:
 * - Coins collected during a run
 * - Coin pickups
 * - Pickup spawning
 * - Collection detection
 * - Coin totals
 * - Run/session coin tracking
 * - Save/restore support
 * - HUD compatibility
 * - Future coin multipliers
 */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Coins = {

        defaults: {
            pickupValue: 1,
            pickupRadius: 22,
            collectDistance: 34,

            spawnSpacing: 220,
            spawnChance: 0.7,

            multiplier: 1,

            maxPickups: 250,

            magnetEnabled: false,
            magnetRadius: 100,

            autoCollect: true
        },

        create(options) {
            options = options || {};

            const config = this.merge(
                this.defaults,
                options
            );

            return {
                runCoins: 0,
                totalCoins: 0,

                collectedThisRun: 0,

                multiplier:
                    Math.max(
                        0,
                        this.number(
                            config.multiplier,
                            1
                        )
                    ),

                pickupValue:
                    Math.max(
                        1,
                        this.number(
                            config.pickupValue,
                            1
                        )
                    ),

                pickupRadius:
                    Math.max(
                        1,
                        this.number(
                            config.pickupRadius,
                            22
                        )
                    ),

                collectDistance:
                    Math.max(
                        1,
                        this.number(
                            config.collectDistance,
                            34
                        )
                    ),

                spawnSpacing:
                    Math.max(
                        1,
                        this.number(
                            config.spawnSpacing,
                            220
                        )
                    ),

                spawnChance:
                    this.clamp(
                        this.number(
                            config.spawnChance,
                            0.7
                        ),
                        0,
                        1
                    ),

                maxPickups:
                    Math.max(
                        1,
                        Math.floor(
                            this.number(
                                config.maxPickups,
                                250
                            )
                        )
                    ),

                magnetEnabled:
                    !!config.magnetEnabled,

                magnetRadius:
                    Math.max(
                        1,
                        this.number(
                            config.magnetRadius,
                            100
                        )
                    ),

                autoCollect:
                    config.autoCollect !== false,

                pickups: [],

                nextPickupId: 1,

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
            const parsed =
                Number(value);

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

        distance(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;

            return Math.sqrt(
                dx * dx +
                dy * dy
            );
        },

        /*
         * Attach a coin system to the current game/run.
         */
        attach(game, options) {
            options = options || {};

            const coins =
                this.create(options);

            coins.initialized = true;

            if (game) {
                game.coinsSystem =
                    coins;

                /*
                 * Keep the simple game.coins value synchronized
                 * for compatibility with game.js.
                 */
                if (
                    game.coins === undefined
                ) {
                    game.coins = 0;
                }
            }

            return coins;
        },

        ensure(game) {
            if (!game) {
                return null;
            }

            if (
                game.coinsSystem
            ) {
                return game.coinsSystem;
            }

            return this.attach(
                game
            );
        },

        /*
         * Start a fresh run.
         */
        startRun(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.runCoins = 0;
            coins.collectedThisRun = 0;
            coins.lastCollected = 0;

            coins.pickups = [];
            coins.nextPickupId = 1;

            this.syncGame(
                game,
                coins
            );
        },

        /*
         * End the current run and return its coin total.
         */
        endRun(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return 0;
            }

            return coins.runCoins;
        },

        /*
         * Add coins to the player's current run.
         */
        add(game, amount) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return 0;
            }

            amount = Math.max(
                0,
                this.number(
                    amount,
                    0
                )
            );

            if (amount <= 0) {
                return 0;
            }

            const multiplier =
                Math.max(
                    0,
                    coins.multiplier
                );

            const finalAmount =
                Math.max(
                    0,
                    Math.floor(
                        amount *
                        multiplier
                    )
                );

            if (finalAmount <= 0) {
                return 0;
            }

            coins.runCoins +=
                finalAmount;

            coins.totalCoins +=
                finalAmount;

            coins.collectedThisRun +=
                finalAmount;

            coins.lastCollected =
                finalAmount;

            this.syncGame(
                game,
                coins
            );

            this.emitCollected(
                game,
                finalAmount
            );

            return finalAmount;
        },

        /*
         * Remove coins if a future game feature requires it.
         */
        remove(game, amount) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return 0;
            }

            amount = Math.max(
                0,
                Math.floor(
                    this.number(
                        amount,
                        0
                    )
                )
            );

            const removed =
                Math.min(
                    amount,
                    coins.runCoins
                );

            coins.runCoins -=
                removed;

            this.syncGame(
                game,
                coins
            );

            return removed;
        },

        getRunCoins(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.runCoins
                : 0;
        },

        getTotalCoins(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.totalCoins
                : 0;
        },

        setRunCoins(game, amount) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.runCoins =
                Math.max(
                    0,
                    Math.floor(
                        this.number(
                            amount,
                            0
                        )
                    )
                );

            this.syncGame(
                game,
                coins
            );
        },

        setTotalCoins(game, amount) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.totalCoins =
                Math.max(
                    0,
                    Math.floor(
                        this.number(
                            amount,
                            0
                        )
                    )
                );

            this.syncGame(
                game,
                coins
            );
        },

        /*
         * Create a coin pickup in world space.
         */
        spawn(game, x, y, options) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return null;
            }

            if (
                coins.pickups.length >=
                coins.maxPickups
            ) {
                return null;
            }

            options = options || {};

            const pickup = {
                id:
                    options.id ||
                    coins.nextPickupId++,

                type:
                    options.type ||
                    "coin",

                x:
                    this.number(
                        x,
                        0
                    ),

                y:
                    this.number(
                        y,
                        0
                    ),

                value:
                    Math.max(
                        1,
                        Math.floor(
                            this.number(
                                options.value,
                                coins.pickupValue
                            )
                        )
                    ),

                radius:
                    Math.max(
                        1,
                        this.number(
                            options.radius,
                            coins.pickupRadius
                        )
                    ),

                collected: false,

                animation:
                    this.number(
                        options.animation,
                        Math.random() *
                        Math.PI *
                        2
                    ),

                rotation:
                    this.number(
                        options.rotation,
                        0
                    ),

                scale:
                    this.number(
                        options.scale,
                        1
                    )
            };

            coins.pickups.push(
                pickup
            );

            return pickup;
        },

        /*
         * Spawn several coins in a simple line.
         * Useful for ramps, hills, jumps, and map features.
         */
        spawnLine(
            game,
            startX,
            startY,
            count,
            spacing,
            options
        ) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return [];
            }

            count = Math.max(
                0,
                Math.floor(
                    this.number(
                        count,
                        0
                    )
                )
            );

            spacing =
                Math.max(
                    1,
                    this.number(
                        spacing,
                        coins.spawnSpacing
                    )
                );

            options = options || {};

            const spawned = [];

            for (
                let i = 0;
                i < count;
                i++
            ) {
                const pickup =
                    this.spawn(
                        game,
                        startX +
                            i * spacing,
                        startY,
                        options
                    );

                if (pickup) {
                    spawned.push(
                        pickup
                    );
                }
            }

            return spawned;
        },

        /*
         * Spawn an arc of coins for jumps.
         */
        spawnArc(
            game,
            centerX,
            centerY,
            radius,
            count,
            startAngle,
            endAngle,
            options
        ) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return [];
            }

            radius =
                Math.max(
                    1,
                    this.number(
                        radius,
                        100
                    )
                );

            count =
                Math.max(
                    1,
                    Math.floor(
                        this.number(
                            count,
                            5
                        )
                    )
                );

            startAngle =
                this.number(
                    startAngle,
                    Math.PI
                );

            endAngle =
                this.number(
                    endAngle,
                    0
                );

            const spawned = [];

            for (
                let i = 0;
                i < count;
                i++
            ) {
                const t =
                    count === 1
                        ? 0.5
                        : i /
                          (count - 1);

                const angle =
                    startAngle +
                    (endAngle -
                        startAngle) *
                    t;

                const x =
                    centerX +
                    Math.cos(angle) *
                    radius;

                const y =
                    centerY +
                    Math.sin(angle) *
                    radius;

                const pickup =
                    this.spawn(
                        game,
                        x,
                        y,
                        options
                    );

                if (pickup) {
                    spawned.push(
                        pickup
                    );
                }
            }

            return spawned;
        },

        /*
         * Generate coins ahead of the player.
         *
         * This is intentionally simple so maps can eventually
         * provide their own collectible layouts.
         */
        generateAhead(
            game,
            startX,
            endX,
            terrain,
            options
        ) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return [];
            }

            options = options || {};

            startX =
                this.number(
                    startX,
                    0
                );

            endX =
                this.number(
                    endX,
                    startX
                );

            const spacing =
                Math.max(
                    1,
                    this.number(
                        options.spacing,
                        coins.spawnSpacing
                    )
                );

            const chance =
                this.clamp(
                    this.number(
                        options.chance,
                        coins.spawnChance
                    ),
                    0,
                    1
                );

            const heightOffset =
                this.number(
                    options.heightOffset,
                    -55
                );

            const spawned = [];

            for (
                let x = startX;
                x <= endX;
                x += spacing
            ) {
                if (
                    Math.random() >
                    chance
                ) {
                    continue;
                }

                let y =
                    this.number(
                        options.y,
                        0
                    );

                if (
                    terrain &&
                    window.Hillbound &&
                    window.Hillbound.Terrain &&
                    typeof window.Hillbound.Terrain
                        .getHeight ===
                        "function"
                ) {
                    y =
                        window.Hillbound.Terrain
                            .getHeight(
                                terrain,
                                x
                            ) +
                        heightOffset;
                }

                const pickup =
                    this.spawn(
                        game,
                        x,
                        y,
                        options
                    );

                if (pickup) {
                    spawned.push(
                        pickup
                    );
                }
            }

            return spawned;
        },

        /*
         * Update all pickups.
         */
        update(game, vehicle, dt) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            const delta =
                Math.max(
                    0,
                    this.number(
                        dt,
                        1 / 60
                    )
                );

            coins.pickups.forEach(
                (pickup) => {
                    if (
                        pickup.collected
                    ) {
                        return;
                    }

                    pickup.animation +=
                        delta * 4;

                    pickup.rotation +=
                        delta * 2;

                    if (
                        vehicle &&
                        coins.autoCollect
                    ) {
                        this.checkPickup(
                            game,
                            vehicle,
                            pickup
                        );
                    }
                }
            );

            /*
             * Remove collected pickups after updating them.
             */
            coins.pickups =
                coins.pickups.filter(
                    (pickup) =>
                        !pickup.collected
                );
        },

        /*
         * Check a vehicle against one pickup.
         */
        checkPickup(
            game,
            vehicle,
            pickup
        ) {
            if (
                !vehicle ||
                !pickup ||
                pickup.collected
            ) {
                return false;
            }

            const vehicleX =
                this.number(
                    vehicle.x,
                    0
                );

            const vehicleY =
                this.number(
                    vehicle.y,
                    0
                );

            let pickupX =
                pickup.x;

            let pickupY =
                pickup.y;

            /*
             * Optional magnet effect.
             */
            if (
                this.isMagnetActive(
                    game
                )
            ) {
                const distance =
                    this.distance(
                        vehicleX,
                        vehicleY,
                        pickupX,
                        pickupY
                    );

                if (
                    distance <=
                    this.getMagnetRadius(
                        game
                    )
                ) {
                    const pull =
                        1 -
                        distance /
                        this.getMagnetRadius(
                            game
                        );

                    pickupX =
                        this.lerp(
                            pickupX,
                            vehicleX,
                            pull * 0.15
                        );

                    pickupY =
                        this.lerp(
                            pickupY,
                            vehicleY,
                            pull * 0.15
                        );

                    pickup.x =
                        pickupX;

                    pickup.y =
                        pickupY;
                }
            }

            const distance =
                this.distance(
                    vehicleX,
                    vehicleY,
                    pickupX,
                    pickupY
                );

            const vehicleRadius =
                this.getVehicleRadius(
                    vehicle
                );

            const collectionDistance =
                Math.max(
                    pickup.radius,
                    vehicleRadius,
                    this.getCollectDistance(
                        game
                    )
                );

            if (
                distance <=
                collectionDistance
            ) {
                return this.collect(
                    game,
                    pickup
                );
            }

            return false;
        },

        getVehicleRadius(vehicle) {
            if (!vehicle) {
                return 20;
            }

            if (
                vehicle.size
            ) {
                const width =
                    this.number(
                        vehicle.size.width,
                        40
                    );

                const height =
                    this.number(
                        vehicle.size.height,
                        30
                    );

                return Math.max(
                    width,
                    height
                ) * 0.35;
            }

            return 20;
        },

        getCollectDistance(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.collectDistance
                : this.defaults.collectDistance;
        },

        /*
         * Collect a specific pickup.
         */
        collect(game, pickup) {
            const coins =
                this.ensure(game);

            if (
                !coins ||
                !pickup ||
                pickup.collected
            ) {
                return false;
            }

            pickup.collected = true;

            const amount =
                this.add(
                    game,
                    pickup.value
                );

            pickup.collectedAmount =
                amount;

            return amount > 0;
        },

        collectNearest(
            game,
            vehicle,
            radius
        ) {
            const coins =
                this.ensure(game);

            if (
                !coins ||
                !vehicle
            ) {
                return 0;
            }

            radius =
                Math.max(
                    0,
                    this.number(
                        radius,
                        coins.collectDistance
                    )
                );

            let nearest = null;
            let nearestDistance =
                Infinity;

            coins.pickups.forEach(
                (pickup) => {
                    if (
                        pickup.collected
                    ) {
                        return;
                    }

                    const distance =
                        this.distance(
                            vehicle.x,
                            vehicle.y,
                            pickup.x,
                            pickup.y
                        );

                    if (
                        distance <=
                        radius &&
                        distance <
                        nearestDistance
                    ) {
                        nearest =
                            pickup;

                        nearestDistance =
                            distance;
                    }
                }
            );

            if (!nearest) {
                return 0;
            }

            this.collect(
                game,
                nearest
            );

            return nearest.value;
        },

        /*
         * Remove all pickups.
         */
        clearPickups(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.pickups = [];
        },

        /*
         * Remove pickups outside a world range.
         */
        removeBehind(game, minX) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            minX =
                this.number(
                    minX,
                    -Infinity
                );

            coins.pickups =
                coins.pickups.filter(
                    (pickup) =>
                        pickup.x >= minX
                );
        },

        /*
         * Magnet functionality for future upgrades.
         */
        enableMagnet(game, radius) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.magnetEnabled =
                true;

            if (
                radius !== undefined
            ) {
                coins.magnetRadius =
                    Math.max(
                        1,
                        this.number(
                            radius,
                            coins.magnetRadius
                        )
                    );
            }
        },

        disableMagnet(game) {
            const coins =
                this.ensure(game);

            if (coins) {
                coins.magnetEnabled =
                    false;
            }
        },

        isMagnetActive(game) {
            const coins =
                this.ensure(game);

            return !!(
                coins &&
                coins.magnetEnabled
            );
        },

        getMagnetRadius(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.magnetRadius
                : this.defaults.magnetRadius;
        },

        /*
         * Coin multiplier.
         */
        setMultiplier(game, multiplier) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.multiplier =
                Math.max(
                    0,
                    this.number(
                        multiplier,
                        1
                    )
                );
        },

        getMultiplier(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.multiplier
                : 1;
        },

        /*
         * Synchronize with the simple values expected by the
         * main game controller and HUD.
         */
        syncGame(game, coins) {
            if (!game || !coins) {
                return;
            }

            game.coins =
                coins.runCoins;

            game.runCoins =
                coins.runCoins;

            game.totalCoins =
                coins.totalCoins;
        },

        /*
         * Send a collection event for HUD, effects, sound,
         * achievements, and future analytics.
         */
        emitCollected(game, amount) {
            const detail = {
                amount,
                game
            };

            try {
                if (
                    window.Hillbound &&
                    typeof window.Hillbound.emit ===
                    "function"
                ) {
                    window.Hillbound.emit(
                        "coinCollected",
                        detail
                    );
                }

                window.dispatchEvent(
                    new CustomEvent(
                        "hillboundcoincollected",
                        {
                            detail
                        }
                    )
                );
            } catch (error) {
                /*
                 * Event support is optional.
                 */
            }
        },

        /*
         * Draw pickups using simple Canvas shapes.
         * The final art can later replace this with
         * assets/images/collectibles/coin.png.
         */
        draw(ctx, game, camera) {
            const coins =
                this.ensure(game);

            if (
                !ctx ||
                !coins
            ) {
                return;
            }

            coins.pickups.forEach(
                (pickup) => {
                    if (
                        pickup.collected
                    ) {
                        return;
                    }

                    let x =
                        pickup.x;

                    let y =
                        pickup.y;

                    /*
                     * If a camera is supplied, convert world
                     * coordinates to screen coordinates.
                     */
                    if (
                        camera &&
                        window.Hillbound &&
                        window.Hillbound.Camera
                    ) {
                        const point =
                            window.Hillbound.Camera
                                .worldToScreen(
                                    camera,
                                    pickup.x,
                                    pickup.y
                                );

                        x = point.x;
                        y = point.y;
                    }

                    const pulse =
                        1 +
                        Math.sin(
                            pickup.animation
                        ) *
                        0.08;

                    const radius =
                        pickup.radius *
                        pickup.scale *
                        pulse;

                    ctx.save();

                    ctx.translate(
                        x,
                        y
                    );

                    ctx.rotate(
                        Math.sin(
                            pickup.rotation
                        ) * 0.12
                    );

                    /*
                     * Gold coin.
                     */
                    ctx.beginPath();

                    ctx.arc(
                        0,
                        0,
                        radius,
                        0,
                        Math.PI * 2
                    );

                    ctx.fillStyle =
                        "#ffb300";

                    ctx.fill();

                    /*
                     * Inner highlight.
                     */
                    ctx.beginPath();

                    ctx.arc(
                        0,
                        0,
                        radius * 0.68,
                        0,
                        Math.PI * 2
                    );

                    ctx.strokeStyle =
                        "#ffe082";

                    ctx.lineWidth =
                        Math.max(
                            2,
                            radius * 0.12
                        );

                    ctx.stroke();

                    /*
                     * Simple coin symbol.
                     */
                    ctx.fillStyle =
                        "#8a5a00";

                    ctx.font =
                        `bold ${Math.max(
                            8,
                            radius
                        )}px Inter, Arial, sans-serif`;

                    ctx.textAlign =
                        "center";

                    ctx.textBaseline =
                        "middle";

                    ctx.fillText(
                        "$",
                        0,
                        1
                    );

                    ctx.restore();
                }
            );
        },

        /*
         * Get all currently active pickups.
         */
        getPickups(game) {
            const coins =
                this.ensure(game);

            return coins
                ? coins.pickups
                : [];
        },

        /*
         * Serialize run coin state.
         */
        serialize(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return null;
            }

            return {
                runCoins:
                    coins.runCoins,

                totalCoins:
                    coins.totalCoins,

                collectedThisRun:
                    coins.collectedThisRun,

                multiplier:
                    coins.multiplier
            };
        },

        /*
         * Restore coin state.
         */
        restore(game, data) {
            if (
                !game ||
                !data
            ) {
                return;
            }

            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            if (
                data.runCoins !==
                undefined
            ) {
                coins.runCoins =
                    Math.max(
                        0,
                        Math.floor(
                            this.number(
                                data.runCoins,
                                0
                            )
                        )
                    );
            }

            if (
                data.totalCoins !==
                undefined
            ) {
                coins.totalCoins =
                    Math.max(
                        0,
                        Math.floor(
                            this.number(
                                data.totalCoins,
                                0
                            )
                        )
                    );
            }

            if (
                data.collectedThisRun !==
                undefined
            ) {
                coins.collectedThisRun =
                    Math.max(
                        0,
                        Math.floor(
                            this.number(
                                data.collectedThisRun,
                                0
                            )
                        )
                    );
            }

            if (
                data.multiplier !==
                undefined
            ) {
                coins.multiplier =
                    Math.max(
                        0,
                        this.number(
                            data.multiplier,
                            1
                        )
                    );
            }

            this.syncGame(
                game,
                coins
            );
        },

        reset(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return;
            }

            coins.runCoins = 0;
            coins.collectedThisRun = 0;
            coins.lastCollected = 0;

            coins.pickups = [];
            coins.nextPickupId = 1;

            this.syncGame(
                game,
                coins
            );
        },

        debug(game) {
            const coins =
                this.ensure(game);

            if (!coins) {
                return null;
            }

            return {
                runCoins:
                    coins.runCoins,

                totalCoins:
                    coins.totalCoins,

                collectedThisRun:
                    coins.collectedThisRun,

                multiplier:
                    coins.multiplier,

                pickupCount:
                    coins.pickups.length,

                magnetEnabled:
                    coins.magnetEnabled
            };
        }
    };

    /*
     * Compatibility aliases.
     */
    window.Hillbound.Coins = Coins;
    window.HillboundCoins = Coins;
    window.Coins = Coins;

})();