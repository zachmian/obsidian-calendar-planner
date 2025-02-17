var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// main.ts
__export(exports, {
  default: () => TaggedCalendarPlugin
});
var import_obsidian = __toModule(require("obsidian"));
var DEFAULT_SETTINGS = {
  dateField: "date",
  dateFormat: "YYYY-MM-DD",
  defaultView: "month",
  recurringLookAhead: 2,
  recurrenceField: "recurrence",
  generateDatesField: false,
  newNotesFolder: ""
};
var TaggedCalendarSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Ustawienia Calendar Planner" });
    new import_obsidian.Setting(containerEl).setName("Nazwa pola daty").setDesc('Nazwa pola w frontmatter, kt\xF3re zawiera dat\u0119 (np. "date" lub "data publikacji")').addText((text) => text.setPlaceholder("date").setValue(this.plugin.settings.dateField).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.dateField = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Format daty").setDesc("Format daty u\u017Cywaj\u0105cy sk\u0142adni Moment.js. Na przyk\u0142ad: YYYY-MM-DD lub DD MMMM YYYY").addText((text) => text.setPlaceholder("YYYY-MM-DD").setValue(this.plugin.settings.dateFormat).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.dateFormat = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Domy\u015Blny widok").setDesc("Wybierz, kt\xF3ry widok ma by\u0107 domy\u015Blnie wy\u015Bwietlany przy otwarciu kalendarza").addDropdown((dropdown) => dropdown.addOption("month", "Miesi\u0105c").addOption("week", "Tydzie\u0144").setValue(this.plugin.settings.defaultView).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.defaultView = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Okres powtarzania").setDesc("Ile lat do przodu generowa\u0107 powtarzaj\u0105ce si\u0119 notatki").addSlider((slider) => slider.setLimits(1, 5, 1).setValue(this.plugin.settings.recurringLookAhead).setDynamicTooltip().onChange((value) => __async(this, null, function* () {
      this.plugin.settings.recurringLookAhead = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Nazwa pola powtarzalno\u015Bci").setDesc('Nazwa pola w frontmatter u\u017Cywanego do oznaczania powtarzaj\u0105cych si\u0119 notatek (np. "recurrence" lub "powtarzanie")').addText((text) => text.setPlaceholder("recurrence").setValue(this.plugin.settings.recurrenceField).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.recurrenceField = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Generuj pole dates").setDesc("Czy generowa\u0107 pole dates w frontmatter dla notatek powtarzalnych. Je\u015Bli wy\u0142\u0105czone, daty b\u0119d\u0105 generowane tylko w kalendarzu.").addToggle((toggle) => toggle.setValue(this.plugin.settings.generateDatesField).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.generateDatesField = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Folder dla nowych notatek").setDesc('\u015Acie\u017Cka do folderu, w kt\xF3rym b\u0119d\u0105 tworzone nowe notatki (np. "Notatki/2024"). Pozostaw puste, aby u\u017Cywa\u0107 g\u0142\xF3wnego folderu.').addText((text) => text.setPlaceholder("Notatki/2024").setValue(this.plugin.settings.newNotesFolder).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.newNotesFolder = value;
      yield this.plugin.saveSettings();
    })));
  }
};
var TaggedCalendarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.filters = [];
    this.currentFilterIndex = 0;
    this.activeLeaf = null;
    this.virtualFileCache = new Map();
    this.showUnplanned = false;
  }
  onload() {
    return __async(this, null, function* () {
      yield this.loadSettings();
      this.addSettingTab(new TaggedCalendarSettingTab(this.app, this));
      this.registerMarkdownCodeBlockProcessor("calendar-planner", (source, el, ctx) => __async(this, null, function* () {
        const lines = source.split("\n").filter((line) => line.trim());
        this.filters = [];
        let showUnplanned = false;
        if (lines.length === 0)
          return;
        if (lines.length === 1 && !lines[0].includes(":")) {
          this.filters = [{
            name: "Domy\u015Blny",
            query: lines[0].trim()
          }];
        } else {
          this.filters = lines.filter((line) => !line.startsWith("+")).map((line) => {
            const [name, ...queryParts] = line.split(":");
            return {
              name: name.trim(),
              query: queryParts.join(":").trim()
            };
          });
          showUnplanned = lines.some((line) => line.trim() === "+unplanned");
        }
        if (this.filters.length === 0)
          return;
        const calendar = document.createElement("div");
        calendar.className = "calendar-planner";
        this.currentFilterIndex = 0;
        this.showUnplanned = showUnplanned;
        yield this.renderCalendar(calendar, this.filters[0].query, showUnplanned);
        el.appendChild(calendar);
        this.activeLeaf = this.app.workspace.activeLeaf;
      }));
      this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => __async(this, null, function* () {
        if (this.container && this.currentTag && leaf !== this.activeLeaf) {
          this.activeLeaf = leaf;
          this.container.empty();
          yield this.renderCalendar(this.container, this.currentTag);
        }
      })));
      this.registerEvent(this.app.vault.on("modify", (file) => __async(this, null, function* () {
        if (this.container && this.currentTag) {
          this.container.empty();
          yield this.renderCalendar(this.container, this.currentTag);
        }
      })));
      this.currentView = this.settings.defaultView;
      this.currentDate = new Date();
    });
  }
  loadSettings() {
    return __async(this, null, function* () {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
    });
  }
  saveSettings() {
    return __async(this, null, function* () {
      yield this.saveData(this.settings);
    });
  }
  renderCalendar(container, query, showUnplanned = false) {
    return __async(this, null, function* () {
      console.log("[renderCalendar] Start", {
        query,
        showUnplanned,
        currentShowUnplanned: this.showUnplanned,
        stackTrace: new Error().stack
      });
      if (this.showUnplanned && showUnplanned === false) {
        console.log("[renderCalendar] Zachowuj\u0119 poprzedni\u0105 warto\u015B\u0107 showUnplanned", {
          previous: this.showUnplanned,
          new: showUnplanned
        });
        showUnplanned = this.showUnplanned;
      }
      container.empty();
      this.container = container;
      this.currentTag = query;
      this.showUnplanned = showUnplanned;
      const state = {
        currentDate: this.currentDate,
        view: this.currentView,
        showUnplanned: this.showUnplanned
      };
      const controls = document.createElement("div");
      controls.className = "calendar-controls";
      const navigationDiv = document.createElement("div");
      navigationDiv.className = "calendar-navigation";
      const prevButton = document.createElement("button");
      prevButton.textContent = "\u2190";
      prevButton.addEventListener("click", () => {
        if (state.view === "month") {
          state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1);
        } else {
          state.currentDate = new Date(state.currentDate.getTime() - 7 * 24 * 60 * 60 * 1e3);
        }
        this.currentDate = state.currentDate;
        updateCalendar();
      });
      const todayButton = document.createElement("button");
      todayButton.textContent = "Dzi\u015B";
      todayButton.className = "today-button";
      todayButton.addEventListener("click", () => {
        state.currentDate = new Date();
        this.currentDate = state.currentDate;
        updateCalendar();
      });
      const nextButton = document.createElement("button");
      nextButton.textContent = "\u2192";
      nextButton.addEventListener("click", () => {
        if (state.view === "month") {
          state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1);
        } else {
          state.currentDate = new Date(state.currentDate.getTime() + 7 * 24 * 60 * 60 * 1e3);
        }
        this.currentDate = state.currentDate;
        updateCalendar();
      });
      const dateLabel = document.createElement("span");
      dateLabel.style.margin = "0 10px";
      navigationDiv.appendChild(prevButton);
      navigationDiv.appendChild(todayButton);
      navigationDiv.appendChild(nextButton);
      navigationDiv.appendChild(dateLabel);
      const viewControls = document.createElement("div");
      viewControls.className = "view-controls";
      const viewToggle = document.createElement("select");
      viewToggle.innerHTML = `
            <option value="month">Miesi\u0105c</option>
            <option value="week">Tydzie\u0144</option>
        `;
      viewToggle.value = this.currentView;
      viewToggle.addEventListener("change", (e) => {
        this.currentView = e.target.value;
        state.view = this.currentView;
        updateCalendar();
      });
      viewControls.appendChild(viewToggle);
      if (this.filters.length > 1) {
        const filterSelector = this.createFilterSelector();
        viewControls.appendChild(filterSelector);
      }
      controls.appendChild(navigationDiv);
      controls.appendChild(viewControls);
      container.appendChild(controls);
      const gridContainer = document.createElement("div");
      gridContainer.className = "calendar-grid-container";
      container.appendChild(gridContainer);
      console.log("[renderCalendar] Pobieranie przefiltrowanych plik\xF3w");
      const filteredFiles = yield this.getFilteredFiles(query);
      console.log("[renderCalendar] Otrzymano przefiltrowane pliki", {
        count: filteredFiles.length,
        files: filteredFiles.map((f) => ({
          path: f.file.path,
          date: f.date.toISOString()
        }))
      });
      const refreshView = () => __async(this, null, function* () {
        console.log("[refreshView] Start", {
          showUnplanned: this.showUnplanned,
          currentTag: this.currentTag,
          stackTrace: new Error().stack
        });
        gridContainer.innerHTML = "";
        const oldUnplannedContainer = container.querySelector(".unplanned-container");
        if (oldUnplannedContainer) {
          oldUnplannedContainer.remove();
        }
        if (state.view === "month") {
          yield this.renderMonthView(gridContainer, state.currentDate, this.filters[this.currentFilterIndex].query, refreshView);
        } else {
          yield this.renderWeekView(gridContainer, state.currentDate, this.filters[this.currentFilterIndex].query, refreshView);
        }
        if (this.showUnplanned) {
          console.log("[refreshView] Dodaj\u0119 sekcj\u0119 niezaplanowanych");
          const newUnplannedContainer = document.createElement("div");
          newUnplannedContainer.className = "unplanned-container";
          const unplannedSection = yield this.createUnplannedSection(this.currentTag, refreshView);
          newUnplannedContainer.appendChild(unplannedSection);
          container.appendChild(newUnplannedContainer);
        }
      });
      const updateCalendar = () => __async(this, null, function* () {
        yield refreshView();
        const monthNamesGenitive = [
          "stycznia",
          "lutego",
          "marca",
          "kwietnia",
          "maja",
          "czerwca",
          "lipca",
          "sierpnia",
          "wrze\u015Bnia",
          "pa\u017Adziernika",
          "listopada",
          "grudnia"
        ];
        const monthNamesNominative = [
          "Stycze\u0144",
          "Luty",
          "Marzec",
          "Kwiecie\u0144",
          "Maj",
          "Czerwiec",
          "Lipiec",
          "Sierpie\u0144",
          "Wrzesie\u0144",
          "Pa\u017Adziernik",
          "Listopad",
          "Grudzie\u0144"
        ];
        if (state.view === "month") {
          dateLabel.textContent = `${monthNamesNominative[state.currentDate.getMonth()]} ${state.currentDate.getFullYear()}`;
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
        }
      });
      yield updateCalendar();
    });
  }
  formatDateAsLink(date) {
    const formattedDate = window.moment(date).format(this.settings.dateFormat);
    const finalFormat = `"[[${formattedDate}]]"`;
    console.log("Formatowanie daty:", {
      input: date,
      formatted: formattedDate,
      output: finalFormat
    });
    return finalFormat;
  }
  parseDateFromLink(dateString) {
    if (typeof dateString !== "string") {
      try {
        dateString = String(dateString);
      } catch (e) {
        return null;
      }
    }
    dateString = dateString.replace(/["\[\]]/g, "");
    const parsed = window.moment(dateString, this.settings.dateFormat, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
    const fallbackParsed = window.moment(dateString);
    if (fallbackParsed.isValid()) {
      return fallbackParsed.toDate();
    }
    return null;
  }
  getFilteredFiles(query) {
    return __async(this, null, function* () {
      console.log("[getFilteredFiles] Start", {
        query,
        stackTrace: new Error().stack
      });
      const conditions = this.splitQueryPreservingQuotes(query);
      console.log("[getFilteredFiles] Podzielone warunki:", conditions);
      const allFiles = [];
      const files = this.app.vault.getMarkdownFiles();
      const recurringFiles = files.filter((file) => {
        var _a;
        const metadata = this.app.metadataCache.getFileCache(file);
        return (_a = metadata == null ? void 0 : metadata.frontmatter) == null ? void 0 : _a[this.settings.recurrenceField];
      });
      const recurringDates = yield this.generateRecurringDates(recurringFiles);
      for (const file of files) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter))
          continue;
        if (metadata.frontmatter[this.settings.recurrenceField])
          continue;
        let matchesAllConditions = true;
        for (const condition of conditions) {
          if (!this.matchesCondition(file, metadata, condition)) {
            matchesAllConditions = false;
            break;
          }
        }
        if (!matchesAllConditions)
          continue;
        const dateStr = metadata.frontmatter[this.settings.dateField];
        if (!dateStr)
          continue;
        console.log("[getFilteredFiles] Znaleziono plik", {
          file: file.path,
          dateStr,
          metadata: metadata.frontmatter
        });
        const date = this.parseDateFromLink(dateStr);
        if (date) {
          allFiles.push({ file, date });
        }
      }
      recurringDates.forEach(({ file, dates }) => {
        console.log("[getFilteredFiles] Przetwarzanie pliku rekurencyjnego", {
          file: file.path,
          datesCount: dates.length
        });
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter))
          return;
        let matchesAllConditions = true;
        for (const condition of conditions) {
          if (!this.matchesCondition(file, metadata, condition)) {
            matchesAllConditions = false;
            break;
          }
        }
        if (!matchesAllConditions)
          return;
        const originalDate = this.parseDateFromLink(metadata.frontmatter[this.settings.dateField]);
        if (originalDate) {
          allFiles.push({ file, date: originalDate });
          dates.forEach((date) => {
            if (date > originalDate) {
              allFiles.push({ file, date });
            }
          });
        }
      });
      allFiles.sort((a, b) => a.date.getTime() - b.date.getTime());
      return allFiles;
    });
  }
  filterFilesByQuery(files, query) {
    const conditions = query.split(" ").filter((part) => part.trim());
    return files.filter((file) => {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache)
        return false;
      return conditions.every((condition) => {
        if (condition.startsWith("-")) {
          return !this.matchesCondition(file, cache, condition.substring(1));
        }
        if (condition.toUpperCase() === "OR") {
          return true;
        }
        return this.matchesCondition(file, cache, condition);
      });
    });
  }
  generateRecurringDates(files) {
    return __async(this, null, function* () {
      const result = [];
      const currentDate = new Date();
      const maxDate = new Date(currentDate.getFullYear() + this.settings.recurringLookAhead, currentDate.getMonth(), currentDate.getDate());
      const recurrenceMap = {
        "monthly": "monthly",
        "miesi\u0119cznie": "monthly",
        "miesiecznie": "monthly",
        "yearly": "yearly",
        "rocznie": "yearly"
      };
      for (const file of files) {
        try {
          const metadata = this.app.metadataCache.getFileCache(file);
          if (!(metadata == null ? void 0 : metadata.frontmatter))
            continue;
          const recurrenceValue = metadata.frontmatter[this.settings.recurrenceField];
          if (!recurrenceValue)
            continue;
          const recurrence = recurrenceMap[recurrenceValue.toString().toLowerCase()];
          if (!recurrence)
            continue;
          const originalDate = this.parseDateFromLink(metadata.frontmatter[this.settings.dateField]);
          if (!originalDate)
            continue;
          const dates = [];
          let currentInstance = new Date(originalDate);
          let instanceCount = 0;
          const MAX_INSTANCES = 100;
          currentInstance.setHours(12, 0, 0, 0);
          if (recurrence === "monthly") {
            currentInstance = new Date(currentInstance.getFullYear(), currentInstance.getMonth() + 1, currentInstance.getDate());
          } else if (recurrence === "yearly") {
            currentInstance = new Date(currentInstance.getFullYear() + 1, currentInstance.getMonth(), currentInstance.getDate());
          }
          while (currentInstance <= maxDate && instanceCount < MAX_INSTANCES) {
            dates.push(new Date(currentInstance));
            instanceCount++;
            if (recurrence === "monthly") {
              currentInstance = new Date(currentInstance.getFullYear(), currentInstance.getMonth() + 1, currentInstance.getDate());
            } else if (recurrence === "yearly") {
              currentInstance = new Date(currentInstance.getFullYear() + 1, currentInstance.getMonth(), currentInstance.getDate());
            }
            currentInstance.setHours(12, 0, 0, 0);
          }
          if (dates.length > 0) {
            console.log("Wygenerowane daty dla pliku:", {
              file: file.path,
              originalDate,
              dates: dates.map((d) => d.toISOString())
            });
            result.push({ file, dates });
          }
        } catch (error) {
          console.error("B\u0142\u0105d podczas generowania dat dla pliku:", file.path, error);
          continue;
        }
      }
      return result;
    });
  }
  matchesCondition(file, cache, condition) {
    var _a;
    if (condition.startsWith("-")) {
      return !this.matchesCondition(file, cache, condition.substring(1));
    }
    if (condition.startsWith("tag:") || condition.startsWith("#")) {
      const tag2 = condition.startsWith("tag:") ? condition.substring(4) : condition;
      const searchTag = tag2.startsWith("#") ? tag2 : "#" + tag2;
      const frontmatterTags = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.tags;
      if (Array.isArray(frontmatterTags)) {
        if (frontmatterTags.includes(searchTag) || frontmatterTags.includes(searchTag.substring(1))) {
          return true;
        }
      }
      const tags = cache == null ? void 0 : cache.tags;
      if (tags) {
        return tags.some((t) => t.tag === searchTag || t.tag === searchTag.substring(1));
      }
      return false;
    }
    if (condition.startsWith("path:")) {
      const path = condition.substring(5).replace(/"/g, "");
      return file.path.includes(path);
    }
    const tag = condition.startsWith("#") ? condition : "#" + condition;
    return this.filterFilesByTag([file], tag).length > 0;
  }
  filterFilesByTag(files, tag) {
    return files.filter((file) => {
      var _a;
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatterTags = (_a = cache == null ? void 0 : cache.frontmatter) == null ? void 0 : _a.tags;
      if (Array.isArray(frontmatterTags)) {
        if (frontmatterTags.includes(tag) || frontmatterTags.includes(tag.substring(1))) {
          return true;
        }
      }
      const tags = cache == null ? void 0 : cache.tags;
      if (tags) {
        return tags.some((t) => t.tag === tag || t.tag === tag.substring(1));
      }
      return false;
    });
  }
  renderMonthView(container, date, query, refreshView) {
    return __async(this, null, function* () {
      var _a;
      console.log("[renderMonthView] Start", {
        date: date.toISOString(),
        query
      });
      const calendar = document.createElement("div");
      calendar.className = "calendar-grid";
      const daysOfWeek = ["Pon", "Wt", "\u015Ar", "Czw", "Pt", "Sob", "Niedz"];
      daysOfWeek.forEach((day) => {
        const dayHeader = document.createElement("div");
        dayHeader.className = "calendar-header";
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
      });
      const files = yield this.getFilteredFiles(query);
      const taggedFiles = new Map();
      for (const { file, date: fileDate } of files) {
        const dateStr = window.moment(fileDate).format("YYYY-MM-DD");
        console.log("[renderMonthView] Mapowanie pliku na dat\u0119", {
          file: file.path,
          date: dateStr,
          originalDate: fileDate
        });
        if (!taggedFiles.has(dateStr)) {
          taggedFiles.set(dateStr, []);
        }
        (_a = taggedFiles.get(dateStr)) == null ? void 0 : _a.push(file);
      }
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      let firstDayOfWeek = firstDay.getDay() || 7;
      for (let i = 1; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "calendar-day empty";
        calendar.appendChild(emptyDay);
      }
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const currentDate = new Date(date.getFullYear(), date.getMonth(), day, 12, 0, 0, 0);
        const dateStr = window.moment(currentDate).format("YYYY-MM-DD");
        const entries = taggedFiles.get(dateStr) || [];
        console.log("[renderMonthView] Renderowanie dnia", {
          date: dateStr,
          currentDate: currentDate.toISOString(),
          entriesCount: entries.length,
          entries: entries.map((f) => f.path)
        });
        const dayEl = this.createDroppableDay(currentDate, entries, refreshView);
        calendar.appendChild(dayEl);
      }
      container.appendChild(calendar);
    });
  }
  renderWeekView(container, date, query, refreshView) {
    return __async(this, null, function* () {
      var _a;
      const calendar = document.createElement("div");
      calendar.className = "calendar-grid";
      const daysOfWeek = ["Pon", "Wt", "\u015Ar", "Czw", "Pt", "Sob", "Niedz"];
      daysOfWeek.forEach((day) => {
        const dayHeader = document.createElement("div");
        dayHeader.className = "calendar-header";
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
      });
      const files = yield this.getFilteredFiles(query);
      const taggedFiles = new Map();
      for (const { file, date: fileDate } of files) {
        const localDate = new Date(fileDate.getTime() - fileDate.getTimezoneOffset() * 6e4);
        const dateStr = localDate.toISOString().split("T")[0];
        if (!taggedFiles.has(dateStr)) {
          taggedFiles.set(dateStr, []);
        }
        (_a = taggedFiles.get(dateStr)) == null ? void 0 : _a.push(file);
      }
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);
        const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 6e4);
        const dateStr = localDate.toISOString().split("T")[0];
        const entries = taggedFiles.get(dateStr) || [];
        const dayEl = this.createDroppableDay(currentDate, entries, refreshView);
        calendar.appendChild(dayEl);
      }
      container.appendChild(calendar);
    });
  }
  updateFileDate(file, newDate, refreshView) {
    return __async(this, null, function* () {
      var _a, _b;
      try {
        console.log("[updateFileDate] Start", {
          file: file.path,
          newDate,
          showUnplanned: this.showUnplanned,
          currentView: this.currentView,
          currentDate: this.currentDate
        });
        const viewToggle = (_a = this.container) == null ? void 0 : _a.querySelector(".view-controls select");
        const currentView = viewToggle == null ? void 0 : viewToggle.value;
        const currentShowUnplanned = this.showUnplanned;
        let content = yield this.app.vault.read(file);
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (match) {
          console.log("[updateFileDate] Znaleziono frontmatter", {
            originalFrontmatter: match[1]
          });
          const frontmatter = match[1];
          const lines = frontmatter.split("\n");
          const escapedFieldName = this.settings.dateField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const dateFieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`);
          const updatedLines = lines.filter((line) => {
            const trimmed = line.trim();
            if (!this.settings.generateDatesField) {
              return true;
            }
            return !trimmed.startsWith("dates:") && !trimmed.startsWith('- "[[');
          }).filter((line) => !line.match(dateFieldRegex));
          if (newDate !== null) {
            const formattedDate = this.formatDateAsLink(new Date(newDate));
            updatedLines.push(`${this.settings.dateField}: ${formattedDate}`);
          }
          const newFrontmatter = updatedLines.join("\n");
          content = content.replace(frontmatterRegex, `---
${newFrontmatter}
---`);
          console.log("[updateFileDate] Przygotowano nowy frontmatter", {
            newFrontmatter
          });
          if (this.settings.newNotesFolder) {
            yield this.ensureFolderExists(this.settings.newNotesFolder);
          }
          yield this.app.vault.modify(file, content);
          yield new Promise((resolve) => {
            const maxAttempts = 10;
            let attempts = 0;
            const checkMetadata = () => {
              attempts++;
              const metadata = this.app.metadataCache.getFileCache(file);
              const frontmatter2 = metadata == null ? void 0 : metadata.frontmatter;
              const isUpdated = newDate === null ? !(frontmatter2 == null ? void 0 : frontmatter2[this.settings.dateField]) : (frontmatter2 == null ? void 0 : frontmatter2[this.settings.dateField]) === this.formatDateAsLink(new Date(newDate)).replace(/"/g, "");
              console.log("[updateFileDate] Sprawdzanie metadanych", {
                attempt: attempts,
                isUpdated,
                currentMetadata: frontmatter2
              });
              if (isUpdated || attempts >= maxAttempts) {
                resolve();
              } else {
                setTimeout(checkMetadata, 100);
              }
            };
            checkMetadata();
          });
          if (newDate !== null && this.settings.generateDatesField) {
            const metadata = this.app.metadataCache.getFileCache(file);
            if ((_b = metadata == null ? void 0 : metadata.frontmatter) == null ? void 0 : _b[this.settings.recurrenceField]) {
              yield this.initializeRecurringNoteDates(file, new Date(newDate));
            }
          }
          yield this.app.metadataCache.trigger("changed", file);
          yield new Promise((resolve) => setTimeout(resolve, 200));
          if (this.container && this.currentTag) {
            this.container.empty();
            yield this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
            setTimeout(() => __async(this, null, function* () {
              if (this.container && this.currentTag) {
                this.container.empty();
                yield this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
              }
            }), 500);
          }
        }
        console.log("[updateFileDate] Zako\u0144czono ca\u0142\u0105 operacj\u0119");
      } catch (error) {
        console.error("[updateFileDate] B\u0142\u0105d:", error);
      }
    });
  }
  initializeRecurringNoteDates(file, originalDate) {
    return __async(this, null, function* () {
      try {
        console.log("Inicjalizacja/aktualizacja dat rekurencyjnych:", {
          file: file.path,
          originalDate
        });
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter)) {
          console.log("Brak frontmattera w pliku");
          return;
        }
        const recurrenceValue = metadata.frontmatter[this.settings.recurrenceField];
        if (!recurrenceValue) {
          console.log("Brak warto\u015Bci pola recurrence");
          return;
        }
        originalDate.setHours(12, 0, 0, 0);
        const dates = yield this.generateRecurringDates([file]);
        if (dates.length === 0) {
          console.log("Nie wygenerowano \u017Cadnych dat");
          return;
        }
        const futureDates = dates[0].dates;
        console.log("Wygenerowane przysz\u0142e daty:", futureDates);
        const dateLinks = futureDates.map((date) => {
          date.setHours(12, 0, 0, 0);
          return this.formatDateAsLink(date);
        });
        dateLinks.unshift(this.formatDateAsLink(originalDate));
        const uniqueDateLinks = [...new Set(dateLinks)];
        let content = yield this.app.vault.read(file);
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (match) {
          const frontmatter = match[1];
          const lines = frontmatter.split("\n");
          let lastIndex = lines.length - 1;
          while (lastIndex >= 0 && lines[lastIndex].trim() === "") {
            lastIndex--;
          }
          const newLines = lines.filter((line, index) => {
            if (index > lastIndex)
              return false;
            const trimmed = line.trim();
            return !trimmed.startsWith("dates:") && !trimmed.startsWith('- "[[');
          });
          newLines.push("dates:");
          uniqueDateLinks.forEach((link) => {
            newLines.push(`  - ${link}`);
          });
          const newFrontmatter = newLines.join("\n");
          const newContent = content.replace(frontmatterRegex, `---
${newFrontmatter}
---`);
          console.log("Aktualizacja frontmattera:", {
            stary: frontmatter,
            nowy: newFrontmatter
          });
          if (this.settings.newNotesFolder) {
            yield this.ensureFolderExists(this.settings.newNotesFolder);
          }
          yield this.app.vault.modify(file, newContent);
        }
      } catch (error) {
        console.error("B\u0142\u0105d podczas inicjalizacji/aktualizacji dat rekurencyjnych:", error);
      }
    });
  }
  createDraggableEntry(file, date) {
    var _a, _b;
    const entry = document.createElement("div");
    entry.className = "calendar-entry";
    const metadata = this.app.metadataCache.getFileCache(file);
    const isRecurring = (_a = metadata == null ? void 0 : metadata.frontmatter) == null ? void 0 : _a[this.settings.recurrenceField];
    if (isRecurring) {
      entry.classList.add("recurring-entry");
      const icon = document.createElement("span");
      icon.className = "recurring-icon";
      icon.textContent = "\u{1F504}";
      entry.appendChild(icon);
      const originalDate = this.parseDateFromLink((_b = metadata == null ? void 0 : metadata.frontmatter) == null ? void 0 : _b[this.settings.dateField]);
      console.log("[createDraggableEntry] Sprawdzanie dat", {
        file: file.path,
        originalDate: originalDate == null ? void 0 : originalDate.toISOString(),
        currentDate: date == null ? void 0 : date.toISOString(),
        isOriginalDate: originalDate && date ? window.moment(originalDate).format("YYYY-MM-DD") === window.moment(date).format("YYYY-MM-DD") : false
      });
      if (originalDate && date && window.moment(date).format("YYYY-MM-DD") !== window.moment(originalDate).format("YYYY-MM-DD")) {
        entry.classList.add("future-recurring");
        entry.setAttribute("draggable", "false");
        entry.title = "Nie mo\u017Cna przenosi\u0107 przysz\u0142ych wyst\u0105pie\u0144 notatki rekurencyjnej";
        const lockIcon = document.createElement("span");
        lockIcon.className = "lock-icon";
        lockIcon.textContent = "\u{1F512}";
        entry.appendChild(lockIcon);
      } else {
        entry.setAttribute("draggable", "true");
        entry.dataset.filePath = file.path;
      }
    } else {
      entry.setAttribute("draggable", "true");
      entry.dataset.filePath = file.path;
    }
    const title = document.createElement("span");
    title.textContent = file.basename;
    entry.appendChild(title);
    if (entry.getAttribute("draggable") === "true") {
      entry.addEventListener("dragstart", (e) => {
        var _a2;
        (_a2 = e.dataTransfer) == null ? void 0 : _a2.setData("text/plain", file.path);
        entry.style.opacity = "0.5";
      });
      entry.addEventListener("dragend", () => {
        entry.style.opacity = "1";
      });
    }
    entry.addEventListener("click", (e) => __async(this, null, function* () {
      e.stopPropagation();
      yield this.app.workspace.getLeaf().openFile(file);
    }));
    return entry;
  }
  createDroppableDay(date, entries = [], refreshView) {
    console.log("[createDroppableDay] Start", {
      date: date.toISOString(),
      entriesCount: entries.length,
      entries: entries.map((f) => f.path)
    });
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    if (entries.length) {
      dayEl.classList.add("has-entries");
    }
    const today = new Date();
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      dayEl.classList.add("today");
    }
    const addButton = document.createElement("div");
    addButton.className = "add-entry-button";
    addButton.title = "Dodaj now\u0105 notatk\u0119";
    addButton.style.display = "none";
    dayEl.addEventListener("mouseenter", () => {
      addButton.style.display = "block";
    });
    dayEl.addEventListener("mouseleave", () => {
      addButton.style.display = "none";
    });
    addButton.addEventListener("click", (e) => __async(this, null, function* () {
      e.stopPropagation();
      const formattedDate = window.moment(date).format(this.settings.dateFormat);
      const fileName = `Notatka ${formattedDate}`;
      const filePath = this.settings.newNotesFolder ? `${this.settings.newNotesFolder}/${fileName}.md` : `${fileName}.md`;
      const currentFilter = this.filters[this.currentFilterIndex];
      const tags = this.extractTagsFromQuery(currentFilter.query);
      const frontmatter = [
        "---",
        `${this.settings.dateField}: "[[${formattedDate}]]"`,
        tags.length > 0 ? "tags:\n  - " + tags.map((tag) => `"#${tag}"`).join("\n  - ").replace(/##/g, "#") : "",
        "---",
        "",
        "# " + fileName
      ].filter((line) => line !== "").join("\n");
      if (this.settings.newNotesFolder) {
        yield this.ensureFolderExists(this.settings.newNotesFolder);
      }
      const newFile = yield this.app.vault.create(filePath, frontmatter);
      yield this.app.workspace.getLeaf().openFile(newFile);
      if (this.container && this.currentTag) {
        this.container.empty();
        yield this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
      }
    }));
    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate().toString();
    dayEl.appendChild(dayNumber);
    dayEl.appendChild(addButton);
    dayEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      dayEl.classList.add("dragover");
    });
    dayEl.addEventListener("dragleave", () => {
      dayEl.classList.remove("dragover");
    });
    dayEl.addEventListener("drop", (e) => __async(this, null, function* () {
      var _a;
      e.preventDefault();
      dayEl.classList.remove("dragover");
      const filePath = (_a = e.dataTransfer) == null ? void 0 : _a.getData("text/plain");
      if (!filePath)
        return;
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof import_obsidian.TFile))
        return;
      const newDate = window.moment(date).format("YYYY-MM-DD");
      yield this.updateFileDate(file, newDate, refreshView);
    }));
    entries.forEach((file) => {
      const entry = this.createDraggableEntry(file, date);
      dayEl.appendChild(entry);
    });
    return dayEl;
  }
  createFilterSelector() {
    const container = document.createElement("div");
    container.className = "filter-selector";
    const select = document.createElement("select");
    this.filters.forEach((filter, index) => {
      const option = document.createElement("option");
      option.value = index.toString();
      option.textContent = filter.name;
      select.appendChild(option);
    });
    select.value = this.currentFilterIndex.toString();
    select.addEventListener("change", (e) => __async(this, null, function* () {
      this.currentFilterIndex = parseInt(e.target.value);
      if (this.container) {
        this.container.empty();
        yield this.renderCalendar(this.container, this.filters[this.currentFilterIndex].query, this.showUnplanned);
      }
    }));
    container.appendChild(select);
    return container;
  }
  createUnplannedSection(query, refreshView) {
    return __async(this, null, function* () {
      console.log("[createUnplannedSection] Start", {
        query,
        showUnplanned: this.showUnplanned
      });
      const section = document.createElement("div");
      section.className = "unplanned-section";
      const headerContainer = document.createElement("div");
      headerContainer.className = "unplanned-header";
      const header = document.createElement("h3");
      header.textContent = "Niezaplanowane";
      const addButton = document.createElement("div");
      addButton.className = "add-entry-button";
      addButton.title = "Dodaj now\u0105 notatk\u0119";
      addButton.style.display = "block";
      addButton.addEventListener("click", (e) => __async(this, null, function* () {
        e.stopPropagation();
        const fileName = `Notatka ${window.moment().format("YYYYMMDDHHmmss")}`;
        const filePath = this.settings.newNotesFolder ? `${this.settings.newNotesFolder}/${fileName}.md` : `${fileName}.md`;
        const currentFilter = this.filters[this.currentFilterIndex];
        const tags = this.extractTagsFromQuery(currentFilter.query);
        const frontmatter = [
          "---",
          tags.length > 0 ? "tags:\n  - " + tags.map((tag) => `"#${tag}"`).join("\n  - ").replace(/##/g, "#") : "",
          "---",
          "",
          "# " + fileName
        ].filter((line) => line !== "").join("\n");
        if (this.settings.newNotesFolder) {
          yield this.ensureFolderExists(this.settings.newNotesFolder);
        }
        const newFile = yield this.app.vault.create(filePath, frontmatter);
        yield this.app.workspace.getLeaf().openFile(newFile);
        if (this.container && this.currentTag) {
          this.container.empty();
          yield this.renderCalendar(this.container, this.currentTag, this.showUnplanned);
        }
      }));
      headerContainer.appendChild(header);
      headerContainer.appendChild(addButton);
      section.appendChild(headerContainer);
      const itemsContainer = document.createElement("div");
      itemsContainer.className = "unplanned-items";
      const conditions = this.splitQueryPreservingQuotes(query);
      console.log("[createUnplannedSection] Podzielone warunki:", conditions);
      const allFiles = this.app.vault.getMarkdownFiles();
      const unplannedFiles = allFiles.filter((file) => {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter))
          return false;
        if (metadata.frontmatter[this.settings.dateField])
          return false;
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
        files: unplannedFiles.map((f) => f.path)
      });
      unplannedFiles.forEach((file) => {
        const entry = this.createDraggableEntry(file, null);
        itemsContainer.appendChild(entry);
      });
      itemsContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        itemsContainer.classList.add("dragover");
      });
      itemsContainer.addEventListener("dragleave", () => {
        itemsContainer.classList.remove("dragover");
      });
      itemsContainer.addEventListener("drop", (e) => __async(this, null, function* () {
        var _a;
        e.preventDefault();
        itemsContainer.classList.remove("dragover");
        const filePath = (_a = e.dataTransfer) == null ? void 0 : _a.getData("text/plain");
        console.log("[createUnplannedSection:drop] Start", {
          filePath,
          showUnplanned: this.showUnplanned
        });
        if (!filePath)
          return;
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof import_obsidian.TFile))
          return;
        yield this.updateFileDate(file, null, refreshView);
        console.log("[createUnplannedSection:drop] Zako\u0144czono");
      }));
      section.appendChild(itemsContainer);
      return section;
    });
  }
  extractTagsFromQuery(query) {
    const tags = [];
    const parts = this.splitQueryPreservingQuotes(query);
    parts.forEach((part) => {
      if (part.startsWith("#") || part.startsWith("tag:")) {
        const tag = part.startsWith("tag:") ? part.substring(4) : part.substring(1);
        tags.push(tag);
      }
    });
    return tags;
  }
  splitQueryPreservingQuotes(query) {
    const parts = [];
    let currentPart = "";
    let inQuotes = false;
    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentPart += char;
      } else if (char === " " && !inQuotes) {
        if (currentPart.trim()) {
          parts.push(currentPart.trim());
        }
        currentPart = "";
      } else {
        currentPart += char;
      }
    }
    if (currentPart.trim()) {
      parts.push(currentPart.trim());
    }
    return parts.filter((part) => part.length > 0);
  }
  ensureFolderExists(folderPath) {
    return __async(this, null, function* () {
      if (!folderPath)
        return;
      const folders = folderPath.split("/");
      let currentPath = "";
      for (const folder of folders) {
        currentPath += (currentPath ? "/" : "") + folder;
        if (!this.app.vault.getAbstractFileByPath(currentPath)) {
          yield this.app.vault.createFolder(currentPath);
        }
      }
    });
  }
};
