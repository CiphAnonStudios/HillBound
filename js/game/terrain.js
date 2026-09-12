/* =========================================================
   HILLBOUND
   Terrain System
   js/game/terrain.js
   ========================================================= */

(function () {
    "use strict";

    window.Hillbound = window.Hillbound || {};

    const Terrain = {};

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

    /* ---------------------------------------------------------
       Default Terrain Configuration
       --------------------------------------------------------- */

    const DEFAULTS = {
        width: 100000,
        baseHeight: 420,

        // Default terrain appearance.
        surfaceColor: "#6f9f3d",
        dirtColor: "#6b4428",

        // Collision depth below the surface.
        groundDepth: 1000,

        // Default sample spacing.
        sampleDistance: 16,

        // Friction values.
        friction: 0.82,

        // Terrain boundaries.
        startX: 0,
        endX: 100000
    };

    /* ---------------------------------------------------------
       Terrain Factory
       --------------------------------------------------------- */

    function create(options = {}) {
        const terrain = {
            width: Math.max(
                1,
                number(options.width, DEFAULTS.width)
            ),

            baseHeight: number(
                options.baseHeight,
                DEFAULTS.baseHeight
            ),

            surfaceColor:
                options.surfaceColor ||
                DEFAULTS.surfaceColor,

            dirtColor:
                options.dirtColor ||
                DEFAULTS.dirtColor,

            groundDepth: Math.max(
                1,
                number(
                    options.groundDepth,
                    DEFAULTS.groundDepth
                )
            ),

            sampleDistance: Math.max(
                1,
                number(
                    options.sampleDistance,
                    DEFAULTS.sampleDistance
                )
            ),

            friction: clamp(
                number(
                    options.friction,
                    DEFAULTS.friction
                ),
                0,
                1
            ),

            startX: number(
                options.startX,
                DEFAULTS.startX
            ),

            endX: number(
                options.endX,
                DEFAULTS.endX
            ),

            // Optional generated points.
            points: Array.isArray(options.points)
                ? options.points
                : [],

            // Optional custom height function.
            heightFunction:
                typeof options.heightFunction === "function"
                    ? options.heightFunction
                    : null,

            // Current map reference.
            map: options.map || null,

            // Cached range.
            minX: number(
                options.startX,
                DEFAULTS.startX
            ),

            maxX: number(
                options.endX,
                DEFAULTS.endX
            )
        };

        if (
            terrain.points.length > 0
        ) {
            updateBounds(terrain);
        }

        return terrain;
    }

    Terrain.create = create;

    /* ---------------------------------------------------------
       Bounds
       --------------------------------------------------------- */

    function updateBounds(terrain) {
        if (
            !terrain ||
            !Array.isArray(terrain.points) ||
            terrain.points.length === 0
        ) {
            return;
        }

        terrain.minX =
            number(
                terrain.points[0].x,
                terrain.startX
            );

        terrain.maxX =
            number(
                terrain.points[
                    terrain.points.length - 1
                ].x,
                terrain.endX
            );

        terrain.startX =
            terrain.minX;

        terrain.endX =
            terrain.maxX;

        terrain.width =
            Math.max(
                1,
                terrain.maxX -
                terrain.minX
            );
    }

    Terrain.updateBounds = updateBounds;

    /* ---------------------------------------------------------
       Point Creation
       --------------------------------------------------------- */

    function addPoint(
        terrain,
        x,
        y
    ) {
        if (!terrain) return null;

        const point = {
            x: number(x),
            y: number(y)
        };

        terrain.points.push(point);

        updateBounds(terrain);

        return point;
    }

    Terrain.addPoint = addPoint;

    /* ---------------------------------------------------------
       Set Points
       --------------------------------------------------------- */

    function setPoints(
        terrain,
        points
    ) {
        if (!terrain) return;

        terrain.points =
            Array.isArray(points)
                ? points
                    .filter(
                        point =>
                            point &&
                            Number.isFinite(
                                Number(point.x)
                            ) &&
                            Number.isFinite(
                                Number(point.y)
                            )
                    )
                    .map(point => ({
                        x: number(point.x),
                        y: number(point.y)
                    }))
                : [];

        updateBounds(terrain);

        return terrain.points;
    }

    Terrain.setPoints = setPoints;

    /* ---------------------------------------------------------
       Interpolate Between Terrain Points
       --------------------------------------------------------- */

    function interpolateHeight(
        pointA,
        pointB,
        x
    ) {
        if (!pointA) {
            return DEFAULTS.baseHeight;
        }

        if (!pointB) {
            return number(
                pointA.y,
                DEFAULTS.baseHeight
            );
        }

        const dx =
            number(pointB.x) -
            number(pointA.x);

        if (Math.abs(dx) < 0.000001) {
            return number(
                pointA.y,
                DEFAULTS.baseHeight
            );
        }

        const amount =
            clamp(
                (
                    x -
                    number(pointA.x)
                ) / dx,
                0,
                1
            );

        /*
         * Smooth interpolation gives the physics system
         * slightly nicer terrain transitions than abrupt
         * point-to-point changes.
         */
        const smooth =
            smoothstep(amount);

        return lerp(
            number(pointA.y),
            number(pointB.y),
            smooth
        );
    }

    /* ---------------------------------------------------------
       Find Surrounding Points
       --------------------------------------------------------- */

    function findSegment(
        terrain,
        x
    ) {
        const points =
            terrain &&
            Array.isArray(terrain.points)
                ? terrain.points
                : [];

        if (!points.length) {
            return {
                a: null,
                b: null,
                index: -1
            };
        }

        if (x <= points[0].x) {
            return {
                a: points[0],
                b: points[1] || points[0],
                index: 0
            };
        }

        const last =
            points.length - 1;

        if (x >= points[last].x) {
            return {
                a: points[last - 1] || points[last],
                b: points[last],
                index: Math.max(0, last - 1)
            };
        }

        /*
         * Binary search keeps terrain lookups fast even
         * when a map contains thousands of points.
         */
        let low = 0;
        let high = last;

        while (low <= high) {
            const middle =
                Math.floor(
                    (low + high) / 2
                );

            const point =
                points[middle];

            const next =
                points[middle + 1];

            if (
                next &&
                x >= point.x &&
                x <= next.x
            ) {
                return {
                    a: point,
                    b: next,
                    index: middle
                };
            }

            if (x < point.x) {
                high =
                    middle - 1;
            } else {
                low =
                    middle + 1;
            }
        }

        const index =
            clamp(
                low,
                0,
                last - 1
            );

        return {
            a: points[index],
            b: points[index + 1],
            index
        };
    }

    Terrain.findSegment =
        findSegment;

    /* ---------------------------------------------------------
       Height Lookup
       --------------------------------------------------------- */

    function getHeight(
        terrain,
        x
    ) {
        if (!terrain) {
            return DEFAULTS.baseHeight;
        }

        const worldX =
            number(x);

        /*
         * Custom map/terrain function has priority.
         */
        if (
            typeof terrain.heightFunction ===
            "function"
        ) {
            try {
                return number(
                    terrain.heightFunction(
                        worldX
                    ),
                    terrain.baseHeight
                );
            } catch (error) {
                console.warn(
                    "[Hillbound] Terrain height function failed:",
                    error
                );
            }
        }

        /*
         * Generated points.
         */
        if (
            Array.isArray(terrain.points) &&
            terrain.points.length > 0
        ) {
            const segment =
                findSegment(
                    terrain,
                    worldX
                );

            return interpolateHeight(
                segment.a,
                segment.b,
                worldX
            );
        }

        /*
         * Flat fallback terrain.
         */
        return number(
            terrain.baseHeight,
            DEFAULTS.baseHeight
        );
    }

    Terrain.getHeight =
        getHeight;

    /*
     * Compatibility aliases used by other systems.
     */
    Terrain.heightAt =
        getHeight;

    Terrain.getGroundHeight =
        getHeight;

    Terrain.sampleHeight =
        getHeight;

    /* ---------------------------------------------------------
       Height With Ground Limits
       --------------------------------------------------------- */

    function getSurfaceY(
        terrain,
        x
    ) {
        return getHeight(
            terrain,
            x
        );
    }

    Terrain.getSurfaceY =
        getSurfaceY;

    /* ---------------------------------------------------------
       Slope
       --------------------------------------------------------- */

    function getSlope(
        terrain,
        x,
        sampleDistance
    ) {
        if (!terrain) return 0;

        const distance =
            Math.max(
                0.1,
                number(
                    sampleDistance,
                    terrain.sampleDistance ||
                    DEFAULTS.sampleDistance
                )
            );

        const left =
            getHeight(
                terrain,
                x - distance
            );

        const right =
            getHeight(
                terrain,
                x + distance
            );

        return (
            (right - left) /
            (distance * 2)
        );
    }

    Terrain.getSlope =
        getSlope;

    /* ---------------------------------------------------------
       Terrain Angle
       --------------------------------------------------------- */

    function getAngle(
        terrain,
        x
    ) {
        return Math.atan(
            getSlope(
                terrain,
                x
            )
        );
    }

    Terrain.getAngle =
        getAngle;

    Terrain.getSlopeAngle =
        getAngle;

    /* ---------------------------------------------------------
       Surface Normal
       --------------------------------------------------------- */

    function getNormal(
        terrain,
        x
    ) {
        const slope =
            getSlope(
                terrain,
                x
            );

        /*
         * Normal to the terrain surface.
         */
        const nx = -slope;
        const ny = 1;

        const length =
            Math.sqrt(
                nx * nx +
                ny * ny
            );

        if (length <= 0) {
            return {
                x: 0,
                y: 1
            };
        }

        return {
            x: nx / length,
            y: ny / length
        };
    }

    Terrain.getNormal =
        getNormal;

    /* ---------------------------------------------------------
       Surface Tangent
       --------------------------------------------------------- */

    function getTangent(
        terrain,
        x
    ) {
        const slope =
            getSlope(
                terrain,
                x
            );

        const tx = 1;
        const ty = slope;

        const length =
            Math.sqrt(
                tx * tx +
                ty * ty
            );

        if (length <= 0) {
            return {
                x: 1,
                y: 0
            };
        }

        return {
            x: tx / length,
            y: ty / length
        };
    }

    Terrain.getTangent =
        getTangent;

    /* ---------------------------------------------------------
       Ground Contact
       --------------------------------------------------------- */

    function getGroundContact(
        terrain,
        x,
        radius = 0
    ) {
        const surfaceY =
            getHeight(
                terrain,
                x
            );

        return {
            x: number(x),
            y: surfaceY,
            radius: Math.max(
                0,
                number(radius)
            ),
            slope:
                getSlope(
                    terrain,
                    x
                ),
            angle:
                getAngle(
                    terrain,
                    x
                ),
            normal:
                getNormal(
                    terrain,
                    x
                ),
            tangent:
                getTangent(
                    terrain,
                    x
                )
        };
    }

    Terrain.getGroundContact =
        getGroundContact;

    /* ---------------------------------------------------------
       Ground Check
       --------------------------------------------------------- */

    function isOnGround(
        terrain,
        x,
        y,
        radius = 0,
        tolerance = 5
    ) {
        const ground =
            getHeight(
                terrain,
                x
            );

        const bottom =
            number(y) +
            Math.max(
                0,
                number(radius)
            );

        return (
            bottom >=
            ground -
            Math.max(
                0,
                number(tolerance)
            )
        );
    }

    Terrain.isOnGround =
        isOnGround;

    /* ---------------------------------------------------------
       Get Ground Penetration
       --------------------------------------------------------- */

    function getPenetration(
        terrain,
        x,
        y,
        radius = 0
    ) {
        const ground =
            getHeight(
                terrain,
                x
            );

        const bottom =
            number(y) +
            Math.max(
                0,
                number(radius)
            );

        return bottom - ground;
    }

    Terrain.getPenetration =
        getPenetration;

    /* ---------------------------------------------------------
       Get Friction
       --------------------------------------------------------- */

    function getFriction(
        terrain,
        x
    ) {
        if (!terrain) {
            return DEFAULTS.friction;
        }

        /*
         * Maps may optionally provide a custom friction
         * function.
         */
        if (
            typeof terrain.frictionFunction ===
            "function"
        ) {
            try {
                return clamp(
                    number(
                        terrain.frictionFunction(x),
                        terrain.friction
                    ),
                    0,
                    1
                );
            } catch (error) {
                console.warn(
                    "[Hillbound] Terrain friction lookup failed:",
                    error
                );
            }
        }

        return clamp(
            number(
                terrain.friction,
                DEFAULTS.friction
            ),
            0,
            1
        );
    }

    Terrain.getFriction =
        getFriction;

    /* ---------------------------------------------------------
       Terrain Material
       --------------------------------------------------------- */

    function getMaterial(
        terrain,
        x
    ) {
        if (!terrain) {
            return "dirt";
        }

        if (
            typeof terrain.materialFunction ===
            "function"
        ) {
            try {
                return (
                    terrain.materialFunction(x) ||
                    "dirt"
                );
            } catch (error) {
                console.warn(
                    "[Hillbound] Terrain material lookup failed:",
                    error
                );
            }
        }

        return terrain.material || "dirt";
    }

    Terrain.getMaterial =
        getMaterial;

    /* ---------------------------------------------------------
       Generate Flat Terrain
       --------------------------------------------------------- */

    function generateFlat(
        terrain,
        startX,
        endX,
        height,
        spacing
    ) {
        if (!terrain) return [];

        const start =
            number(
                startX,
                terrain.startX
            );

        const end =
            number(
                endX,
                terrain.endX
            );

        const groundHeight =
            number(
                height,
                terrain.baseHeight
            );

        const step =
            Math.max(
                1,
                number(
                    spacing,
                    terrain.sampleDistance
                )
            );

        const points = [];

        for (
            let x = start;
            x <= end;
            x += step
        ) {
            points.push({
                x,
                y: groundHeight
            });
        }

        if (
            points.length === 0 ||
            points[points.length - 1].x < end
        ) {
            points.push({
                x: end,
                y: groundHeight
            });
        }

        setPoints(
            terrain,
            points
        );

        return points;
    }

    Terrain.generateFlat =
        generateFlat;

    /* ---------------------------------------------------------
       Generate From Height Function
       --------------------------------------------------------- */

    function generate(
        terrain,
        startX,
        endX,
        heightFunction,
        spacing
    ) {
        if (!terrain) return [];

        const start =
            number(
                startX,
                terrain.startX
            );

        const end =
            number(
                endX,
                terrain.endX
            );

        const step =
            Math.max(
                1,
                number(
                    spacing,
                    terrain.sampleDistance
                )
            );

        if (
            typeof heightFunction !==
            "function"
        ) {
            return generateFlat(
                terrain,
                start,
                end,
                terrain.baseHeight,
                step
            );
        }

        const points = [];

        for (
            let x = start;
            x <= end;
            x += step
        ) {
            let y =
                terrain.baseHeight;

            try {
                y =
                    number(
                        heightFunction(x),
                        terrain.baseHeight
                    );
            } catch (error) {
                y =
                    terrain.baseHeight;
            }

            points.push({
                x,
                y
            });
        }

        if (
            points.length === 0 ||
            points[points.length - 1].x < end
        ) {
            let y =
                terrain.baseHeight;

            try {
                y =
                    number(
                        heightFunction(end),
                        terrain.baseHeight
                    );
            } catch (error) {
                // Keep fallback height.
            }

            points.push({
                x: end,
                y
            });
        }

        setPoints(
            terrain,
            points
        );

        return points;
    }

    Terrain.generate =
        generate;

    /* ---------------------------------------------------------
       Extend Terrain
       --------------------------------------------------------- */

    function extend(
        terrain,
        endX,
        heightFunction,
        spacing
    ) {
        if (!terrain) return [];

        const start =
            terrain.points.length
                ? terrain.points[
                    terrain.points.length - 1
                ].x
                : terrain.startX;

        return generate(
            terrain,
            start,
            number(
                endX,
                terrain.endX
            ),
            heightFunction,
            spacing
        );
    }

    Terrain.extend =
        extend;

    /* ---------------------------------------------------------
       Smooth Terrain
       --------------------------------------------------------- */

    function smooth(
        terrain,
        passes = 1
    ) {
        if (
            !terrain ||
            !Array.isArray(terrain.points) ||
            terrain.points.length < 3
        ) {
            return;
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

        for (
            let pass = 0;
            pass < iterations;
            pass++
        ) {
            const result =
                terrain.points.map(
                    (point, index) => {
                        if (
                            index === 0 ||
                            index ===
                                terrain.points.length - 1
                        ) {
                            return {
                                x: point.x,
                                y: point.y
                            };
                        }

                        const previous =
                            terrain.points[
                                index - 1
                            ];

                        const next =
                            terrain.points[
                                index + 1
                            ];

                        return {
                            x: point.x,
                            y:
                                (
                                    previous.y +
                                    point.y +
                                    next.y
                                ) / 3
                        };
                    }
                );

            terrain.points =
                result;
        }

        updateBounds(
            terrain
        );

        return terrain.points;
    }

    Terrain.smooth =
        smooth;

    /* ---------------------------------------------------------
       Draw Terrain
       --------------------------------------------------------- */

    function draw(
        ctx,
        terrain,
        camera,
        canvasWidth,
        canvasHeight
    ) {
        if (
            !ctx ||
            !terrain
        ) {
            return;
        }

        const width =
            number(
                canvasWidth,
                ctx.canvas.width
            );

        const height =
            number(
                canvasHeight,
                ctx.canvas.height
            );

        const cameraX =
            camera
                ? number(camera.x)
                : 0;

        const cameraY =
            camera
                ? number(camera.y)
                : 0;

        /*
         * Determine visible world range.
         */
        const startX =
            cameraX - 100;

        const endX =
            cameraX +
            width +
            100;

        ctx.save();

        /*
         * Surface.
         */
        ctx.beginPath();

        const startY =
            getHeight(
                terrain,
                startX
            ) -
            cameraY;

        ctx.moveTo(
            startX - cameraX,
            startY
        );

        const step =
            Math.max(
                8,
                terrain.sampleDistance ||
                DEFAULTS.sampleDistance
            );

        for (
            let x = startX;
            x <= endX;
            x += step
        ) {
            const y =
                getHeight(
                    terrain,
                    x
                ) -
                cameraY;

            ctx.lineTo(
                x - cameraX,
                y
            );
        }

        ctx.lineTo(
            endX - cameraX,
            height + 200
        );

        ctx.lineTo(
            startX - cameraX,
            height + 200
        );

        ctx.closePath();

        ctx.fillStyle =
            terrain.dirtColor;

        ctx.fill();

        /*
         * Grass/surface line.
         */
        ctx.beginPath();

        for (
            let x = startX;
            x <= endX;
            x += step
        ) {
            const y =
                getHeight(
                    terrain,
                    x
                ) -
                cameraY;

            if (x === startX) {
                ctx.moveTo(
                    x - cameraX,
                    y
                );
            } else {
                ctx.lineTo(
                    x - cameraX,
                    y
                );
            }
        }

        ctx.strokeStyle =
            terrain.surfaceColor;

        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.stroke();

        ctx.restore();
    }

    Terrain.draw =
        draw;

    /* ---------------------------------------------------------
       Draw Terrain With Generated Points
       --------------------------------------------------------- */

    function drawPoints(
        ctx,
        terrain,
        camera
    ) {
        if (
            !ctx ||
            !terrain ||
            !terrain.points.length
        ) {
            return;
        }

        const cameraX =
            camera
                ? number(camera.x)
                : 0;

        const cameraY =
            camera
                ? number(camera.y)
                : 0;

        ctx.save();

        ctx.beginPath();

        terrain.points.forEach(
            function (point, index) {
                const x =
                    point.x -
                    cameraX;

                const y =
                    point.y -
                    cameraY;

                if (index === 0) {
                    ctx.moveTo(
                        x,
                        y
                    );
                } else {
                    ctx.lineTo(
                        x,
                        y
                    );
                }
            }
        );

        ctx.strokeStyle =
            terrain.surfaceColor;

        ctx.lineWidth = 5;

        ctx.stroke();

        ctx.restore();
    }

    Terrain.drawPoints =
        drawPoints;

    /* ---------------------------------------------------------
       Serialize Terrain
       --------------------------------------------------------- */

    function serialize(
        terrain
    ) {
        if (!terrain) return null;

        return {
            width: terrain.width,
            baseHeight:
                terrain.baseHeight,

            surfaceColor:
                terrain.surfaceColor,

            dirtColor:
                terrain.dirtColor,

            groundDepth:
                terrain.groundDepth,

            sampleDistance:
                terrain.sampleDistance,

            friction:
                terrain.friction,

            startX:
                terrain.startX,

            endX:
                terrain.endX,

            points:
                Array.isArray(
                    terrain.points
                )
                    ? terrain.points.map(
                        point => ({
                            x: point.x,
                            y: point.y
                        })
                    )
                    : []
        };
    }

    Terrain.serialize =
        serialize;

    /* ---------------------------------------------------------
       Reset Terrain
       --------------------------------------------------------- */

    function reset(
        terrain
    ) {
        if (!terrain) return;

        terrain.points = [];

        terrain.minX =
            terrain.startX;

        terrain.maxX =
            terrain.endX;

        return terrain;
    }

    Terrain.reset =
        reset;

    /* ---------------------------------------------------------
       Initialize Terrain
       --------------------------------------------------------- */

    function initialize(
        terrain,
        options = {}
    ) {
        if (!terrain) {
            terrain =
                create(options);
        }

        if (
            Array.isArray(
                options.points
            )
        ) {
            setPoints(
                terrain,
                options.points
            );
        } else if (
            typeof options.heightFunction ===
            "function"
        ) {
            terrain.heightFunction =
                options.heightFunction;

            generate(
                terrain,
                options.startX,
                options.endX,
                options.heightFunction,
                options.sampleDistance
            );
        } else if (
            terrain.points.length === 0
        ) {
            generateFlat(
                terrain,
                terrain.startX,
                terrain.endX,
                terrain.baseHeight,
                terrain.sampleDistance
            );
        }

        return terrain;
    }

    Terrain.initialize =
        initialize;

    /* ---------------------------------------------------------
       Public API
       --------------------------------------------------------- */

    window.Hillbound.Terrain =
        Terrain;

    /*
     * Compatibility aliases.
     */
    window.Terrain =
        Terrain;

})();