# Deployment

Repozytorium GitHub:

```txt
https://github.com/formic-studio/virtura-child-theme
```

Docelowy flow:

1. Kod jest rozwijany lokalnie w tym repozytorium.
2. Po zmianach w `src/` uruchamiamy `npm run build`.
3. Commit zawiera kod zrodlowy oraz aktualny katalog `dist/`.
4. Push do GitHub uruchamia aktualizacje theme przez WP Pusher.

WP Pusher powinien byc skonfigurowany jako theme deployment z repozytorium `formic-studio/virtura-child-theme` i branch wskazanym jako produkcyjny, np. `main`.
