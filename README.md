# Discord theme template (WIP)
Basic Discord theme template

## Client support
- PowerCord/Replugged/Vizality
- (More soon)

## Features (Users)
- Fast loading (pre-compiled Sass)
- One command customization (can be disabled[^precompile])

[^precompile]: One command customization can be turned off (no command required), disabling fast loading

## Features (Developers)
- Decent pre-made file structure
- Useful Sass functions
- [CSS custom property map](./src/custom-props.scss)
- Class updater
- (More soon (maybe))

## Getting started
### Setup
1. ```sh
   git clone https://github.com/wathhr/theme-template [theme name] --recursive
   cd [theme name]
   npm i
   ```

2. - Run the provided [`setup.bat`](./setup.bat) script (breaks formatting) (WIP)
   - Replace the metadata on the JSON and LICENSE files


### Usage
#### Building
```sh
npm dev            # For hot reloading
npm build [client] # For release
```

#### Hot reloading
- PowerCord/Replugged/Vizality
  - Built-in (might be slow)
- Others
  - idk haven't used any client other than powercord and kernel in ages
  - Use [BeautifulDiscord](https://github.com/leovoel/BeautifulDiscord)

#### Updating classes
```sh
npm update-classes
```

<!-- i don't understand symlinks with git :sosad: -->
