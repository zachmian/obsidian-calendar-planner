# Obsidian Calendar Planner

Calendar Planner to plugin do Obsidian, który umożliwia wizualizację i zarządzanie notatkami w formie kalendarza. Plugin pozwala na filtrowanie notatek za pomocą tagów i zaawansowanych zapytań wyszukiwania, a także oferuje wygodne przeciąganie i upuszczanie notatek między dniami.

## Funkcje

- 📅 Widok miesięczny i tygodniowy kalendarza
- 🔍 Filtrowanie notatek za pomocą przypisanego tagu
- 🖱️ Przeciąganie i upuszczanie notatek między dniami
- 🎨 Dostosowanie do motywu Obsidian
- 🔄 Automatyczne odświeżanie przy zmianach
- 📌 Przycisk "Dziś" do szybkiej nawigacji
- ⚙️ Konfigurowalne ustawienia

## Demo
![](./calendar-planner-demo.gif)

## Do zrobienia
- [ ] Wsparcie dla języka angielskiego (obecnie tylko polski)
- [ ] Dodanie bardziej zaawansowanego filtrowania notatek
- [ ] Dodanie listy notatek pasujących do filtra, ale bez przypisanej daty

## Instalacja
Możesz zainstalować ten plugin korzystając z wtyczki BRAT w Obsidian.
Dodaj ją do swojego sejfu, a później do niej dodaj Calendar Planner, podając adres tego repozytorium.

## Użycie

Aby wyświetlić kalendarz w notatce, użyj bloku kodu:

~~~markdown
```calendar-planner
tag:#projekt
```
~~~

## Ustawienia

Plugin można dostosować w panelu ustawień:

- **Nazwa pola daty**: Określa pole używane do przechowywania daty (domyślnie: "date")
- **Format daty**: Format daty używający składni Moment.js (domyślnie: "YYYY-MM-DD") – użyj takiego samego formatu, jak w `Codziennych notatkach` w Obsidian
- **Domyślny widok**: Wybór między widokiem miesięcznym a tygodniowym

## Wsparcie
Jeśli znajdziesz błąd lub masz propozycję nowej funkcji, zgłoś to w tym repozytorium.

## Licencja
Ten plugin jest dostępny na licencji MIT. 