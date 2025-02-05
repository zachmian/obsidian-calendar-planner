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
  defaultView: "month"
};
var TaggedCalendarSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Ustawienia Tagged Calendar" });
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
  }
};
var TaggedCalendarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.activeLeaf = null;
  }
  onload() {
    return __async(this, null, function* () {
      yield this.loadSettings();
      this.addSettingTab(new TaggedCalendarSettingTab(this.app, this));
      this.registerMarkdownCodeBlockProcessor("calendar-planner", (source, el, ctx) => __async(this, null, function* () {
        const [query] = source.split("\n");
        if (!query)
          return;
        const calendar = document.createElement("div");
        calendar.className = "calendar-planner";
        yield this.renderCalendar(calendar, query.trim());
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
  renderCalendar(container, query) {
    return __async(this, null, function* () {
      console.log("Renderowanie kalendarza dla tagu:", query);
      container.empty();
      this.container = container;
      this.currentTag = query;
      const state = {
        currentDate: new Date(),
        view: this.settings.defaultView
      };
      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.marginBottom = "10px";
      controls.style.padding = "5px";
      const navigationDiv = document.createElement("div");
      const prevButton = document.createElement("button");
      prevButton.textContent = "\u2190";
      prevButton.addEventListener("click", () => {
        if (state.view === "month") {
          state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1);
        } else {
          state.currentDate = new Date(state.currentDate.getTime() - 7 * 24 * 60 * 60 * 1e3);
        }
        updateCalendar();
      });
      const todayButton = document.createElement("button");
      todayButton.textContent = "Dzi\u015B";
      todayButton.className = "today-button";
      todayButton.addEventListener("click", () => {
        state.currentDate = new Date();
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
        updateCalendar();
      });
      const dateLabel = document.createElement("span");
      dateLabel.style.margin = "0 10px";
      navigationDiv.appendChild(prevButton);
      navigationDiv.appendChild(todayButton);
      navigationDiv.appendChild(nextButton);
      navigationDiv.appendChild(dateLabel);
      const viewToggle = document.createElement("select");
      viewToggle.innerHTML = `
            <option value="month">Miesi\u0105c</option>
            <option value="week">Tydzie\u0144</option>
        `;
      viewToggle.value = state.view;
      viewToggle.addEventListener("change", (e) => {
        state.view = e.target.value;
        updateCalendar();
      });
      controls.appendChild(navigationDiv);
      controls.appendChild(viewToggle);
      container.appendChild(controls);
      const calendarContainer = document.createElement("div");
      container.appendChild(calendarContainer);
      const updateCalendar = () => __async(this, null, function* () {
        calendarContainer.innerHTML = "";
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
          yield this.renderMonthView(calendarContainer, state.currentDate, query);
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
          yield this.renderWeekView(calendarContainer, state.currentDate, query);
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
      const files = this.app.vault.getMarkdownFiles();
      if (!query.includes(" ") && !query.includes(":")) {
        const tag = query.startsWith("#") ? query : "#" + query;
        return this.filterFilesByTag(files, tag);
      }
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
    });
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
  matchesCondition(file, cache, condition) {
    var _a;
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
  renderMonthView(container, date, query) {
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
      for (const file of files) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter))
          continue;
        const fileDate = metadata.frontmatter[this.settings.dateField];
        if (!fileDate)
          continue;
        const parsedDate = this.parseDateFromLink(fileDate);
        if (!parsedDate)
          continue;
        const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 6e4);
        const dateStr = localDate.toISOString().split("T")[0];
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
        const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
        const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 6e4);
        const dateStr = localDate.toISOString().split("T")[0];
        const entries = taggedFiles.get(dateStr) || [];
        const dayEl = this.createDroppableDay(currentDate, entries);
        calendar.appendChild(dayEl);
      }
      container.appendChild(calendar);
    });
  }
  renderWeekView(container, date, query) {
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
      for (const file of files) {
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!(metadata == null ? void 0 : metadata.frontmatter))
          continue;
        const fileDate = metadata.frontmatter[this.settings.dateField];
        if (!fileDate)
          continue;
        const parsedDate = this.parseDateFromLink(fileDate);
        if (!parsedDate)
          continue;
        const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 6e4);
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
        const dayEl = this.createDroppableDay(currentDate, entries);
        calendar.appendChild(dayEl);
      }
      container.appendChild(calendar);
    });
  }
  updateFileDate(file, newDate) {
    return __async(this, null, function* () {
      try {
        console.log("Aktualizacja daty:", {
          file: file.path,
          newDate,
          dateField: this.settings.dateField
        });
        const content = yield this.app.vault.read(file);
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (match) {
          const frontmatter = match[1];
          const lines = frontmatter.split("\n");
          const escapedFieldName = this.settings.dateField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const dateFieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`);
          let dateUpdated = false;
          const updatedLines = lines.map((line) => {
            if (line.match(dateFieldRegex)) {
              dateUpdated = true;
              const formattedDate = this.formatDateAsLink(new Date(newDate));
              console.log("Aktualizacja linii:", {
                stara: line,
                nowa: `${this.settings.dateField}: ${formattedDate}`
              });
              return `${this.settings.dateField}: ${formattedDate}`;
            }
            return line;
          });
          if (!dateUpdated) {
            const formattedDate = this.formatDateAsLink(new Date(newDate));
            console.log("Dodawanie nowego pola daty:", formattedDate);
            updatedLines.push(`${this.settings.dateField}: ${formattedDate}`);
          }
          const newFrontmatter = updatedLines.join("\n");
          const newContent = content.replace(frontmatterRegex, `---
${newFrontmatter}
---`);
          console.log("Nowy frontmatter:", newFrontmatter);
          yield this.app.vault.modify(file, newContent);
          yield new Promise((resolve) => setTimeout(resolve, 100));
          yield this.app.metadataCache.trigger("changed", file);
        } else {
          const formattedDate = this.formatDateAsLink(new Date(newDate));
          const newFrontmatter = `---
${this.settings.dateField}: ${formattedDate}
---
`;
          const newContent = newFrontmatter + content;
          console.log("Tworzenie nowego frontmattera:", newFrontmatter);
          yield this.app.vault.modify(file, newContent);
          yield new Promise((resolve) => setTimeout(resolve, 100));
          yield this.app.metadataCache.trigger("changed", file);
        }
      } catch (error) {
        console.error("B\u0142\u0105d podczas aktualizacji daty:", error);
      }
    });
  }
  createDraggableEntry(file) {
    const entry = document.createElement("div");
    entry.className = "calendar-entry";
    entry.textContent = file.basename;
    entry.setAttribute("draggable", "true");
    entry.dataset.filePath = file.path;
    entry.addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.workspace.getLeaf().openFile(file);
    });
    entry.addEventListener("dragstart", (e) => {
      var _a;
      (_a = e.dataTransfer) == null ? void 0 : _a.setData("text/plain", file.path);
      entry.style.opacity = "0.5";
    });
    entry.addEventListener("dragend", () => {
      entry.style.opacity = "1";
    });
    return entry;
  }
  createDroppableDay(date, entries = []) {
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    if (entries.length) {
      dayEl.classList.add("has-entries");
    }
    const today = new Date();
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      dayEl.classList.add("today");
    }
    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate().toString();
    dayEl.appendChild(dayNumber);
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
      const newDate = new Date(date.getTime() - date.getTimezoneOffset() * 6e4).toISOString().split("T")[0];
      yield this.updateFileDate(file, newDate);
      this.container.empty();
      yield this.renderCalendar(this.container, this.currentTag);
      this.app.workspace.trigger("layout-change");
    }));
    entries.forEach((file) => {
      const entry = this.createDraggableEntry(file);
      dayEl.appendChild(entry);
    });
    return dayEl;
  }
};
