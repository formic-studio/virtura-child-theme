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

## Wideo i automatyczne postery

Generator posterów nie wymaga `ffmpeg`. Działa hybrydowo:

1. Po zakończeniu uploadu MP4/WebM skrypt w panelu otwiera film lokalnie w
   przeglądarce i pobiera klatkę z `0.1s`.
2. Klatka jest zmniejszana maksymalnie do szerokości `1920px` i eksportowana
   jako WebP z jakością `82`. Jeżeli przeglądarka nie obsługuje eksportu WebP,
   używany jest JPEG.
3. PHP sprawdza uprawnienia, nonce, rzeczywisty MIME obrazu i limit `5 MB`, po
   czym zapisuje poster jako osobny attachment w Media Library.
4. Poster zostaje powiązany z wideo przez `_virtura_video_poster_id` oraz
   standardowy `_thumbnail_id` WordPressa.

Automat działa przy uploadzie z Media Library, edytora wpisu i Bricks Buildera.
Okno uploadu musi pozostać otwarte do zakończenia generowania. Jeśli automat
nie może odczytać filmu, otwórz wideo w Media Library i użyj pola
`Poster wideo → Wygeneruj poster`. Ten sam przycisk pozwala później wygenerować
poster ponownie. Poprzedni obraz nie jest automatycznie usuwany z biblioteki.

## Lazy loading wideo

Na froncie źródła zwykłych tagów `video` renderowanych przez Bricks, WordPress
Video Shortcode i blok Core Video są przenoszone z `src` do `data-src` jeszcze
w PHP. Dzięki temu przeglądarka nie rozpoczyna pobierania filmu podczas
parsowania strony. Powiązany poster pozostaje w natywnym atrybucie `poster`,
więc parser przeglądarki pobiera lekką klatkę bez czekania na główny JavaScript.
Frontend używa wariantu postera o szerokości maksymalnie `1280px`.

- Źródło jest aktywowane około `100px` przed wejściem filmu do viewportu.
- Jednocześnie inicjalizowane są maksymalnie dwa filmy; następne czekają, aż
  poprzednie otrzymają pierwszą klatkę lub zakończy się limit czasu.
- Wideo bez autoplay otrzymuje po aktywacji `preload="metadata"`.
- Wideo z autoplay zaczyna odtwarzanie dopiero blisko viewportu.
- Autoplay jest zatrzymywany po wyjściu filmu poza obserwowany obszar i wznawiany
  po powrocie.
- Przy `prefers-reduced-motion: reduce` autoplay jest wyłączony, a źródło
  pozostaje odroczone do świadomej interakcji użytkownika.
- Kliknięcie lub aktywacja klawiaturą ładuje odroczone źródło również przed
  przecięciem z obserwowanym obszarem.

Jeżeli konkretne wideo musi być dostępne natychmiast, dodaj mu w Bricks custom
attribute:

```txt
data-virtura-video-eager="true"
```

Taki film zachowuje zwykły `src`; nadal respektuje `prefers-reduced-motion`.

Poster jest dobierany automatycznie po adresie filmu z Media Library. Ręcznie
ustawiony atrybut `poster` ma pierwszeństwo i nie jest nadpisywany.

## WebM na Hostingerze

Child theme zezwala na upload `.webm` jako `video/webm`, ale konfiguracja
serwera musi również wysyłać poprawny nagłówek HTTP. Odpowiedź
`Content-Type: text/plain` nie jest naprawiana przez filtr PHP WordPressa.

Po zmianie konfiguracji przez support sprawdź plik:

```bash
curl -I "https://lightcoral-narwhal-185732.hostingersite.com/wp-content/uploads/SCIEZKA/film.webm"
```

Oczekiwany wynik zawiera:

```txt
Content-Type: video/webm
```

Ten etap nie konwertuje MP4 do WebM. Automatyczne kodowanie wymaga dostępnego
`ffmpeg` albo zewnętrznej usługi.

### Obecne materiały na stronie „O nas”

Kontrola produkcji z 30 lipca 2026 wykazała, że główne pliki MP4 mają około
`19–28 MB` każdy. W sprawdzonym `video-about-1.mp4` atom `moov` znajduje się za
`mdat`, więc plik nie został przygotowany jako fast start. Lazy loading,
natychmiastowy poster i kolejkowanie poprawiają pierwszy render oraz rozkład
ruchu sieciowego, ale nie zastępują kompresji źródła. Docelowo te MP4 należy
przekodować z `-movflags +faststart` i przepływnością dopasowaną do
rozdzielczości.

## Test po wdrożeniu wideo

Najpierw sprawdź składnię PHP na serwerze:

```bash
php -l wp-content/themes/virtura-child-theme/inc/video-optimization.php
php -l wp-content/themes/virtura-child-theme/inc/enqueue.php
php -l wp-content/themes/virtura-child-theme/functions.php
```

Następnie wgraj krótki MP4 przez Media Library i pozostaw modal otwarty.
Po komunikacie o zapisaniu postera sprawdź identyfikator filmu:

```bash
wp post meta get VIDEO_ID _virtura_video_poster_id
wp post meta get VIDEO_ID _thumbnail_id
```

Obie komendy powinny zwrócić identyfikator obrazu. Na frontendzie tag wideo
przed wejściem w viewport powinien zawierać `data-src` lub element
`source[data-src]`, natywny `poster` i `preload="none"`. Po zbliżeniu filmu do
viewportu JavaScript przywróci `src`; poster pozostanie widoczny do rozpoczęcia
odtwarzania.
