# Discord theme template (WIP)
Basic Discord theme template

## Client support
- PowerCord/Replugged
- Vizality
- BetterDiscord
- Velocity
- Stylus (Browser extension)

## Features (Users)
- Fast loading (Sass pre-compilation)
- One command customization

## Features (Developers)
- [Class updater](./scripts/update-classes.py)
- [Custom build script](./scripts/build/)
- (More soon (maybe))

## Prerequisites
- Git
- NodeJS
- Python

## Getting started
### Setup
1. Generate your repository
  - Click the "[Use this template](https://github.com/wathhr/theme-template/generate)" button
  - Check the "Include all branches" checkbox

2. Clone the repository you just generated
  - ```sh
    git clone $REPOSITORY_NAME
    ```

3. Run the provided setup script for your platform

### Usage
#### Building
```sh
npm run dev       # For hot reloading
npm run build:all # For release
```

#### Updating classes
```sh
npm run update-classes
```

### Hot reloading
Clients such as PowerCord/Replugged and Vizality have hot reloading built in
If your client doesn't have hot reloading, use [BeautifulDiscord](https://github.com/leovoel/BeautifulDiscord)
