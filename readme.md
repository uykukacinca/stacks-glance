# Glance

A customizable personal dashboard built with Go templates and YAML configuration.

## Quick Start

```bash
cp example.env .env
docker-compose up -d
```

Access at `http://localhost:8080`

## Directory Structure

- `config/` - Dashboard configurations (dev, hub, test)
- `shared/` - Global theme, variables, and definitions
- `widgets/` - Widget implementations and templates
- `components/` - Reusable Go templates
- `assets/` - CSS, JavaScript, and media files

## Configuration

Each dashboard environment (`dev/`, `hub/`, `test/`) has:

- `glance.yml` - Main configuration
- `pages/` - Individual page definitions

Edit `shared/theme.yml` to customize colors and appearance globally.

## Customization

- Add new pages in `config/{env}/pages/`
- Create widgets in `widgets/` with `.yml` and `.gohtml` files
- Override styles in `assets/custom.css`
- Add scripts in `assets/custom.js`
