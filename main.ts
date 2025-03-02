import { Plugin, TFile, MarkdownView, PluginSettingTab, Setting, WorkspaceLeaf, moment, Menu, MenuItem } from 'obsidian';

interface RecurringNote {
    file: TFile;
    originalDate: Date;
    virtualDate: Date;
    recurrenceType: 'monthly' | 'yearly';
}

interface TaggedCalendarSettings {
    dateField: string;
    dateFormat: string;
    defaultView: 'month' | 'week';
    recurringLookAhead: number; // ile lat do przodu generować powtórzenia
    recurrenceField: string; // nazwa pola do oznaczania powtarzalności
    generateDatesField: boolean; // czy generować pole dates dla notatek powtarzalnych
    newNotesFolder: string; // Nowe ustawienie
}

const DEFAULT_SETTINGS: TaggedCalendarSettings = {
    dateField: 'date',
    dateFormat: 'YYYY-MM-DD',
    defaultView: 'month',
    recurringLookAhead: 2,
    recurrenceField: 'recurrence',
    generateDatesField: false,
    newNotesFolder: '' // Domyślnie pusty (główny folder)
}

interface CalendarState {
    currentDate: Date;
    view: 'month' | 'week';
    showUnplanned: boolean;
}

interface Filter {
    name: string;
    query: string;
}

interface VirtualFile extends TFile {
    isVirtual?: boolean;
    virtualId?: string;
    virtualMetadata?: any;
}

class TaggedCalendarSettingTab extends PluginSettingTab {
    plugin: TaggedCalendarPlugin;

