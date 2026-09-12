Hillbound

«A 2D physics-based hill climbing game built with HTML, CSS, and JavaScript.»

Hillbound is a browser-based driving game focused on climbing challenging terrain, collecting coins and fuel, upgrading vehicles, unlocking maps, and setting distance records.

The game is designed to work on both desktop and mobile devices.

---

🎮 Game

The goal of Hillbound is simple:

Drive as far as you can without crashing or running out of fuel.

Players can:

- Drive different vehicles
- Climb hills and ramps
- Perform jumps and flips
- Collect coins
- Collect fuel
- Travel increasingly difficult terrain
- Upgrade vehicles
- Unlock new vehicles
- Unlock new maps
- Set distance records
- Compete on leaderboards
- Save their progress
- Create an account for online features

---

🖥️ Platform Support

Desktop

Hillbound supports normal desktop gameplay with:

- Keyboard controls
- Mouse interaction for menus
- Landscape gameplay
- Responsive game canvas

Mobile

Hillbound is designed for mobile landscape gameplay.

When the game detects a phone or tablet in portrait mode, it will display an orientation screen asking the player to rotate their device.

Example:

        📱

   ROTATE YOUR PHONE

       TO PLAY

   Turn your device sideways

Once the device is rotated into landscape mode, gameplay can begin.

Mobile gameplay will use:

- Touch controls
- Large on-screen buttons
- Landscape orientation
- Responsive UI

---

🚗 Vehicles

Hillbound will eventually contain multiple vehicle types.

Initial vehicles include:

- Starter Car
- Bike
- Truck

Each vehicle can have different characteristics such as:

- Speed
- Acceleration
- Weight
- Torque
- Grip
- Suspension
- Fuel capacity
- Air control
- Stability

More vehicles can be added later.

---

🔧 Vehicle Upgrades

Vehicles can be upgraded through the garage.

Planned upgrades include:

Engine

Improves:

- Acceleration
- Power
- Climbing ability

Tires

Improves:

- Grip
- Traction
- Terrain handling

Suspension

Improves:

- Landing stability
- Bump absorption
- Vehicle control

Fuel

Improves:

- Maximum fuel capacity
- Travel distance

Additional upgrades may be added later.

---

🗺️ Maps

Hillbound will contain multiple environments.

Initial planned maps:

- Countryside
- Desert
- Moon
- Snow

Each map can have its own:

- Terrain
- Background
- Physics
- Obstacles
- Collectibles
- Difficulty
- Visual style

More maps can be added without changing the core game engine.

---

🪙 Collectibles

Coins

Coins are collected during gameplay.

Coins can eventually be used for:

- Vehicle upgrades
- Vehicle purchases
- Map unlocks
- Other game features

Fuel

Fuel pickups restore fuel during a run.

If the vehicle runs out of fuel, the run ends.

---

🏆 Scoring

The main gameplay score is based on distance traveled.

Players can track:

- Current distance
- Best distance
- Coins collected
- Fuel collected
- Flips
- Air time
- Other future statistics

---

👤 Accounts

Online accounts are planned for the public version of Hillbound.

Players will eventually be able to:

- Create an account
- Log in
- Log out
- Have a profile
- Save progress
- Sync progress between devices
- Track statistics
- Appear on leaderboards

Authentication is planned to use Firebase Authentication.

---

☁️ Cloud Saves

Player data can eventually be stored online.

Possible saved information includes:

Player
├── username
├── coins
├── selected vehicle
├── vehicle upgrades
├── unlocked vehicles
├── unlocked maps
├── best distances
├── achievements
└── statistics

Cloud saves allow players to continue their progress on supported devices.

---

🏆 Leaderboards

The public version will include online leaderboards.

Possible leaderboard categories:

- Highest Distance
- Highest Map Distance
- Most Coins
- Most Flips
- Longest Air Time
- Weekly Records
- All-Time Records

Important scores should be validated server-side rather than trusting values sent directly from the browser.

---

🎨 Assets

Hillbound is designed to support a large number of game assets.

Assets are organized into separate folders.

assets/
├── images/
│   ├── vehicles/
│   ├── characters/
│   ├── terrain/
│   ├── maps/
│   ├── backgrounds/
│   ├── collectibles/
│   ├── ui/
│   ├── icons/
│   └── effects/
│
├── sounds/
│   ├── music/
│   ├── engines/
│   ├── vehicles/
│   ├── environment/
│   ├── effects/
│   └── ui/
│
└── fonts/

This structure allows additional vehicles, maps, characters, UI elements, sounds, and effects to be added without cluttering the project.

---

