# Discord theme template (WIP)
Basic Discord theme template

## Client support
- PowerCord/Replugged
- Vizality
- BetterDiscord
- Stylus (Browser extension)

## Features (Users)
- Fast loading (Sass pre-compilation)
- One command customization

## Features (Developers)
- Decent pre-made file structure
- [Class updater](./scripts/update-classes.py)
- [Custom build script](./scripts/build/)
- (More soon (maybe))

## Prerequisites
- NodeJS (Sass compilation)
- Git (Class updater)
- Python (Class updater)

## Getting started
### Setup
1. ```sh
   git clone https://github.com/wathhr/theme-template [theme name] --recursive
   cd [theme name]
   npm i
   ```

2. - Run the provided [`setup.bat`](./setup.bat) script (Breaks formatting) (WIP)
   - Replace the metadata on the JSON and LICENSE files


### Usage
#### Building
```sh
npm dev       # For hot reloading
npm build:all # For release
```

#### Updating classes
```sh
npm update-classes
```

### Hot reloading
Clients such as PowerCord/Replugged and Vizality have hot reloading built in  
If your client doesn't have hot reloading, use [BeautifulDiscord](https://github.com/leovoel/BeautifulDiscord)