    constructor(app: any, plugin: TaggedCalendarPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Ustawienia Calendar Planner'});

        new Setting(containerEl)
            .setName('Nazwa pola daty')
            .setDesc('Nazwa pola w frontmatter, które zawiera datę (np. "date" lub "data publikacji")')
            .addText(text => text
                .setPlaceholder('date')
                .setValue(this.plugin.settings.dateField)
                .onChange(async (value) => {
                    this.plugin.settings.dateField = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Format daty')
            .setDesc('Format daty używający składni Moment.js. Na przykład: YYYY-MM-DD lub DD MMMM YYYY')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Domyślny widok')
            .setDesc('Wybierz, który widok ma być domyślnie wyświetlany przy otwarciu kalendarza')
            .addDropdown(dropdown => dropdown
                .addOption('month', 'Miesiąc')
                .addOption('week', 'Tydzień')
                .setValue(this.plugin.settings.defaultView)
                .onChange(async (value: 'month' | 'week') => {
                    this.plugin.settings.defaultView = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Okres powtarzania')
            .setDesc('Ile lat do przodu generować powtarzające się notatki')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.recurringLookAhead)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.recurringLookAhead = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Nazwa pola powtarzalności')
            .setDesc('Nazwa pola w frontmatter używanego do oznaczania powtarzających się notatek (np. "recurrence" lub "powtarzanie")')
            .addText(text => text
                .setPlaceholder('recurrence')
                .setValue(this.plugin.settings.recurrenceField)
                .onChange(async (value) => {
                    this.plugin.settings.recurrenceField = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Generuj pole dates')
            .setDesc('Czy generować pole dates w frontmatter dla notatek powtarzalnych. Jeśli wyłączone, daty będą generowane tylko w kalendarzu.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.generateDatesField)
                .onChange(async (value) => {
                    this.plugin.settings.generateDatesField = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Folder dla nowych notatek')
            .setDesc('Ścieżka do folderu, w którym będą tworzone nowe notatki (np. "Notatki/2024"). Pozostaw puste, aby używać głównego folderu.')
            .addText(text => text
                .setPlaceholder('Notatki/2024')
                .setValue(this.plugin.settings.newNotesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.newNotesFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}

export default class TaggedCalendarPlugin extends Plugin {
    settings: TaggedCalendarSettings;
    private container: HTMLElement | null = null;
    private currentTag: string = '';
    private filters: Filter[] = [];
    private currentFilterIndex: number = 0;
    private activeLeaf: WorkspaceLeaf | null = null;
    private virtualFileCache: Map<string, any> = new Map(); // Cache dla wirtualnych plików
    private showUnplanned: boolean = false;
    private currentView: 'month' | 'week' = 'month';
    private currentDate: Date = new Date();
    private showPastDays: boolean = false;

    async onload() {
        await this.loadSettings();
        
        // Sprawdź czy to urządzenie mobilne i ustaw odpowiedni widok
        const isMobile = window.innerWidth <= 700;
        if (isMobile && this.settings.defaultView !== 'week') {
            this.settings.defaultView = 'week';
            await this.saveSettings();
        }
        
        this.currentView = this.settings.defaultView;

        // Dodaj panel ustawień
        this.addSettingTab(new TaggedCalendarSettingTab(this.app, this));

        // Rejestracja bloku markdown
        this.registerMarkdownCodeBlockProcessor('calendar-planner', async (source, el, ctx) => {
            // Parsuj filtry z kodu
            const lines = source.split('\n').filter(line => line.trim());
            this.filters = [];
            let showUnplanned = false;
            
            if (lines.length === 0) return;

            // Sprawdź czy mamy stary format (pojedynczy filtr bez nazwy)
            if (lines.length === 1 && !lines[0].includes(':')) {
                this.filters = [{
                    name: 'Domyślny',
                    query: lines[0].trim()
                }];
            } else {
                // Parsuj nowy format z nazwanymi filtrami i opcjami
                this.filters = lines
                    .filter(line => !line.startsWith('+'))
                    .map(line => {
                        const [name, ...queryParts] = line.split(':');
                        return {
                            name: name.trim(),
                            query: queryParts.join(':').trim()
                        };
                    });
                
                // Sprawdź opcje
                showUnplanned = lines.some(line => line.trim() === '+unplanned');
            }

            if (this.filters.length === 0) return;

            const calendar = document.createElement('div');
            calendar.className = 'calendar-planner';
            
            // Renderuj kalendarz z pierwszym filtrem
            this.currentFilterIndex = 0;
            this.showUnplanned = showUnplanned;
            await this.renderCalendar(calendar, this.filters[0].query, showUnplanned);

            el.appendChild(calendar);

            // Zapisz referencję do aktywnego liścia
            this.activeLeaf = this.app.workspace.activeLeaf;
        });

        // Nasłuchuj na zmianę aktywnego widoku
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async (leaf) => {
                if (this.container && this.currentTag && leaf !== this.activeLeaf) {
                    this.activeLeaf = leaf;
                    this.container.empty();
                    await this.renderCalendar(this.container, this.currentTag);
                }
            })
        );

        // Nasłuchuj na zmiany w plikach
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.container && this.currentTag) {
                    this.container.empty();
                    await this.renderCalendar(this.container, this.currentTag);
                }
            })
        );

        this.currentDate = new Date();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async renderCalendar(container: HTMLElement, query: string, showUnplanned: boolean = false) {
        console.log("[renderCalendar] Start", {
            query,
            showUnplanned,
            currentShowUnplanned: this.showUnplanned,
            stackTrace: new Error().stack
        });
        
        // Zachowaj aktualną wartość showUnplanned jeśli nie jest explicite przekazana
        if (this.showUnplanned && showUnplanned === false) {
            console.log("[renderCalendar] Zachowuję poprzednią wartość showUnplanned", {
                previous: this.showUnplanned,
                new: showUnplanned
            });
            showUnplanned = this.showUnplanned;
        }
        
        // Wyczyść kontener przed renderowaniem
        container.empty();
        
        this.container = container;
        this.currentTag = query;
        this.showUnplanned = showUnplanned;

        // Stan kalendarza
        const state: CalendarState = {
            currentDate: this.currentDate,
            view: this.currentView,
            showUnplanned: this.showUnplanned
        };

        // Kontener dla kontrolek
        const controls = document.createElement('div');
        controls.className = 'calendar-controls';

        // Lewa strona - nawigacja
        const navigationDiv = document.createElement('div');
        navigationDiv.className = 'calendar-navigation';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.addEventListener('click', () => {
            if (state.view === 'month') {
                state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1);
            } else {
                state.currentDate = new Date(state.currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            this.currentDate = state.currentDate;
            updateCalendar();
        });

        const todayButton = document.createElement('button');
        todayButton.textContent = 'Dziś';
        todayButton.className = 'today-button';
        todayButton.addEventListener('click', () => {
            state.currentDate = new Date();
            this.currentDate = state.currentDate;
            updateCalendar();
        });

        const nextButton = document.createElement('button');
        nextButton.textContent = '→';
        nextButton.addEventListener('click', () => {
            if (state.view === 'month') {
                state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1);
            } else {
                state.currentDate = new Date(state.currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            this.currentDate = state.currentDate;
            updateCalendar();
        });

        const dateLabel = document.createElement('span');
        dateLabel.className = 'current-month-label';

        // Funkcja aktualizacji nagłówka
        const updateHeader = () => {
            const monthNamesNominative = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 
                                  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
            const monthNamesGenitive = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
                                  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
            
            let headerText = '';
            if (state.view === 'month') {
                headerText = `${monthNamesNominative[state.currentDate.getMonth()]} ${state.currentDate.getFullYear()}`;
            } else {
                const weekStart = new Date(state.currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                if (weekStart.getMonth() === weekEnd.getMonth()) {
                    headerText = `${weekStart.getDate()} - ${weekEnd.getDate()} ${monthNamesGenitive[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
                } else {
                    headerText = `${weekStart.getDate()} ${monthNamesGenitive[weekStart.getMonth()]} - ${weekEnd.getDate()} ${monthNamesGenitive[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
                }
            }
            
            dateLabel.textContent = headerText;
        };

        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(todayButton);
        navigationDiv.appendChild(nextButton);
        navigationDiv.appendChild(dateLabel);

        // Prawa strona - kontrolki widoku
        const viewControls = document.createElement('div');
        viewControls.className = 'view-controls';

        // Przełącznik widoku
        const viewToggle = document.createElement('select');
        viewToggle.innerHTML = `
            <option value="month">Miesiąc</option>
            <option value="week">Tydzień</option>
        `;
        viewToggle.value = this.currentView;
        viewToggle.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.currentView = target.value as 'month' | 'week';
            this.settings.defaultView = this.currentView;
            this.saveSettings();
            state.view = this.currentView;
            updateCalendar();
        });

        viewControls.appendChild(viewToggle);

        // Dodaj selektor filtrów jeśli jest więcej niż jeden
        if (this.filters.length > 1) {
            const filterSelector = this.createFilterSelector();
            viewControls.appendChild(filterSelector);
        }

        controls.appendChild(navigationDiv);
        controls.appendChild(viewControls);
        container.appendChild(controls);

        // Kontener na siatkę kalendarza
        const gridContainer = document.createElement('div');
        gridContainer.className = 'calendar-grid-container';
        container.appendChild(gridContainer);

        // Wywołaj updateHeader po inicjalizacji
        updateHeader();

        const updateCalendar = async () => {
            gridContainer.innerHTML = '';
            
            // Usuń istniejący przycisk toggle, jeśli istnieje
            const existingToggle = container.querySelector('.toggle-past-days');
            if (existingToggle) {
                existingToggle.remove();
            }

            // Usuń istniejącą sekcję niezaplanowanych
            const existingUnplanned = container.querySelector('.unplanned-container');
            if (existingUnplanned) {
                existingUnplanned.remove();
            }

            // Dodaj przycisk toggle tylko dla widoku miesięcznego
            if (state.view === 'month') {
                const togglePastButton = document.createElement('button');
                togglePastButton.className = 'toggle-past-days';
                togglePastButton.textContent = this.showPastDays ? 'Ukryj poprzednie dni' : 'Pokaż poprzednie dni';
                togglePastButton.addEventListener('click', () => {
                    this.showPastDays = !this.showPastDays;
                    togglePastButton.textContent = this.showPastDays ? 'Ukryj poprzednie dni' : 'Pokaż poprzednie dni';
                    refreshView();
                });
                container.insertBefore(togglePastButton, gridContainer);
            }

            if (state.view === 'month') {
                await this.renderMonthView(gridContainer, state.currentDate, this.filters[this.currentFilterIndex].query, refreshView);
            } else {
                await this.renderWeekView(gridContainer, state.currentDate, this.filters[this.currentFilterIndex].query, refreshView);
            }

            // Odśwież sekcję niezaplanowanych
            if (this.showUnplanned) {
                console.log("[refreshView] Dodaję sekcję niezaplanowanych");
                const newUnplannedContainer = document.createElement('div');
                newUnplannedContainer.className = 'unplanned-container';
                const unplannedSection = await this.createUnplannedSection(this.currentTag, refreshView);
                newUnplannedContainer.appendChild(unplannedSection);
                container.appendChild(newUnplannedContainer);
            }

            // Dodaj klasę show-past do kalendarza jeśli potrzeba
            const calendarGrid = gridContainer.querySelector('.calendar-grid');
            if (calendarGrid) {
                if (this.showPastDays) {
                    calendarGrid.classList.add('show-past');
                } else {
                    calendarGrid.classList.remove('show-past');
                }
            }

            // Dodaj wywołanie updateHeader w updateCalendar
            updateHeader();
        };

        // Funkcja aktualizująca kalendarz
        const refreshView = async () => {
            console.log("[refreshView] Start", {
                showUnplanned: this.showUnplanned,
                currentTag: this.currentTag,
                stackTrace: new Error().stack
            });
            
            // Zamiast czyścić cały kontener, można usunąć tylko zmienione elementy
            const oldCalendarGrid = gridContainer.querySelector('.calendar-grid');
            if (oldCalendarGrid) {
                oldCalendarGrid.remove();
            }
            
            const oldUnplannedContainer = container.querySelector('.unplanned-container');
            if (oldUnplannedContainer) {
                oldUnplannedContainer.remove();
            }
            
            await updateCalendar();
        };

        // Inicjalne renderowanie
        await refreshView();
    }

    private formatDateAsLink(date: Date): string {
        // Formatuj datę według ustawionego formatu
        const formattedDate = window.moment(date).format(this.settings.dateFormat);
        // Dodaj link i cudzysłowy
        const finalFormat = `"[[${formattedDate}]]"`;
        console.log('Formatowanie daty:', {
            input: date,
            formatted: formattedDate,
            output: finalFormat
        });
        return finalFormat;
    }

    private parseDateFromLink(dateString: any): Date | null {
        // Upewnij się, że mamy string
        if (typeof dateString !== 'string') {
            try {
                dateString = String(dateString);
            } catch {
                return null;
            }
        }

        // Usuń cudzysłowy i znaki linku
        dateString = dateString.replace(/["\[\]]/g, '');

        // Spróbuj sparsować datę używając ustawionego formatu
        const parsed = window.moment(dateString, this.settings.dateFormat, true);
        if (parsed.isValid()) {
            return parsed.toDate();
        }

        // Jeśli nie udało się sparsować w zadanym formacie, 
        // spróbuj innych formatów jako fallback
        const fallbackParsed = window.moment(dateString);
        if (fallbackParsed.isValid()) {
            return fallbackParsed.toDate();
        }

        return null;
    }

    private async getFilteredFiles(query: string): Promise<{file: TFile, date: Date}[]> {
        console.log("[getFilteredFiles] Start", {
            query,
            stackTrace: new Error().stack
        });

        // Podziel zapytanie na części, zachowując fragmenty w cudzysłowach
        const conditions = this.splitQueryPreservingQuotes(query);
        console.log("[getFilteredFiles] Podzielone warunki:", conditions);

        const allFiles: {file: TFile, date: Date}[] = [];
        const files = this.app.vault.getMarkdownFiles();
        
        // Najpierw zbierz wszystkie pliki rekurencyjne
        const recurringFiles = files.filter(file => {
            const metadata = this.app.metadataCache.getFileCache(file);
            return metadata?.frontmatter?.[this.settings.recurrenceField];
        });

        // Generuj daty dla plików rekurencyjnych
        const recurringDates = await this.generateRecurringDates(recurringFiles);
        
        // Przetwórz wszystkie pliki (z wyjątkiem rekurencyjnych)
        for (const file of files) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) continue;
            
            // Pomiń pliki rekurencyjne - będą dodane później
            if (metadata.frontmatter[this.settings.recurrenceField]) continue;
            
            // Sprawdź czy plik spełnia wszystkie warunki
            let matchesAllConditions = true;
            for (const condition of conditions) {
                if (!this.matchesCondition(file, metadata, condition)) {
                    matchesAllConditions = false;
                    break;
                }
            }
            
            if (!matchesAllConditions) continue;
            
            // Pobierz datę z frontmattera
            const dateStr = metadata.frontmatter[this.settings.dateField];
            if (!dateStr) continue;

            console.log("[getFilteredFiles] Znaleziono plik", {
                file: file.path,
                dateStr,
                metadata: metadata.frontmatter
            });
            
            const date = this.parseDateFromLink(dateStr);
            if (date) {
                allFiles.push({file, date});
            }
        }

        // Dodaj powtarzające się pliki z ich datami
        recurringDates.forEach(({file, dates}) => {
            console.log("[getFilteredFiles] Przetwarzanie pliku rekurencyjnego", {
                file: file.path,
                datesCount: dates.length
            });

            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) return;
            
            // Sprawdź czy plik spełnia wszystkie warunki
            let matchesAllConditions = true;
            for (const condition of conditions) {
                if (!this.matchesCondition(file, metadata, condition)) {
                    matchesAllConditions = false;
                    break;
                }
            }
            
            if (!matchesAllConditions) return;
            
            const originalDate = this.parseDateFromLink(metadata.frontmatter[this.settings.dateField]);
            if (originalDate) {
                allFiles.push({file, date: originalDate});
            
                // Dodaj tylko przyszłe daty (bez daty podstawowej)
                dates.forEach(date => {
                    if (date > originalDate) {
                        allFiles.push({file, date});
                    }
                });
            }
        });
        
        // Posortuj pliki po dacie
        allFiles.sort((a, b) => a.date.getTime() - b.date.getTime());

        return allFiles;
    }

    private filterFilesByQuery(files: TFile[], query: string): TFile[] {
        const conditions = query.split(' ').filter(part => part.trim());
        
        return files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return false;

            // Sprawdź każdy warunek
            return conditions.every(condition => {
                // Wykluczenie (np. -tag:#projekt)
                if (condition.startsWith('-')) {
                    return !this.matchesCondition(file, cache, condition.substring(1));
                }
                
                // Operator OR
                if (condition.toUpperCase() === 'OR') {
                    return true; // Obsłużymy OR w osobnej pętli
                }

                return this.matchesCondition(file, cache, condition);
            });
        });
    }

    private async generateRecurringDates(files: TFile[]): Promise<{file: TFile, dates: Date[]}[]> {
        const result: {file: TFile, dates: Date[]}[] = [];
        const currentDate = new Date();
        const maxDate = new Date(currentDate.getFullYear() + this.settings.recurringLookAhead, currentDate.getMonth(), currentDate.getDate());

        // Mapowanie wartości parametrów na typ powtarzalności
        const recurrenceMap: { [key: string]: 'monthly' | 'yearly' } = {
            'monthly': 'monthly',
            'miesięcznie': 'monthly',
            'miesiecznie': 'monthly',
            'yearly': 'yearly',
            'rocznie': 'yearly'
        };

        for (const file of files) {
            try {
                const metadata = this.app.metadataCache.getFileCache(file);
                if (!metadata?.frontmatter) continue;

                const recurrenceValue = metadata.frontmatter[this.settings.recurrenceField];
                if (!recurrenceValue) continue;

                // Normalizacja wartości do standardowego formatu
                const recurrence = recurrenceMap[recurrenceValue.toString().toLowerCase()];
                if (!recurrence) continue;

                const originalDate = this.parseDateFromLink(metadata.frontmatter[this.settings.dateField]);
                if (!originalDate) continue;

                // Generuj daty wystąpień
                const dates: Date[] = [];
                let currentInstance = new Date(originalDate);
                let instanceCount = 0;
                const MAX_INSTANCES = 100;

                // Ustaw godzinę na 12:00, aby uniknąć problemów ze strefą czasową
                currentInstance.setHours(12, 0, 0, 0);

                // Przesuń datę na następne wystąpienie
                if (recurrence === 'monthly') {
                    currentInstance = new Date(currentInstance.getFullYear(), currentInstance.getMonth() + 1, currentInstance.getDate());
                } else if (recurrence === 'yearly') {
                    currentInstance = new Date(currentInstance.getFullYear() + 1, currentInstance.getMonth(), currentInstance.getDate());
                }

                while (currentInstance <= maxDate && instanceCount < MAX_INSTANCES) {
                    dates.push(new Date(currentInstance));
                    instanceCount++;

                    // Przesuń datę zgodnie z typem powtarzania
                    if (recurrence === 'monthly') {
                        currentInstance = new Date(currentInstance.getFullYear(), currentInstance.getMonth() + 1, currentInstance.getDate());
                    } else if (recurrence === 'yearly') {
                        currentInstance = new Date(currentInstance.getFullYear() + 1, currentInstance.getMonth(), currentInstance.getDate());
                    }

                    // Ustaw godzinę na 12:00 po każdej zmianie
                    currentInstance.setHours(12, 0, 0, 0);
                }

                if (dates.length > 0) {
                    console.log('Wygenerowane daty dla pliku:', {
                        file: file.path,
                        originalDate: originalDate,
                        dates: dates.map(d => d.toISOString())
                    });
                    result.push({file, dates});
                }
            } catch (error) {
                console.error('Błąd podczas generowania dat dla pliku:', file.path, error);
                continue;
            }
        }

        return result;
    }

    private matchesCondition(file: TFile, cache: any, condition: string): boolean {
        // Wykluczenie (np. -tag:#projekt lub -path:"Projekty/2024")
        if (condition.startsWith('-')) {
            return !this.matchesCondition(file, cache, condition.substring(1));
        }

        // Tag (np. tag:#projekt lub #projekt)
        if (condition.startsWith('tag:') || condition.startsWith('#')) {
            const tag = condition.startsWith('tag:') ? 
                condition.substring(4) : condition;
            const searchTag = tag.startsWith('#') ? tag : '#' + tag;
            
            // Sprawdź tagi w frontmatter
            const frontmatterTags = cache?.frontmatter?.tags;
            if (Array.isArray(frontmatterTags)) {
                if (frontmatterTags.includes(searchTag) || frontmatterTags.includes(searchTag.substring(1))) {
                    return true;
                }
            }
            
            // Sprawdź tagi inline
            const tags = cache?.tags;
            if (tags) {
                return tags.some((t: {tag: string}) => t.tag === searchTag || t.tag === searchTag.substring(1));
            }
            
            return false;
        }

        // Ścieżka (np. path:"Projekty/2024")
        if (condition.startsWith('path:')) {
            const path = condition.substring(5).replace(/"/g, '');
            return file.path.includes(path);
        }

        // Domyślnie traktuj jako tag
        const tag = condition.startsWith('#') ? condition : '#' + condition;
        return this.filterFilesByTag([file], tag).length > 0;
    }

    private filterFilesByTag(files: TFile[], tag: string): TFile[] {
        return files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            
            // Sprawdź tagi w frontmatter
            const frontmatterTags = cache?.frontmatter?.tags;
            if (Array.isArray(frontmatterTags)) {
                if (frontmatterTags.includes(tag) || frontmatterTags.includes(tag.substring(1))) {
                    return true;
                }
            }
            
            // Sprawdź tagi inline
            const tags = cache?.tags;
            if (tags) {
                return tags.some(t => t.tag === tag || t.tag === tag.substring(1));
            }
            
            return false;
        });
    }

    private async renderMonthView(container: HTMLElement, date: Date, query: string, refreshView: () => Promise<void>) {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-grid';
        
        // Dodaj klasę show-past jeśli potrzeba
        if (this.showPastDays) {
            calendar.classList.add('show-past');
        }

        // Nagłówki dni tygodnia
        const daysOfWeek = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        // Zbierz pliki spełniające kryteria wyszukiwania
        const files = await this.getFilteredFiles(query);
        const taggedFiles = await this.mapFilesToDates(files);

        // Pierwszy i ostatni dzień miesiąca
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // Dodaj puste dni na początku miesiąca
        let firstDayOfWeek = firstDay.getDay() || 7;
        for (let i = 1; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        // Dodaj dni miesiąca
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(date.getFullYear(), date.getMonth(), day, 12, 0, 0, 0);
            const dateStr = window.moment(currentDate).format('YYYY-MM-DD');
            const entries = taggedFiles.get(dateStr) || [];
            
            const dayEl = this.createDroppableDay(currentDate, entries, refreshView);
            
            // Dodaj klasę dla dni przed dzisiejszym
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);
            
            if (currentDate < today) {
                dayEl.classList.add('past-day');
            }
            
            calendar.appendChild(dayEl);
        }

        container.appendChild(calendar);
    }

    private async renderWeekView(container: HTMLElement, date: Date, query: string, refreshView: () => Promise<void>) {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-grid';
        
        // Dodaj klasę show-past jeśli potrzeba
        if (this.showPastDays) {
            calendar.classList.add('show-past');
        }

        // Nagłówki dni tygodnia
        const daysOfWeek = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        // Zbierz pliki spełniające kryteria wyszukiwania
        const files = await this.getFilteredFiles(query);
        const taggedFiles = await this.mapFilesToDates(files);

        // Znajdź początek tygodnia
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

        // Renderuj dni tygodnia
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            
            const dateStr = window.moment(currentDate).format('YYYY-MM-DD');
            const entries = taggedFiles.get(dateStr) || [];
            
            const dayEl = this.createDroppableDay(currentDate, entries, refreshView);
            calendar.appendChild(dayEl);
        }

        container.appendChild(calendar);
    }

    private async updateFileDate(file: TFile, newDate: string | null, refreshView?: () => Promise<void>) {
        try {
            console.log("[updateFileDate] Start", {
                file: file.path,
                newDate,
                showUnplanned: this.showUnplanned,
                currentView: this.currentView,
                currentDate: this.currentDate
            });

            // Zachowaj aktualny stan widoku
            const viewToggle = this.container?.querySelector('.view-controls select') as HTMLSelectElement | null;
            const currentView = viewToggle?.value as 'month' | 'week';
            
            // Zachowaj aktualną wartość showUnplanned
            const currentShowUnplanned = this.showUnplanned;

            // Wczytaj aktualną zawartość pliku
            let content = await this.app.vault.read(file);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);

            if (match) {
                console.log("[updateFileDate] Znaleziono frontmatter", {
                    originalFrontmatter: match[1]
                });

                // Aktualizuj datę podstawową
                const frontmatter = match[1];
                const lines = frontmatter.split('\n');
                const escapedFieldName = this.settings.dateField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const dateFieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`);
                
                // Usuń pole dates tylko jeśli generowanie jest włączone
                const updatedLines = lines
                    .filter(line => {
                        const trimmed = line.trim();
                        if (!this.settings.generateDatesField) {
                            return true; // zachowaj wszystkie linie
                        }
                        return !trimmed.startsWith('dates:') && !trimmed.startsWith('- "[[');
                    })
                    .filter(line => !line.match(dateFieldRegex)); // Usuń linię z datą
                
                // Dodaj nową datę tylko jeśli nie jest null
                if (newDate !== null) {
                    const formattedDate = this.formatDateAsLink(new Date(newDate));
                    updatedLines.push(`${this.settings.dateField}: ${formattedDate}`);
                }
                
                // Zapisz zmiany
                const newFrontmatter = updatedLines.join('\n');
                content = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
                
                console.log("[updateFileDate] Przygotowano nowy frontmatter", {
                    newFrontmatter
                });
                
                // Zapisz plik
                if (this.settings.newNotesFolder) {
                    await this.ensureFolderExists(this.settings.newNotesFolder);
                }
                await this.app.vault.modify(file, content);
                
                // Usuwamy linię otwierającą plik
                // await this.app.workspace.getLeaf().openFile(file);
                
                // Poczekaj na pełną aktualizację metadanych
                await new Promise<void>((resolve) => {
                    const maxAttempts = 10;
                    let attempts = 0;

                    const checkMetadata = () => {
                        attempts++;
                        const metadata = this.app.metadataCache.getFileCache(file);
                        const frontmatter = metadata?.frontmatter;
                        
                        // Sprawdź czy metadane są zaktualizowane
                        const isUpdated = newDate === null ? 
                            !frontmatter?.[this.settings.dateField] :
                            frontmatter?.[this.settings.dateField] === this.formatDateAsLink(new Date(newDate)).replace(/"/g, '');

                        console.log("[updateFileDate] Sprawdzanie metadanych", {
                            attempt: attempts,
                            isUpdated,
                            currentMetadata: frontmatter
                        });

                        if (isUpdated || attempts >= maxAttempts) {
                            resolve();
                        } else {
                            setTimeout(checkMetadata, 100);
                        }
                    };

                    checkMetadata();
                });

                // Jeśli to notatka rekurencyjna, zaktualizuj daty
                if (newDate !== null && this.settings.generateDatesField) {
                    const metadata = this.app.metadataCache.getFileCache(file);
                    if (metadata?.frontmatter?.[this.settings.recurrenceField]) {
                        await this.initializeRecurringNoteDates(file, new Date(newDate));
                    }
                }

                // Wymuś odświeżenie cache'u metadanych
                await this.app.metadataCache.trigger('changed', file);

                // Poczekaj na pełne odświeżenie metadanych
                await new Promise(resolve => setTimeout(resolve, 200));

                // Wymuś pełne odświeżenie widoku
                if (this.container && this.currentTag) {
                    // Wyczyść cały kontener
                    this.container.empty();
                    
                    // Renderuj kalendarz od nowa
                    await this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
                    
                    // Dodatkowe odświeżenie po krótkim czasie
                    setTimeout(async () => {
                        if (this.container && this.currentTag) {
                            this.container.empty();
                            await this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
                        }
                    }, 500);
                }
            }

            console.log("[updateFileDate] Zakończono całą operację");
        } catch (error) {
            console.error("[updateFileDate] Błąd:", error);
        }
    }

    private async initializeRecurringNoteDates(file: TFile, originalDate: Date) {
        try {
            console.log('Inicjalizacja/aktualizacja dat rekurencyjnych:', {
                file: file.path,
                originalDate: originalDate
            });

            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) {
                console.log('Brak frontmattera w pliku');
                return;
            }

            const recurrenceValue = metadata.frontmatter[this.settings.recurrenceField];
            if (!recurrenceValue) {
                console.log('Brak wartości pola recurrence');
                return;
            }

            // Ustaw godzinę na 12:00, aby uniknąć problemów ze strefą czasową
            originalDate.setHours(12, 0, 0, 0);

            // Generuj przyszłe daty
            const dates = await this.generateRecurringDates([file]);
            if (dates.length === 0) {
                console.log('Nie wygenerowano żadnych dat');
                return;
            }

            const futureDates = dates[0].dates;
            console.log('Wygenerowane przyszłe daty:', futureDates);

            // Formatuj daty jako linki
            const dateLinks = futureDates.map(date => {
                date.setHours(12, 0, 0, 0);
                return this.formatDateAsLink(date);
            });
            
            // Dodaj oryginalną datę na początek listy i usuń duplikaty
            dateLinks.unshift(this.formatDateAsLink(originalDate));
            const uniqueDateLinks = [...new Set(dateLinks)];

            // Wczytaj aktualną zawartość pliku
            let content = await this.app.vault.read(file);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);

            if (match) {
                // Podziel frontmatter na linie
                const frontmatter = match[1];
                const lines = frontmatter.split('\n');
                
                // Znajdź indeks ostatniej linii frontmattera
                let lastIndex = lines.length - 1;
                while (lastIndex >= 0 && lines[lastIndex].trim() === '') {
                    lastIndex--;
                }

                // Usuń wszystkie linie związane z dates
                const newLines = lines.filter((line, index) => {
                    if (index > lastIndex) return false;
                    const trimmed = line.trim();
                    return !trimmed.startsWith('dates:') && !trimmed.startsWith('- "[[');
                });

                // Dodaj nowe daty na końcu
                newLines.push('dates:');
                uniqueDateLinks.forEach(link => {
                    newLines.push(`  - ${link}`);
                });

                // Złącz wszystko z powrotem
                const newFrontmatter = newLines.join('\n');
                const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);

                console.log('Aktualizacja frontmattera:', {
                    stary: frontmatter,
                    nowy: newFrontmatter
                });

                if (this.settings.newNotesFolder) {
                    await this.ensureFolderExists(this.settings.newNotesFolder);
                }
                await this.app.vault.modify(file, newContent);
                // Nie ma potrzeby czekać tutaj, bo i tak będziemy odświeżać metadane w updateFileDate
            }
        } catch (error) {
            console.error('Błąd podczas inicjalizacji/aktualizacji dat rekurencyjnych:', error);
        }
    }

    private createDraggableEntry(file: TFile, date: Date | null) {
        const entry = document.createElement('div');
        entry.className = 'calendar-entry';
        
        const metadata = this.app.metadataCache.getFileCache(file);
        const isRecurring = metadata?.frontmatter?.[this.settings.recurrenceField];
        
        if (isRecurring) {
            entry.classList.add('recurring-entry');
            const icon = document.createElement('span');
            icon.className = 'recurring-icon';
            icon.textContent = '🔄';
            entry.appendChild(icon);
            
            // Sprawdź czy to jest przyszłe wystąpienie
            const originalDate = this.parseDateFromLink(metadata?.frontmatter?.[this.settings.dateField]);
            
            // Dodaj logi do debugowania
            console.log("[createDraggableEntry] Sprawdzanie dat", {
                file: file.path,
                originalDate: originalDate?.toISOString(),
                currentDate: date?.toISOString(),
                isOriginalDate: originalDate && date ? 
                    window.moment(originalDate).format('YYYY-MM-DD') === window.moment(date).format('YYYY-MM-DD') : 
                    false
            });

            if (originalDate && date && 
                window.moment(date).format('YYYY-MM-DD') !== window.moment(originalDate).format('YYYY-MM-DD')) {
                // Jeśli to przyszłe wystąpienie (ale nie oryginalna data), nie pozwól na przeciąganie
                entry.classList.add('future-recurring');
                entry.setAttribute('draggable', 'false');
                entry.title = 'Nie można przenosić przyszłych wystąpień notatki rekurencyjnej';
                
                // Dodaj ikonę blokady
                const lockIcon = document.createElement('span');
                lockIcon.className = 'lock-icon';
                lockIcon.textContent = '🔒';
                entry.appendChild(lockIcon);
            } else {
                // Oryginalna notatka lub wystąpienie w oryginalnej dacie może być przeciągane
                entry.setAttribute('draggable', 'true');
                entry.dataset.filePath = file.path;
            }
        } else {
            // Zwykłe notatki mogą być przeciągane
            entry.setAttribute('draggable', 'true');
            entry.dataset.filePath = file.path;
        }
        
        const title = document.createElement('span');
        title.textContent = file.basename;
        entry.appendChild(title);
        
        // Dodaj obsługę przeciągania tylko dla elementów, które można przeciągać
        if (entry.getAttribute('draggable') === 'true') {
            entry.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/plain', file.path);
                entry.style.opacity = '0.5';
            });
            
            entry.addEventListener('dragend', () => {
                entry.style.opacity = '1';
            });
        }
        
        // Zawsze pozwól na klikanie
        entry.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.app.workspace.getLeaf().openFile(file);
        });
        
        return entry;
    }

    private createDroppableDay(date: Date, entries: TFile[] = [], refreshView: () => Promise<void>) {
        console.log("[createDroppableDay] Start", {
            date: date.toISOString(),
            entriesCount: entries.length,
            entries: entries.map(f => f.path)
        });

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (entries.length) {
            dayEl.classList.add('has-entries');
        }

        // Przywracamy oznaczenie dzisiejszego dnia
        const today = new Date();
        if (date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()) {
            dayEl.classList.add('today');
        }

        // Dodajemy przycisk plus
        const addButton = document.createElement('div');
        addButton.className = 'add-entry-button';
        addButton.title = 'Dodaj nową notatkę';
        addButton.style.display = 'none';

        // Pokazujemy/ukrywamy przycisk przy hover
        dayEl.addEventListener('mouseenter', () => {
            addButton.style.display = 'block';
        });
        dayEl.addEventListener('mouseleave', () => {
            addButton.style.display = 'none';
        });

        // Obsługa kliknięcia w plus
        addButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const formattedDate = window.moment(date).format(this.settings.dateFormat);
            const fileName = `Notatka ${formattedDate}`;
            // Dodaj folder do ścieżki pliku jeśli jest ustawiony
            const filePath = this.settings.newNotesFolder 
                ? `${this.settings.newNotesFolder}/${fileName}.md`
                : `${fileName}.md`;
            const currentFilter = this.filters[this.currentFilterIndex];
            const tags = this.extractTagsFromQuery(currentFilter.query);
            const frontmatter = [
                '---',
                `${this.settings.dateField}: "[[${formattedDate}]]"`,
                tags.length > 0 ? 'tags:\n  - ' + tags.map(tag => `"#${tag}"`).join('\n  - ').replace(/##/g, '#') : '',
                '---',
                '',
                '# ' + fileName
            ].filter(line => line !== '').join('\n');

            if (this.settings.newNotesFolder) {
                await this.ensureFolderExists(this.settings.newNotesFolder);
            }
            const newFile = await this.app.vault.create(filePath, frontmatter);
            await this.app.workspace.getLeaf().openFile(newFile);
            
            if (this.container && this.currentTag) {
                this.container.empty();
                await this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
            }
        });

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate().toString();
        
        // Dodaj nazwę dnia tygodnia jako atrybut data
        const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        dayNumber.setAttribute('data-day-name', dayNames[date.getDay()]);
        
        dayEl.appendChild(dayNumber);
        dayEl.appendChild(addButton);

        this.setupDroppable(dayEl, async (file: TFile) => {
            const newDate = window.moment(date).format('YYYY-MM-DD');
            await this.updateFileDate(file, newDate, refreshView);
        });
        
        entries.forEach(file => {
            const entry = this.createDraggableEntry(file, date);
            dayEl.appendChild(entry);
        });
        
        return dayEl;
    }

    private createFilterSelector(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'filter-selector';

        const select = document.createElement('select');
        this.filters.forEach((filter, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = filter.name;
            select.appendChild(option);
        });

        select.value = this.currentFilterIndex.toString();
        select.addEventListener('change', async (e) => {
            this.currentFilterIndex = parseInt((e.target as HTMLSelectElement).value);
            if (this.container) {
                this.container.empty();
                await this.renderCalendar(this.container, this.filters[this.currentFilterIndex].query, this.showUnplanned);
            }
        });

        container.appendChild(select);
        return container;
    }

    private async createUnplannedSection(query: string, refreshView: () => Promise<void>): Promise<HTMLElement> {
        console.log("[createUnplannedSection] Start", {
            query,
            showUnplanned: this.showUnplanned
        });

        const section = document.createElement('div');
        section.className = 'unplanned-section';

        const headerContainer = document.createElement('div');
        headerContainer.className = 'unplanned-header';

        const header = document.createElement('h3');
        header.textContent = 'Niezaplanowane';

        const addButton = document.createElement('div');
        addButton.className = 'add-entry-button';
        addButton.title = 'Dodaj nową notatkę';
        addButton.style.display = 'block'; // Ten plus jest zawsze widoczny

        addButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fileName = `Notatka ${window.moment().format('YYYYMMDDHHmmss')}`;
            // Dodaj folder do ścieżki pliku jeśli jest ustawiony
            const filePath = this.settings.newNotesFolder 
                ? `${this.settings.newNotesFolder}/${fileName}.md`
                : `${fileName}.md`;
            const currentFilter = this.filters[this.currentFilterIndex];
            const tags = this.extractTagsFromQuery(currentFilter.query);
            const frontmatter = [
                '---',
                tags.length > 0 ? 'tags:\n  - ' + tags.map(tag => `"#${tag}"`).join('\n  - ').replace(/##/g, '#') : '',
                '---',
                '',
                '# ' + fileName
            ].filter(line => line !== '').join('\n');

            if (this.settings.newNotesFolder) {
                await this.ensureFolderExists(this.settings.newNotesFolder);
            }
            const newFile = await this.app.vault.create(filePath, frontmatter);
            await this.app.workspace.getLeaf().openFile(newFile);
            
            if (this.container && this.currentTag) {
                this.container.empty();
                await this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
            }
        });

        headerContainer.appendChild(header);
        headerContainer.appendChild(addButton);
        section.appendChild(headerContainer);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'unplanned-items';
        
        // Podziel zapytanie na części, zachowując fragmenty w cudzysłowach
        const conditions = this.splitQueryPreservingQuotes(query);
        console.log("[createUnplannedSection] Podzielone warunki:", conditions);
        
        // Pobierz pliki bez daty
        const allFiles = this.app.vault.getMarkdownFiles();
        const unplannedFiles = allFiles.filter(file => {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) return false;
            
            // Sprawdź czy nie ma daty
            if (metadata.frontmatter[this.settings.dateField]) return false;
            
            // Sprawdź czy plik spełnia wszystkie warunki
            let matchesAllConditions = true;
            for (const condition of conditions) {
                if (!this.matchesCondition(file, metadata, condition)) {
                    matchesAllConditions = false;
                    break;
                }
            }
            
            return matchesAllConditions;
        });
        
        console.log("[createUnplannedSection] Znalezione pliki:", {
            count: unplannedFiles.length,
            files: unplannedFiles.map(f => f.path)
        });
        
        // Dodaj elementy do kontenera
        unplannedFiles.forEach(file => {
            const entry = this.createDraggableEntry(file, null);
            itemsContainer.appendChild(entry);
        });
        
        // Dodaj obsługę upuszczania
        this.setupDroppable(itemsContainer, async (file: TFile) => {
            await this.updateFileDate(file, null, refreshView);
        });
        
        section.appendChild(itemsContainer);
        return section;
    }

    // Dodajemy nową metodę do wyciągania tagów z zapytania
    private extractTagsFromQuery(query: string): string[] {
        const tags: string[] = [];
        const parts = this.splitQueryPreservingQuotes(query);
        
        parts.forEach(part => {
            if (part.startsWith('#') || part.startsWith('tag:')) {
                const tag = part.startsWith('tag:') ? part.substring(4) : part.substring(1);
                tags.push(tag);
            }
        });
        
        return tags;
    }

    // Dodaj nową metodę do dzielenia zapytania
    private splitQueryPreservingQuotes(query: string): string[] {
        const parts: string[] = [];
        let currentPart = '';
        let inQuotes = false;
        
        for (let i = 0; i < query.length; i++) {
            const char = query[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                currentPart += char;
            } else if (char === ' ' && !inQuotes) {
                if (currentPart.trim()) {
                    parts.push(currentPart.trim());
                }
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        
        // Dodaj ostatnią część
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }
        
        return parts.filter(part => part.length > 0);
    }

    private async ensureFolderExists(folderPath: string): Promise<void> {
        if (!folderPath) return;
        
        const folders = folderPath.split('/');
        let currentPath = '';
        
        for (const folder of folders) {
            currentPath += (currentPath ? '/' : '') + folder;
            if (!this.app.vault.getAbstractFileByPath(currentPath)) {
                await this.app.vault.createFolder(currentPath);
            }
        }
    }

    // Nowa metoda pomocnicza do tworzenia siatki kalendarza
    private async createCalendarGrid(showPastDays: boolean): Promise<HTMLElement> {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-grid';
        
        if (showPastDays) {
            calendar.classList.add('show-past');
        }
        
        return calendar;
    }

    // Nowa metoda pomocnicza do mapowania plików na daty
    private async mapFilesToDates(files: {file: TFile, date: Date}[]): Promise<Map<string, TFile[]>> {
        const taggedFiles = new Map<string, TFile[]>();
        
        for (const {file, date: fileDate} of files) {
            const dateStr = window.moment(fileDate).format('YYYY-MM-DD');
            
            if (!taggedFiles.has(dateStr)) {
                taggedFiles.set(dateStr, []);
            }
            taggedFiles.get(dateStr)?.push(file);
        }
        
        return taggedFiles;
    }

    // Metoda pomocnicza do implementacji logiki drag-and-drop
    private setupDroppable(element: HTMLElement, onDrop: (file: TFile) => Promise<void>): void {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('dragover');
        });
        
        element.addEventListener('dragleave', () => {
            element.classList.remove('dragover');
        });
        
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('dragover');
            
            const filePath = e.dataTransfer?.getData('text/plain');
            if (!filePath) return;
            
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return;
            
            await onDrop(file);
        });
    }

    // Dodać metodę czyszczenia cache'u
    private clearVirtualFileCache(): void {
        this.virtualFileCache.clear();
    }

    // I wywoływać ją w odpowiednich momentach, np. przy zmianie miesiąca
    // lub w metodzie onunload
    onunload() {
        // ... istniejący kod
        this.clearVirtualFileCache();
    }
} 