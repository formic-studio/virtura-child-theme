# Optymalizacja mediów

Child theme optymalizuje nowe obrazy podczas standardowego uploadu do
WordPress Media Library.

## Nowe obrazy

- Oryginalny upload pozostaje dostępny do odzyskania w `original_image`.
- Plik główny używany do wyświetlania oraz warianty generowane z JPEG i PNG są
  zapisywane jako WebP, jeżeli aktywny edytor WordPressa obsługuje ten format.
- Jakość JPEG/WebP wynosi `80`.
- Obrazy większe niż `2560px` korzystają z mechanizmu skalowania WordPressa.
- Dodatkowe szerokości responsywne to `400px`, `480px`, `640px` i `1280px`.
- Klasy Bricks `hero-img`, `archive-img`, `category-img` i `team-img` otrzymują
  dopasowany atrybut `sizes`.
- Początkowy obraz `hero-img` korzysta z małego wariantu, natomiast desktopowy
  `virtura-hero-img-clone` wybiera z `srcset` wariant dopasowany do końcowego
  rozmiaru fullscreen i aktualizuje go po zmianie viewportu.

## Weryfikacja po deployu

Przejdź przez SSH do katalogu WordPressa:

```bash
cd ~/domains/lightcoral-narwhal-185732.hostingersite.com/public_html
```

Sprawdź, czy nowe rozmiary są zarejestrowane:

```bash
wp media image-size
```

Wgraj testowy JPEG przez Media Library. W katalogu danego miesiąca powinny
pojawić się warianty `.webp`, a frontendowy `img` powinien zawierać `srcset`.

## Istniejąca biblioteka

Nie regeneruj całej biblioteki przed przetestowaniem jednego attachmentu.

Wyświetl kilka ostatnich JPEG-ów:

```bash
wp post list --post_type=attachment --post_mime_type=image/jpeg --posts_per_page=10 --fields=ID,post_title,guid --format=table
```

Wybierz jeden identyfikator i zregeneruj jego warianty. `--skip-delete`
zachowuje dotychczasowe miniatury, dzięki czemu cache strony nie zacznie
wskazywać na usunięte pliki:

```bash
wp media regenerate ATTACHMENT_ID --skip-delete
```

Po sprawdzeniu plików i frontendu można przetworzyć całą bibliotekę:

```bash
wp media regenerate --yes --skip-delete
```

Polecenie może działać długo. Nie zamykaj sesji SSH, dopóki WP-CLI nie pokaże
podsumowania. Po zakończeniu wykonaj `Purge All` w LiteSpeed Cache i ponownie
sprawdź stronę na desktopie oraz telefonie.

Stare warianty JPEG/PNG pozostają na dysku jako zabezpieczenie. Ich czyszczenie
powinno nastąpić dopiero po pełnej weryfikacji nowego markup i cache.

## Szybka kontrola frontendu

W DevTools sprawdź wybrany element `img`:

```js
$0.currentSrc
```

W zakładce Network odpowiedź dla wygenerowanego wariantu powinna mieć
`Content-Type: image/webp`. Hero powinno mieć `loading="eager"` i
`fetchpriority="high"`; obrazy dalszych sekcji strony głównej powinny być
ładowane lazy z niskim priorytetem.
