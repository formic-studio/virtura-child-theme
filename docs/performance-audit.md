# Audyt wydajności frontendu

Data audytu: 31 sierpnia 2026.

## Zakres

Sprawdzono 43 publiczne adresy znalezione w sitemapach stron, wpisów i
realizacji. Audyt objął HTML produkcyjny, assety child theme, obecność
komponentów Bricks, sposób ładowania obrazów i wideo, build Vite, Lighthouse
mobile oraz testy interakcji w Chrome z produkcyjnym HTML i lokalnym bundle.

W crawl nie znaleziono obrazów bez jawnych atrybutów `width` i `height`.
Wszystkie sprawdzone strony miały odroczone wideo z
`data-virtura-video-lazy="true"`. Nie wykryto błędów JavaScript w testach
reprezentatywnych stron.

## Stan przed zmianą

Każda podstrona ładowała ten sam bundle `main` zawierający kod wszystkich
komponentów:

- `main.js`: 119,27 kB / 36,69 kB gzip,
- GSAP: 70,43 kB / 27,68 kB gzip,
- ScrollTrigger: 43,55 kB / 18,11 kB gzip,
- główny CSS: 62,95 kB / 10,41 kB gzip.

GSAP i ScrollTrigger były uruchamiane na każdej stronie przez integrację Lenis,
również wtedy, gdy dokument nie zawierał żadnego motion code.

Komponenty występowały tylko na części serwisu, między innymi:

- filtry i paginacja archiwum: 1 strona,
- training tabs: 1 strona,
- specs slider: 3 strony,
- testimonials slider: 2 strony,
- FAQ: 18 stron.

## Wprowadzone zmiany

- Globalny bundle zawiera tylko header, giga menu, strzałki, media switch i
  lazy loading wideo.
- Pozostałe moduły są osobnymi dynamicznymi chunkami ładowanymi po wykryciu
  odpowiadającego im komponentu w DOM.
- Loader GSAP/SplitText został oddzielony od pełnego `motion.js`.
- Lenis korzysta z natywnego `autoRaf`; synchronizacja ScrollTrigger jest
  podpinana tylko tam, gdzie inicjalizuje się motion.
- FAQ pobiera GSAP po `pointerenter`, `pointerdown` albo `focusin`, zamiast przy
  pierwszym renderze strony.
- Inline bootstrap intro jest drukowany tylko na stronie głównej.

## Wynik builda

Po zmianie:

- `main.js`: 30,06 kB / 9,64 kB gzip,
- `smooth-scroll.js`: 19,67 kB / 5,80 kB gzip,
- główny CSS: 62,49 kB / 10,26 kB gzip,
- feature chunks: około 0,63–3,26 kB gzip każdy,
- GSAP i ScrollTrigger nie są pobierane na prostych podstronach ani na stronie
  z FAQ przed intencją interakcji.

Na stronie regulaminu zasoby child theme zmalały z około 296 kB do 115 kB bez
kompresji. Szacowany transfer po gzip zmalał z około 90 kB do 27 kB. W
porównawczym przebiegu Lighthouse praca głównego wątku spadła z około 0,9 s do
0,6 s, czas inicjalizacji JavaScript z około 0,3 s do 0,2 s, a Total Blocking
Time z 30 ms do 0 ms. Wynik punktowy nie jest porównywany, ponieważ build po
zmianie był serwowany z lokalnego hosta.

## Testy regresji

W Chrome sprawdzono:

- intro, hero motion i skip na stronie głównej,
- filtry oraz paginację archiwum realizacji,
- about slider, testimonials i kontrolki wideo na stronie „O nas”,
- training tabs i otwieranie FAQ,
- specs slider oraz motion na stronie folii PPF,
- prostą stronę tekstową bez niepotrzebnego GSAP.

Wszystkie moduły otrzymały oczekiwane klasy gotowości, interakcje zachowały
stan ARIA, a konsola nie zgłosiła wyjątków ani odrzuconych Promise.

## Pozostałe możliwości po deployu

1. LiteSpeed/serwer ustawia obecnie około 7 dni cache dla wielu statycznych
   assetów. Pliki Vite mają hash w nazwie i mogą otrzymać znacznie dłuższy
   `max-age` oraz `immutable`.
2. Poster wideo w footerze ma 900×900 px przy wyświetlaniu około 146×146 px;
   Lighthouse szacuje około 18 kB możliwej oszczędności. Poster `video-opti`
   daje około 58 kB możliwej oszczędności na stronie głównej. Wymiana wymaga
   przygotowania właściwych wariantów w Media Library/Bricks.
3. Bricks ładuje około 19 kB CSS Font Awesome, który nie jest używany w
   początkowym viewport, ale odpowiada m.in. za ikonę rozwijania mobilnego menu.
   Nie należy go globalnie wyłączać bez zastąpienia tych ikon.
4. Lighthouse wskazuje około 37 kB niewykorzystanego kodu w `bricks.min.js`.
   To asset parent theme i jego warunkowe wyłączenie wymaga osobnego testu
   wszystkich komponentów Bricks.
5. Duże źródłowe MP4 na stronie „O nas” nadal powinny zostać przekodowane z
   `faststart`; szczegóły są w `docs/media-optimization.md`.

Po wdrożeniu należy wykonać purge LiteSpeed Cache, sprawdzić nowy manifest na
produkcji i ponownie uruchomić Lighthouse mobile na stronie głównej, stronie
tekstowej, archiwum oraz stronie usługi z motion.