📁 Project Structure

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
│   ├── maps.css
│   ├── leaderboard.css
│   ├── profile.css
│   ├── settings.css
│   ├── auth.css
│   ├── mobile.css
│   └── orientation.css
│
├── js/
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
│   │   ├── mobileControls.js
│   │   ├── orientation.js
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
│   │   └── vehicleDisplay.js
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
│   │   ├── leaderboard.js
│   │   └── playerData.js
│   │
│   └── ui/
│       ├── hud.js
│       ├── menu.js
│       ├── modal.js
│       ├── notifications.js
│       ├── loading.js
│       └── orientationScreen.js
│
├── assets/
│   ├── images/
│   │   ├── vehicles/
│   │   │   ├── cars/
│   │   │   ├── bikes/
│   │   │   └── trucks/
│   │   ├── characters/
│   │   │   ├── player/
│   │   │   ├── drivers/
│   │   │   └── animations/
│   │   ├── terrain/
│   │   ├── maps/
│   │   ├── backgrounds/
│   │   ├── collectibles/
│   │   ├── ui/
│   │   │   ├── buttons/
│   │   │   ├── panels/
│   │   │   ├── hud/
│   │   │   └── menus/
│   │   ├── icons/
│   │   └── effects/
│   │
│   ├── sounds/
│   │   ├── music/
│   │   ├── engines/
│   │   ├── vehicles/
│   │   ├── environment/
│   │   ├── effects/
│   │   └── ui/
│   │
│   └── fonts/
│
├── config/
│   └── gameConfig.js
│
└── data/
    ├── vehicles.json
    ├── maps.json
    ├── upgrades.json
    └── achievements.json

---

🧠 Game Architecture

The game is divided into systems so individual features can be changed without rewriting the entire game.

Game System

Responsible for:

- Game loop
- Starting runs
- Ending runs
- Game state
- Updating systems

Physics System

Responsible for:

- Gravity
- Vehicle movement
- Rotation
- Suspension
- Wheel behavior
- Terrain interaction
- Collision

Terrain System

Responsible for:

- Terrain generation
- Hills
- Ramps
- Obstacles
- Terrain collision

Vehicle System

Responsible for:

- Vehicle data
- Vehicle selection
- Vehicle statistics
- Vehicle behavior

Player System

Responsible for:

- Player progress
- Coins
- Unlocks
- Achievements
- Statistics

UI System

Responsible for:

- Menus
- HUD
- Notifications
- Loading screens
- Orientation screen
- Game-over screens

---

⚙️ Configuration

Game-wide settings should be stored in:

config/gameConfig.js

Possible configuration values include:

Game settings
├── gravity
├── starting fuel
├── coin value
├── terrain difficulty
├── vehicle settings
├── camera settings
├── physics settings
└── gameplay settings

This makes balancing the game easier.

---

🧪 Development Versions

Version 0.1

Initial playable prototype.

Planned features:

- Main menu
- One vehicle
- Basic terrain
- Basic physics
- Keyboard controls
- Basic camera
- Distance counter
- Restart system

Version 0.2

Gameplay expansion.

- Coins
- Fuel
- Better terrain
- Game-over system
- Mobile controls
- Landscape orientation
- Basic garage

Version 0.3

Content expansion.

- Multiple vehicles
- Vehicle upgrades
- Multiple maps
- Better UI
- Sound effects
- Music
- Improved physics

Version 0.4

Online systems.

- Account registration
- Login
- Player profiles
- Cloud saves
- Online leaderboard
- Achievements

Version 1.0

Public release.

- Polished gameplay
- Multiple vehicles
- Multiple maps
- Mobile support
- Desktop support
- Accounts
- Cloud saves
- Leaderboards
- Achievements
- Final UI
- Performance optimization
- Security improvements

---

🛠️ Technologies

Hillbound is planned to use:

- HTML5
- CSS3
- JavaScript
- HTML Canvas
- Firebase Authentication
- Firebase Firestore

A physics library may be added if needed.

---

🎯 Development Goals

The main goals of Hillbound are:

1. Make the driving physics fun.
2. Make vehicles feel different from one another.
3. Create challenging but enjoyable terrain.
4. Support desktop and mobile.
5. Keep the project modular and easy to expand.
6. Support a large number of assets.
7. Add online accounts and cloud saves.
8. Build competitive leaderboards.
9. Keep the game lightweight and responsive.
10. Create a polished public release.

---

🔒 Security

The browser should never be trusted with important game data.

For the online version:

- Authentication should use a trusted authentication service.
- Database access should use proper security rules.
- Important leaderboard values should be validated.
- Private server credentials must never be placed in frontend code.
- Client-side values should not be treated as automatically trustworthy.

---

📱 Responsive Design

The interface should adapt to:

- Desktop
- Laptop
- Tablet
- Mobile landscape

Mobile portrait mode is reserved for the orientation screen while gameplay requires landscape.

---

🚀 Future Features

Possible future additions:

- More vehicles
- More maps
- Character customization
- Vehicle skins
- Achievements
- Daily challenges
- Missions
- Statistics
- Player profiles
- Friends
- Global leaderboards
- Map-specific leaderboards
- Seasonal events
- New terrain types
- More vehicle upgrades
- Ghost/replay system
- Controller support
- Improved particle effects
- More sound effects
- Customization
- Cloud synchronization

---

📌 Project Status

Current status: In development

Hillbound is currently being built as a browser-based prototype.

Features and file structures may change as development continues.

---

📄 License

This project is currently a private development project.

License information can be added when the project is ready for public distribution.

---

🏁 Hillbound

Climb higher. Drive farther.
