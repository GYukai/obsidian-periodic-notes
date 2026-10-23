import type moment from "moment";
import { addIcon, App, Plugin } from "obsidian";

import { getCommands, openPeriodicNote, periodConfigs } from "./commands";
import { SETTINGS_UPDATED } from "./events";
import {
  calendarDayIcon,
  calendarMonthIcon,
  calendarWeekIcon,
  calendarQuarterIcon,
  calendarYearIcon,
} from "./icons";
import { showFileMenu } from "./modal";
import {
  DEFAULT_SETTINGS,
  IPeriodicity,
  ISettings,
  PeriodicNotesSettingsTab,
} from "./settings";
import {
  getLegacyWeeklyNoteSettings,
  hasLegacyWeeklyNoteSettings,
  isMetaPressed,
} from "./utils";

declare global {
  interface Window {
    app: App;
    moment: typeof moment;
  }
}

export default class PeriodicNotesPlugin extends Plugin {
  public settings: ISettings;
  public isInitialLoad: boolean;

  private ribbonEl: HTMLElement;
  private legacyCommandIds = new Set<string>();

  async onload(): Promise<void> {
    // The daily-notes interface and Calendar resolve this legacy registry key.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (this.app as any).plugins;
    if (manager.getPlugin("periodic-notes")) {
      throw new Error("Disable the original Periodic Notes before enabling the maintained version.");
    }
    this.ribbonEl = null;

    this.updateSettings = this.updateSettings.bind(this);

    await this.loadSettings();
    manager.plugins["periodic-notes"] = this;
    this.register(() => {
      if (manager.plugins["periodic-notes"] === this) {
        delete manager.plugins["periodic-notes"];
      }
    });
    this.addSettingTab(new PeriodicNotesSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this));

    addIcon("calendar-day", calendarDayIcon);
    addIcon("calendar-week", calendarWeekIcon);
    addIcon("calendar-month", calendarMonthIcon);
    addIcon("calendar-quarter", calendarQuarterIcon);
    addIcon("calendar-year", calendarYearIcon);
  }

  onLayoutReady(): void {
    // If the user has Calendar Weekly Notes settings, migrate them automatically,
    // since the functionality will be deprecated.
    if (this.isInitialLoad && hasLegacyWeeklyNoteSettings()) {
      this.migrateWeeklySettings();
      this.settings.weekly.enabled = true;
    }

    this.configureRibbonIcons();
    this.configureCommands();
  }

  private migrateWeeklySettings(): void {
    const calendarSettings = getLegacyWeeklyNoteSettings();
    this.updateSettings({
      ...this.settings,
      ...{
        weekly: { ...calendarSettings, enabled: true },
        hasMigratedWeeklyNoteSettings: true,
      },
    });
  }

  private configureRibbonIcons() {
    this.ribbonEl?.detach();

    const configuredPeriodicities = [
      "daily",
      "weekly",
      "monthly",
      "quarterly",
      "yearly",
    ].filter((periodicity) => this.settings[periodicity].enabled);

    if (configuredPeriodicities.length) {
      const periodicity = configuredPeriodicities[0] as IPeriodicity;
      const config = periodConfigs[periodicity];

      this.ribbonEl = this.addRibbonIcon(
        `calendar-${config.unitOfTime}`,
        `Open ${config.relativeUnit}`,
        (event: MouseEvent) =>
          openPeriodicNote(periodicity, window.moment(), isMetaPressed(event))
      );
      this.ribbonEl.addEventListener("contextmenu", (ev: MouseEvent) => {
        showFileMenu(this.app, this.settings, {
          x: ev.pageX,
          y: ev.pageY,
        });
      });
    }
  }

  private configureCommands() {
    // Remove disabled commands
    ["daily", "weekly", "monthly", "quarterly", "yearly"]
      .filter((periodicity) => !this.settings[periodicity].enabled)
      .forEach((periodicity: IPeriodicity) => {
        getCommands(periodicity).forEach((command) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.app as any).commands.removeCommand(
            `${this.manifest.id}:${command.id}`
          )
        );
        getCommands(periodicity).forEach((command) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.app as any).commands.removeCommand(`periodic-notes:${command.id}`);
        });
      });

    // register enabled commands
    ["daily", "weekly", "monthly", "quarterly", "yearly"]
      .filter((periodicity) => this.settings[periodicity].enabled)
      .forEach((periodicity: IPeriodicity) => {
        getCommands(periodicity).forEach((command) => {
          this.addCommand(command);
          const legacyId = `periodic-notes:${command.id}`;
          // Preserve existing hotkeys, URI commands and Buttons note actions.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const commands = (this.app as any).commands;
          commands.addCommand({ ...command, id: legacyId, name: `Periodic Notes: ${command.name}` });
          if (!this.legacyCommandIds.has(legacyId)) {
            this.legacyCommandIds.add(legacyId);
            this.register(() => commands.removeCommand(legacyId));
          }
        });
      });
  }

  async loadSettings(): Promise<void> {
    const settings = await this.loadData();

    if (!settings) {
      this.isInitialLoad = true;
    }

    this.settings = Object.assign(
      {},
      {
        showGettingStartedBanner: true,
        hasMigratedDailyNoteSettings: false,
        hasMigratedWeeklyNoteSettings: false,

        daily: { ...DEFAULT_SETTINGS },
        weekly: { ...DEFAULT_SETTINGS },
        monthly: { ...DEFAULT_SETTINGS },
        quarterly: { ...DEFAULT_SETTINGS },
        yearly: { ...DEFAULT_SETTINGS },
      },
      settings || {}
    );
  }

  private onSettingsUpdate(): void {
    this.configureCommands();
    this.configureRibbonIcons();

    // Integrations (i.e. Calendar Plugin) can listen for changes to settings
    this.app.workspace.trigger(SETTINGS_UPDATED);
  }

  async updateSettings(val: ISettings): Promise<void> {
    this.settings = val;
    await this.saveData(this.settings);

    this.onSettingsUpdate();
  }
}
