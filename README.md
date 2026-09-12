# HillBound
My own version of hill climb racing 2

hill-climb/
│
├── index.html
├── README.md
│
├── pages/
│   ├── game.html
│   ├── login.html
│   ├── register.html
│   ├── garage.html
│   ├── maps.html
│   ├── leaderboard.html
│   ├── profile.html
│   └── settings.html
│
├── css/
│   ├── global.css
│   ├── menu.css
│   ├── game.css
│   ├── garage.css
│   ├── leaderboard.css
│   ├── profile.css
│   └── auth.css
│
├── js/
│   │
│   ├── main.js
│   │
│   ├── game/
│   │   ├── game.js
│   │   ├── physics.js
│   │   ├── vehicle.js
│   │   ├── wheels.js
│   │   ├── suspension.js
│   │   ├── terrain.js
│   │   ├── terrainGenerator.js
│   │   ├── collision.js
│   │   ├── camera.js
│   │   ├── input.js
│   │   ├── fuel.js
│   │   ├── coins.js
│   │   ├── score.js
│   │   └── gameState.js
│   │
│   ├── vehicles/
│   │   ├── vehicles.js
│   │   ├── car.js
│   │   ├── bike.js
│   │   └── truck.js
│   │
│   ├── maps/
│   │   ├── maps.js
│   │   ├── countryside.js
│   │   ├── desert.js
│   │   ├── moon.js
│   │   └── snow.js
│   │
│   ├── garage/
│   │   ├── garage.js
│   │   ├── upgrades.js
│   │   └── vehicles.js
│   │
│   ├── player/
│   │   ├── player.js
│   │   ├── progress.js
│   │   └── achievements.js
│   │
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── logout.js
│   │   └── session.js
│   │
│   ├── database/
│   │   ├── firebase.js
│   │   ├── saves.js
│   │   └── leaderboard.js
│   │
│   └── ui/
│       ├── hud.js
│       ├── menu.js
│       ├── modal.js
│       ├── notifications.js
│       └── loading.js
│
├── assets/
│   │
│   ├── images/
│   │   ├── vehicles/
│   │   │   ├── starter-car.png
│   │   │   ├── bike.png
│   │   │   └── truck.png
│   │   │
│   │   ├── terrain/
│   │   ├── backgrounds/
│   │   ├── collectibles/
│   │   │   ├── coin.png
│   │   │   └── fuel.png
│   │   ├── ui/
│   │   └── icons/
│   │
│   ├── sounds/
│   │   ├── music/
│   │   ├── engine/
│   │   ├── vehicles/
│   │   └── effects/
│   │
│   └── fonts/
│
└── config/
    └── gameConfig.js
