# Virtura Child Theme

Child theme WordPressa dla strony Virtura budowanej na Bricks Builder.

## Stack

- WordPress child theme
- Bricks Builder jako parent theme i warstwa edycji layoutow
- Vite do budowania assetow CSS/JS
- GSAP do motion code i animacji frontendu
- WP Pusher do deploymentu z GitHub

## Lokalna praca

```bash
npm install
npm run build
```

Assety sa budowane do `dist/`. WP Pusher nie uruchamia buildu na serwerze, dlatego po zmianach w `src/` trzeba zbudowac `dist/` przed commitem.

## Motion

Podstawowy helper GSAP znajduje sie w `src/scripts/motion.js`. GSAP i ScrollTrigger sa ladowane lazy, dopiero gdy strona zawiera elementy z `data-motion`.

Elementy z atrybutem:

```html
data-motion="fade-up"
```

dostana prosty scroll reveal, o ile uzytkownik nie ma wlaczonego `prefers-reduced-motion`.

## Typografia

`src/styles/font-sizes.css` jest miejscem na aliasy fontow, zmienne CSS i responsywne nadpisania typografii dla Bricks.
