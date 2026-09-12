/* =========================================================
   HILLBOUND
   Terrain Generator
   js/game/terrainGenerator.js
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const TerrainGenerator = {};

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

    function smoothstep(value) {
        value = clamp(value, 0, 1);
        return value * value * (3 - 2 * value);
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function randomInt(min, max) {
        return Math.floor(
            randomRange(min, max + 1)
        );
    }

    /* ---------------------------------------------------------
       Seeded Random
       --------------------------------------------------------- */

    function hashSeed(value) {
        let hash = 2166136261;

        const string =
            String(value);

        for (let i = 0; i < string.length; i++) {
            hash ^= string.charCodeAt(i);
            hash +=
                (hash << 1) +
                (hash << 4) +
                (hash << 7) +
                (hash << 8) +
                (hash << 24);
        }

        return hash >>> 0;
    }

    function seededRandom(seed) {
        let state =
            hashSeed(seed);

        return function () {
            state =
                (
                    state * 1664525 +
                    1013904223
                ) >>> 0;

            return state / 4294967296;
        };
    }

    /* ---------------------------------------------------------
       Noise
       --------------------------------------------------------- */

    function createNoise(seed) {
        const random =
            seededRandom(seed);

        const values = [];

        for (let i = 0; i < 256; i++) {
            values.push(
                random()
            );
        }

        function sample(index) {
            const wrapped =
                (
                    Math.floor(index) %
                    values.length +
                    values.length
                ) %
                values.length;

            return values[wrapped];
        }

        return function (x) {
            const x0 =
                Math.floor(x);

            const x1 =
                x0 + 1;

            const amount =
                x - x0;

            const smooth =
                smoothstep(amount);

            return lerp(
                sample(x0),
                sample(x1),
                smooth
            );
        };
    }

    /* ---------------------------------------------------------
       Default Generator Configuration
       --------------------------------------------------------- */

    const DEFAULTS = {
        seed: Date.now(),

        startX: 0,
        endX: 100000,

        sampleDistance: 18,

        baseHeight: 420,

        minHeight: 180,
        maxHeight: 650,

        /*
         * Lower frequency = larger hills.
         */
        frequency: 0.0025,

        /*
         * Controls how much detail is added to hills.
         */
        detailFrequency: 0.009,

        detailStrength: 35,

        hillStrength: 170,

        /*
         * Keeps the beginning of a run reasonably smooth.
         */
        startFlatDistance: 450,

        /*
         * Prevents extreme changes between neighboring
         * terrain points.
         */
        maxSlope: 0.9,

        /*
         * Chance of generating special terrain features.
         */
        featureChance: 0.18
    };

    /* ---------------------------------------------------------
       Map Presets
       --------------------------------------------------------- */

    const MAP_PRESETS = {
        countryside: {
            baseHeight: 420,
            minHeight: 220,
            maxHeight: 650,

            frequency: 0.0026,
            detailFrequency: 0.009,
            detailStrength: 32,
            hillStrength: 165,

            maxSlope: 0.82,

            featureChance: 0.14
        },

        desert: {
            baseHeight: 430,
            minHeight: 240,
            maxHeight: 670,

            frequency: 0.0021,
            detailFrequency: 0.006,
            detailStrength: 24,
            hillStrength: 145,

            maxSlope: 0.7,

            featureChance: 0.1
        },

        moon: {
            baseHeight: 430,
            minHeight: 180,
            maxHeight: 700,

            frequency: 0.0028,
            detailFrequency: 0.011,
            detailStrength: 45,
            hillStrength: 190,

            maxSlope: 1.0,

            featureChance: 0.2
        },

        snow: {
            baseHeight: 420,
            minHeight: 200,
            maxHeight: 630,

            frequency: 0.0023,
            detailFrequency: 0.007,
            detailStrength: 28,
            hillStrength: 155,

            maxSlope: 0.76,

            featureChance: 0.12
        }
    };

    TerrainGenerator.presets =
        MAP_PRESETS;

    /* ---------------------------------------------------------
       Configuration
       --------------------------------------------------------- */

    function createConfig(options = {}) {
        const mapName =
            String(
                options.map ||
                options.mapName ||
                ""
            ).toLowerCase();

        const preset =
            MAP_PRESETS[mapName] ||
            {};

        return {
            ...DEFAULTS,
            ...preset,
            ...options,

            seed:
                options.seed !== undefined
                    ? options.seed
                    : DEFAULTS.seed,

            startX:
                number(
                    options.startX,
                    DEFAULTS.startX
                ),

            endX:
                number(
                    options.endX,
                    DEFAULTS.endX
                ),

            sampleDistance:
                Math.max(
                    4,
                    number(
                        options.sampleDistance,
                        DEFAULTS.sampleDistance
                    )
                )
        };
    }

    TerrainGenerator.createConfig =
        createConfig;

    /* ---------------------------------------------------------
       Terrain Height Function
       --------------------------------------------------------- */

    function createHeightFunction(
        config
    ) {
        const largeNoise =
            createNoise(
                `${config.seed}-large`
            );

        const detailNoise =
            createNoise(
                `${config.seed}-detail`
            );

        const featureNoise =
            createNoise(
                `${config.seed}-feature`
            );

        return function (x) {
            /*
             * Large rolling hills.
             */
            const large =
                largeNoise(
                    x *
                    config.frequency
                );

            /*
             * Convert 0..1 noise to -1..1.
             */
            const largeCentered =
                large * 2 - 1;

            /*
             * Smaller terrain details.
             */
            const detail =
                detailNoise(
                    x *
                    config.detailFrequency
                );

            const detailCentered =
                detail * 2 - 1;

            let height =
                config.baseHeight;

            height -=
                largeCentered *
                config.hillStrength;

            height -=
                detailCentered *
                config.detailStrength;

            /*
             * Add occasional natural features.
             */
            const feature =
                featureNoise(
                    x * 0.0008
                );

            if (
                feature >
                0.72
            ) {
                const featureAmount =
                    (
                        feature -
                        0.72
                    ) / 0.28;

                height -=
                    featureAmount *
                    45 *
                    config.featureChance;
            }

            /*
             * Clamp to map limits.
             */
            height =
                clamp(
                    height,
                    config.minHeight,
                    config.maxHeight
                );

            /*
             * Keep the start of the map relatively flat
             * so the player has time to get moving.
             */
            if (
                x >= config.startX &&
                x <
                    config.startX +
                    config.startFlatDistance
            ) {
                const distance =
                    x -
                    config.startX;

                const blend =
                    smoothstep(
                        distance /
                        config.startFlatDistance
                    );

                height =
                    lerp(
                        config.baseHeight,
                        height,
                        blend
                    );
            }

            return height;
        };
    }

    TerrainGenerator.createHeightFunction =
        createHeightFunction;

    /* ---------------------------------------------------------
       Generate Raw Points
       --------------------------------------------------------- */

    function generatePoints(
        config
    ) {
        const heightFunction =
            createHeightFunction(
                config
            );

        const points = [];

        let previousY =
            heightFunction(
                config.startX
            );

        for (
            let x = config.startX;
            x <= config.endX;
            x += config.sampleDistance
        ) {
            let y =
                heightFunction(x);

            /*
             * Limit slope between neighboring points.
             */
            const maxVerticalChange =
                config.sampleDistance *
                config.maxSlope;

            const difference =
                y -
                previousY;

            if (
                difference >
                maxVerticalChange
            ) {
                y =
                    previousY +
                    maxVerticalChange;
            }

            if (
                difference <
                -maxVerticalChange
            ) {
                y =
                    previousY -
                    maxVerticalChange;
            }

            points.push({
                x,
                y
            });

            previousY =
                y;
        }

        /*
         * Guarantee an endpoint.
         */
        if (
            points.length === 0 ||
            points[
                points.length - 1
            ].x <
                config.endX
        ) {
            points.push({
                x: config.endX,
                y: previousY
            });
        }

        return points;
    }

    TerrainGenerator.generatePoints =
        generatePoints;

    /* ---------------------------------------------------------
       Add Small Hill Features
       --------------------------------------------------------- */

    function addHill(
        points,
        centerX,
        width,
        height
    ) {
        if (!Array.isArray(points)) {
            return;
        }

        const halfWidth =
            Math.max(
                1,
                width / 2
            );

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            const point =
                points[i];

            const distance =
                Math.abs(
                    point.x -
                    centerX
                );

            if (
                distance >
                halfWidth
            ) {
                continue;
            }

            const normalized =
                1 -
                distance /
                halfWidth;

            const influence =
                smoothstep(
                    normalized
                );

            point.y -=
                height *
                influence;
        }
    }

    TerrainGenerator.addHill =
        addHill;

    /* ---------------------------------------------------------
       Add Valley
       --------------------------------------------------------- */

    function addValley(
        points,
        centerX,
        width,
        depth
    ) {
        if (!Array.isArray(points)) {
            return;
        }

        const halfWidth =
            Math.max(
                1,
                width / 2
            );

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            const point =
                points[i];

            const distance =
                Math.abs(
                    point.x -
                    centerX
                );

            if (
                distance >
                halfWidth
            ) {
                continue;
            }

            const normalized =
                1 -
                distance /
                halfWidth;

            const influence =
                smoothstep(
                    normalized
                );

            point.y +=
                depth *
                influence;
        }
    }

    TerrainGenerator.addValley =
        addValley;

    /* ---------------------------------------------------------
       Add Ramp
       --------------------------------------------------------- */

    function addRamp(
        points,
        startX,
        width,
        height
    ) {
        if (!Array.isArray(points)) {
            return;
        }

        const start =
            number(startX);

        const rampWidth =
            Math.max(
                1,
                number(width, 120)
            );

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            const point =
                points[i];

            const progress =
                clamp(
                    (
                        point.x -
                        start
                    ) /
                    rampWidth,
                    0,
                    1
                );

            if (
                progress <= 0 ||
                progress >= 1
            ) {
                continue;
            }

            /*
             * Smooth ramp shape.
             */
            const influence =
                smoothstep(
                    progress
                );

            point.y -=
                height *
                influence;
        }
    }

    TerrainGenerator.addRamp =
        addRamp;

    /* ---------------------------------------------------------
       Add Crater
       --------------------------------------------------------- */

    function addCrater(
        points,
        centerX,
        width,
        depth
    ) {
        if (!Array.isArray(points)) {
            return;
        }

        const halfWidth =
            Math.max(
                1,
                width / 2
            );

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            const point =
                points[i];

            const distance =
                Math.abs(
                    point.x -
                    centerX
                );

            if (
                distance >
                halfWidth
            ) {
                continue;
            }

            const normalized =
                distance /
                halfWidth;

            /*
             * Center is deepest.
             */
            const influence =
                1 -
                smoothstep(
                    normalized
                );

            point.y +=
                depth *
                influence;
        }
    }

    TerrainGenerator.addCrater =
        addCrater;

    /* ---------------------------------------------------------
       Add Random Features
       --------------------------------------------------------- */

    function addRandomFeatures(
        points,
        config
    ) {
        if (
            !Array.isArray(points) ||
            points.length < 2
        ) {
            return;
        }

        const random =
            seededRandom(
                `${config.seed}-features`
            );

        const map =
            String(
                config.map ||
                ""
            ).toLowerCase();

        /*
         * Keep special features away from the start.
         */
        const safeStart =
            config.startX +
            config.startFlatDistance +
            300;

        const safeEnd =
            config.endX -
            200;

        if (
            safeEnd <= safeStart
        ) {
            return;
        }

        /*
         * Number of features scales with map length.
         */
        const featureCount =
            Math.max(
                2,
                Math.floor(
                    (
                        config.endX -
                        config.startX
                    ) /
                    1800
                )
            );

        for (
            let i = 0;
            i < featureCount;
            i++
        ) {
            if (
                random() >
                config.featureChance
            ) {
                continue;
            }

            const centerX =
                safeStart +
                random() *
                (
                    safeEnd -
                    safeStart
                );

            const width =
                180 +
                random() *
                420;

            const strength =
                25 +
                random() *
                75;

            /*
             * Different maps get different feature types.
             */
            if (map === "moon") {
                addCrater(
                    points,
                    centerX,
                    width,
                    strength
                );
            } else if (
                map === "desert"
            ) {
                /*
                 * Desert uses longer rolling dunes.
                 */
                addHill(
                    points,
                    centerX,
                    width * 1.4,
                    strength * 0.8
                );
            } else if (
                map === "snow"
            ) {
                /*
                 * Snow gets softer hills.
                 */
                addHill(
                    points,
                    centerX,
                    width * 1.25,
                    strength * 0.7
                );
            } else {
                /*
                 * Countryside.
                 */
                if (random() > 0.5) {
                    addHill(
                        points,
                        centerX,
                        width,
                        strength
                    );
                } else {
                    addValley(
                        points,
                        centerX,
                        width,
                        strength
                    );
                }
            }
        }
    }

    TerrainGenerator.addRandomFeatures =
        addRandomFeatures;

    /* ---------------------------------------------------------
       Smooth Generated Points
       --------------------------------------------------------- */

    function smoothPoints(
        points,
        passes = 1
    ) {
        if (
            !Array.isArray(points) ||
            points.length < 3
        ) {
            return points;
        }

        const iterations =
            Math.max(
                1,
                Math.floor(
                    number(
                        passes,
                        1
                    )
                )
            );

        let result =
            points.map(
                point => ({
                    x: point.x,
                    y: point.y
                })
            );

        for (
            let pass = 0;
            pass < iterations;
            pass++
        ) {
            const next =
                result.map(
                    (
                        point,
                        index
                    ) => {
                        if (
                            index === 0 ||
                            index ===
                                result.length - 1
                        ) {
                            return {
                                x: point.x,
                                y: point.y
                            };
                        }

                        const previous =
                            result[
                                index - 1
                            ];

                        const following =
                            result[
                                index + 1
                            ];

                        return {
                            x: point.x,

                            y:
                                (
                                    previous.y +
                                    point.y * 2 +
                                    following.y
                                ) / 4
                        };
                    }
                );

            result = next;
        }

        return result;
    }

    TerrainGenerator.smoothPoints =
        smoothPoints;

    /* ---------------------------------------------------------
       Limit Slopes
       --------------------------------------------------------- */

    function limitSlopes(
        points,
        maxSlope
    ) {
        if (
            !Array.isArray(points) ||
            points.length < 2
        ) {
            return points;
        }

        const limit =
            Math.max(
                0.01,
                number(
                    maxSlope,
                    0.9
                )
            );

        for (
            let i = 1;
            i < points.length;
            i++
        ) {
            const previous =
                points[i - 1];

            const current =
                points[i];

            const dx =
                Math.max(
                    0.001,
                    current.x -
                    previous.x
                );

            const maxChange =
                dx * limit;

            const difference =
                current.y -
                previous.y;

            if (
                difference >
                maxChange
            ) {
                current.y =
                    previous.y +
                    maxChange;
            }

            if (
                difference <
                -maxChange
            ) {
                current.y =
                    previous.y -
                    maxChange;
            }
        }

        return points;
    }

    TerrainGenerator.limitSlopes =
        limitSlopes;

    /* ---------------------------------------------------------
       Generate Complete Terrain
       --------------------------------------------------------- */

    function generate(
        options = {}
    ) {
        const config =
            createConfig(
                options
            );

        let points =
            generatePoints(
                config
            );

        /*
         * Add map-specific features.
         */
        addRandomFeatures(
            points,
            config
        );

        /*
         * Smooth features so they connect naturally.
         */
        points =
            smoothPoints(
                points,
                config.map === "moon"
                    ? 1
                    : 2
            );

        /*
         * Keep slopes playable.
         */
        points =
            limitSlopes(
                points,
                config.maxSlope
            );

        /*
         * Guarantee the starting section stays
         * close to the configured base height.
         */
        const startLimit =
            config.startX +
            config.startFlatDistance;

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            if (
                points[i].x >
                startLimit
            ) {
                break;
            }

            const progress =
                clamp(
                    (
                        points[i].x -
                        config.startX
                    ) /
                    config.startFlatDistance,
                    0,
                    1
                );

            const blend =
                smoothstep(
                    progress
                );

            points[i].y =
                lerp(
                    config.baseHeight,
                    points[i].y,
                    blend
                );
        }

        return {
            points,
            config,

            heightFunction:
                createHeightFunction(
                    config
                )
        };
    }

    TerrainGenerator.generate =
        generate;

    /* ---------------------------------------------------------
       Generate Into Terrain Object
       --------------------------------------------------------- */

    function generateTerrain(
        terrain,
        options = {}
    ) {
        if (!terrain) {
            if (
                window.Hillbound.Terrain &&
                typeof window.Hillbound.Terrain.create ===
                    "function"
            ) {
                terrain =
                    window.Hillbound.Terrain.create(
                        options
                    );
            } else {
                return null;
            }
        }

        const result =
            generate(
                options
            );

        terrain.points =
            result.points;

        terrain.startX =
            result.config.startX;

        terrain.endX =
            result.config.endX;

        terrain.width =
            result.config.endX -
            result.config.startX;

        terrain.baseHeight =
            result.config.baseHeight;

        terrain.sampleDistance =
            result.config.sampleDistance;

        terrain.heightFunction =
            result.heightFunction;

        /*
         * Map-specific terrain properties.
         */
        terrain.map =
            options.map ||
            terrain.map ||
            null;

        if (
            options.friction !==
            undefined
        ) {
            terrain.friction =
                clamp(
                    number(
                        options.friction
                    ),
                    0,
                    1
                );
        }

        if (
            options.surfaceColor
        ) {
            terrain.surfaceColor =
                options.surfaceColor;
        }

        if (
            options.dirtColor
        ) {
            terrain.dirtColor =
                options.dirtColor;
        }

        if (
            window.Hillbound.Terrain &&
            typeof window.Hillbound.Terrain.updateBounds ===
                "function"
        ) {
            window.Hillbound.Terrain.updateBounds(
                terrain
            );
        }

        return terrain;
    }

    TerrainGenerator.generateTerrain =
        generateTerrain;

    /* ---------------------------------------------------------
       Generate Map Terrain
       --------------------------------------------------------- */

    function generateMap(
        mapName,
        options = {}
    ) {
        const name =
            String(
                mapName ||
                "countryside"
            ).toLowerCase();

        return generateTerrain(
            null,
            {
                ...options,
                map: name
            }
        );
    }

    TerrainGenerator.generateMap =
        generateMap;

    /* ---------------------------------------------------------
       Extend Endless Terrain
       --------------------------------------------------------- */

    function extend(
        terrain,
        newEndX,
        options = {}
    ) {
        if (!terrain) return null;

        const startX =
            terrain.endX;

        const endX =
            Math.max(
                startX,
                number(
                    newEndX,
                    startX
                )
            );

        if (
            endX <= startX
        ) {
            return terrain;
        }

        const config =
            createConfig({
                ...options,

                seed:
                    options.seed !== undefined
                        ? options.seed
                        : (
                            terrain.seed ||
                            Date.now()
                        ),

                map:
                    options.map ||
                    terrain.map ||
                    "countryside",

                startX,
                endX,

                baseHeight:
                    options.baseHeight !== undefined
                        ? options.baseHeight
                        : terrain.baseHeight,

                sampleDistance:
                    options.sampleDistance !== undefined
                        ? options.sampleDistance
                        : terrain.sampleDistance
            });

        const newPoints =
            generatePoints(
                config
            );

        /*
         * Remove the first generated point because it
         * overlaps the existing final terrain point.
         */
        if (
            newPoints.length &&
            terrain.points.length
        ) {
            const last =
                terrain.points[
                    terrain.points.length - 1
                ];

            if (
                Math.abs(
                    newPoints[0].x -
                    last.x
                ) <
                config.sampleDistance
            ) {
                newPoints.shift();
            }
        }

        addRandomFeatures(
            newPoints,
            config
        );

        const combined =
            terrain.points.concat(
                newPoints
            );

        terrain.points =
            smoothPoints(
                combined,
                1
            );

        limitSlopes(
            terrain.points,
            config.maxSlope
        );

        terrain.endX =
            endX;

        terrain.width =
            endX -
            terrain.startX;

        terrain.seed =
            config.seed;

        if (
            window.Hillbound.Terrain &&
            typeof window.Hillbound.Terrain.updateBounds ===
                "function"
        ) {
            window.Hillbound.Terrain.updateBounds(
                terrain
            );
        }

        return terrain;
    }

    TerrainGenerator.extend =
        extend;

    /* ---------------------------------------------------------
       Find Nearest Terrain Point
       --------------------------------------------------------- */

    function findNearestPoint(
        points,
        x
    ) {
        if (
            !Array.isArray(points) ||
            points.length === 0
        ) {
            return null;
        }

        let low = 0;
        let high =
            points.length - 1;

        while (
            low < high
        ) {
            const middle =
                Math.floor(
                    (low + high) / 2
                );

            if (
                points[middle].x <
                x
            ) {
                low =
                    middle + 1;
            } else {
                high =
                    middle;
            }
        }

        const current =
            points[low];

        const previous =
            points[
                Math.max(
                    0,
                    low - 1
                )
            ];

        if (!previous) {
            return current;
        }

        return Math.abs(
            previous.x - x
        ) <
            Math.abs(
                current.x - x
            )
            ? previous
            : current;
    }

    TerrainGenerator.findNearestPoint =
        findNearestPoint;

    /* ---------------------------------------------------------
       Generate Seed
       --------------------------------------------------------- */

    function generateSeed() {
        return Math.floor(
            Math.random() *
            2147483647
        );
    }

    TerrainGenerator.generateSeed =
        generateSeed;

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    window.Hillbound.TerrainGenerator =
        TerrainGenerator;

    /*
     * Compatibility aliases.
     */
    window.TerrainGenerator =
        TerrainGenerator;

})();