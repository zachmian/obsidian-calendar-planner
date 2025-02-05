import { Plugin, TFile, MarkdownView, PluginSettingTab, Setting, WorkspaceLeaf, moment } from 'obsidian';

interface TaggedCalendarSettings {
    dateField: string;
    dateFormat: string;
    defaultView: 'month' | 'week';
}

const DEFAULT_SETTINGS: TaggedCalendarSettings = {
    dateField: 'date',
    dateFormat: 'YYYY-MM-DD',
    defaultView: 'month'
}

interface CalendarState {
    currentDate: Date;
    view: 'month' | 'week';
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

        containerEl.createEl('h2', {text: 'Ustawienia Tagged Calendar'});

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
    }
}

export default class TaggedCalendarPlugin extends Plugin {
    settings: TaggedCalendarSettings;
    private container: HTMLElement;
    private currentTag: string;
    private activeLeaf: WorkspaceLeaf | null = null;

    async onload() {
        await this.loadSettings();

        // Dodaj panel ustawień
        this.addSettingTab(new TaggedCalendarSettingTab(this.app, this));

        // Rejestracja bloku markdown
        this.registerMarkdownCodeBlockProcessor('calendar-planner', async (source, el, ctx) => {
            const [query] = source.split('\n');
            if (!query) return;

            const calendar = document.createElement('div');
            calendar.className = 'calendar-planner';
            
            await this.renderCalendar(calendar, query.trim());
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
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async renderCalendar(container: HTMLElement, query: string) {
        console.log("Renderowanie kalendarza dla tagu:", query);
        
        // Wyczyść kontener przed renderowaniem
        container.empty();
        
        this.container = container;
        this.currentTag = query;
        
        // Stan kalendarza
        const state: CalendarState = {
            currentDate: new Date(),
            view: this.settings.defaultView
        };

        // Kontener dla kontrolek
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.justifyContent = 'space-between';
        controls.style.marginBottom = '10px';
        controls.style.padding = '5px';

        // Przyciski nawigacji
        const navigationDiv = document.createElement('div');
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '←';
        prevButton.addEventListener('click', () => {
            if (state.view === 'month') {
                state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1);
            } else {
                state.currentDate = new Date(state.currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            updateCalendar();
        });

        const todayButton = document.createElement('button');
        todayButton.textContent = 'Dziś';
        todayButton.className = 'today-button';
        todayButton.addEventListener('click', () => {
            state.currentDate = new Date();
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
            updateCalendar();
        });

        const dateLabel = document.createElement('span');
        dateLabel.style.margin = '0 10px';

        navigationDiv.appendChild(prevButton);
        navigationDiv.appendChild(todayButton);
        navigationDiv.appendChild(nextButton);
        navigationDiv.appendChild(dateLabel);

        // Przełącznik widoku
        const viewToggle = document.createElement('select');
        viewToggle.innerHTML = `
            <option value="month">Miesiąc</option>
            <option value="week">Tydzień</option>
        `;
        viewToggle.value = state.view;
        viewToggle.addEventListener('change', (e) => {
            state.view = (e.target as HTMLSelectElement).value as 'month' | 'week';
            updateCalendar();
        });

        controls.appendChild(navigationDiv);
        controls.appendChild(viewToggle);
        container.appendChild(controls);

        // Kontener na kalendarz
        const calendarContainer = document.createElement('div');
        container.appendChild(calendarContainer);

        // Funkcja aktualizująca kalendarz
        const updateCalendar = async () => {
            // Wyczyść poprzedni widok
            calendarContainer.innerHTML = '';

            // Aktualizuj etykietę daty
            const monthNamesGenitive = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
                                      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
            const monthNamesNominative = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                                        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
            
            if (state.view === 'month') {
                dateLabel.textContent = `${monthNamesNominative[state.currentDate.getMonth()]} ${state.currentDate.getFullYear()}`;
                await this.renderMonthView(calendarContainer, state.currentDate, query);
            } else {
                const weekStart = new Date(state.currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const startMonth = monthNamesGenitive[weekStart.getMonth()];
                const endMonth = monthNamesGenitive[weekEnd.getMonth()];
                const startYear = weekStart.getFullYear();
                const endYear = weekEnd.getFullYear();

                if (startMonth === endMonth && startYear === endYear) {
                    dateLabel.textContent = `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${startYear}`;
                } else if (startYear === endYear) {
                    dateLabel.textContent = `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${startYear}`;
                } else {
                    dateLabel.textContent = `${weekStart.getDate()} ${startMonth} ${startYear} - ${weekEnd.getDate()} ${endMonth} ${endYear}`;
                }
                
                await this.renderWeekView(calendarContainer, state.currentDate, query);
            }
        };

        // Inicjalne renderowanie
        await updateCalendar();
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

    private async getFilteredFiles(query: string): Promise<TFile[]> {
        const files = this.app.vault.getMarkdownFiles();
        
        // Jeśli to proste wyszukiwanie po tagu (dla kompatybilności wstecznej)
        if (!query.includes(' ') && !query.includes(':')) {
            const tag = query.startsWith('#') ? query : '#' + query;
            return this.filterFilesByTag(files, tag);
        }

        // Parsuj zaawansowane zapytanie
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

    private matchesCondition(file: TFile, cache: any, condition: string): boolean {
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

    private async renderMonthView(container: HTMLElement, date: Date, query: string) {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-grid';
        
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
        const taggedFiles = new Map<string, TFile[]>();

        for (const file of files) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) continue;

            const fileDate = metadata.frontmatter[this.settings.dateField];
            if (!fileDate) continue;

            const parsedDate = this.parseDateFromLink(fileDate);
            if (!parsedDate) continue;

            const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
            const dateStr = localDate.toISOString().split('T')[0];
            
            if (!taggedFiles.has(dateStr)) {
                taggedFiles.set(dateStr, []);
            }
            taggedFiles.get(dateStr)?.push(file);
        }

        // Pierwszy i ostatni dzień miesiąca
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // Dodaj puste dni na początku miesiąca
        let firstDayOfWeek = firstDay.getDay() || 7; // Konwersja 0 (niedziela) na 7
        for (let i = 1; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        // Dodaj dni miesiąca
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
            const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);
            const dateStr = localDate.toISOString().split('T')[0];
            const entries = taggedFiles.get(dateStr) || [];
            
            const dayEl = this.createDroppableDay(currentDate, entries);
            calendar.appendChild(dayEl);
        }

        container.appendChild(calendar);
    }

    private async renderWeekView(container: HTMLElement, date: Date, query: string) {
        const calendar = document.createElement('div');
        calendar.className = 'calendar-grid';
        
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
        const taggedFiles = new Map<string, TFile[]>();

        for (const file of files) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter) continue;

            const fileDate = metadata.frontmatter[this.settings.dateField];
            if (!fileDate) continue;

            const parsedDate = this.parseDateFromLink(fileDate);
            if (!parsedDate) continue;

            const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
            const dateStr = localDate.toISOString().split('T')[0];
            
            if (!taggedFiles.has(dateStr)) {
                taggedFiles.set(dateStr, []);
            }
            taggedFiles.get(dateStr)?.push(file);
        }

        // Znajdź początek tygodnia
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

        // Renderuj dni tygodnia
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            
            const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);
            const dateStr = localDate.toISOString().split('T')[0];
            const entries = taggedFiles.get(dateStr) || [];
            
            const dayEl = this.createDroppableDay(currentDate, entries);
            calendar.appendChild(dayEl);
        }

        container.appendChild(calendar);
    }

    private async updateFileDate(file: TFile, newDate: string) {
        try {
            console.log('Aktualizacja daty:', {
                file: file.path,
                newDate: newDate,
                dateField: this.settings.dateField
            });

            const content = await this.app.vault.read(file);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const match = content.match(frontmatterRegex);
            
            if (match) {
                const frontmatter = match[1];
                const lines = frontmatter.split('\n');
                
                // Escapowanie znaków specjalnych w nazwie pola
                const escapedFieldName = this.settings.dateField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const dateFieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`);
                
                let dateUpdated = false;
                const updatedLines = lines.map(line => {
                    if (line.match(dateFieldRegex)) {
                        dateUpdated = true;
                        const formattedDate = this.formatDateAsLink(new Date(newDate));
                        console.log('Aktualizacja linii:', {
                            stara: line,
                            nowa: `${this.settings.dateField}: ${formattedDate}`
                        });
                        return `${this.settings.dateField}: ${formattedDate}`;
                    }
                    return line;
                });

                // Jeśli nie znaleziono pola daty, dodaj je
                if (!dateUpdated) {
                    const formattedDate = this.formatDateAsLink(new Date(newDate));
                    console.log('Dodawanie nowego pola daty:', formattedDate);
                    updatedLines.push(`${this.settings.dateField}: ${formattedDate}`);
                }
                
                const newFrontmatter = updatedLines.join('\n');
                const newContent = content.replace(frontmatterRegex, `---\n${newFrontmatter}\n---`);
                
                console.log('Nowy frontmatter:', newFrontmatter);
                
                await this.app.vault.modify(file, newContent);
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.app.metadataCache.trigger('changed', file);
            } else {
                // Jeśli nie ma frontmattera, dodaj go
                const formattedDate = this.formatDateAsLink(new Date(newDate));
                const newFrontmatter = `---\n${this.settings.dateField}: ${formattedDate}\n---\n`;
                const newContent = newFrontmatter + content;
                
                console.log('Tworzenie nowego frontmattera:', newFrontmatter);
                
                await this.app.vault.modify(file, newContent);
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.app.metadataCache.trigger('changed', file);
            }
        } catch (error) {
            console.error('Błąd podczas aktualizacji daty:', error);
        }
    }

    private createDraggableEntry(file: TFile) {
        const entry = document.createElement('div');
        entry.className = 'calendar-entry';
        entry.textContent = file.basename;
        entry.setAttribute('draggable', 'true');
        entry.dataset.filePath = file.path;
        
        entry.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.workspace.getLeaf().openFile(file);
        });
        
        entry.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', file.path);
            entry.style.opacity = '0.5';
        });
        
        entry.addEventListener('dragend', () => {
            entry.style.opacity = '1';
        });
        
        return entry;
    }

    private createDroppableDay(date: Date, entries: TFile[] = []) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (entries.length) {
            dayEl.classList.add('has-entries');
        }
        
        // Sprawdź czy to dzisiejszy dzień
        const today = new Date();
        if (date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate().toString();
        dayEl.appendChild(dayNumber);
        
        dayEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            dayEl.classList.add('dragover');
        });
        
        dayEl.addEventListener('dragleave', () => {
            dayEl.classList.remove('dragover');
        });
        
        dayEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            dayEl.classList.remove('dragover');
            
            const filePath = e.dataTransfer?.getData('text/plain');
            if (!filePath) return;
            
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) return;
            
            const newDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .split('T')[0];
            
            await this.updateFileDate(file, newDate);
            
            // Pełne przeładowanie widoku
            this.container.empty();
            await this.renderCalendar(this.container, this.currentTag);
            
            // Wymuś ponowne przerenderowanie widoku
            this.app.workspace.trigger('layout-change');
        });
        
        entries.forEach(file => {
            const entry = this.createDraggableEntry(file);
            dayEl.appendChild(entry);
        });
        
        return dayEl;
    }
} 