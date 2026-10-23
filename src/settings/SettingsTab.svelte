<script lang="ts">
  import { onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { slide } from "svelte/transition";

  import { normalizeDayStart } from "../dayStart";
  import type { IPeriodicity, ISettings } from "./index";

  import GettingStartedBanner from "./GettingStartedBanner.svelte";
  import NoteFormatSetting from "./NoteFormatSetting.svelte";
  import NoteTemplateSetting from "./NoteTemplateSetting.svelte";
  import NoteFolderSetting from "./NoteFolderSetting.svelte";
  import { capitalize, getLegacyDailyNoteSettings } from "../utils";

  export let settings: ISettings;
  export let onUpdateSettings: (newSettings: ISettings) => void;

  let settingsStore = writable(settings);

  const unsubscribeFromSettings = settingsStore.subscribe(onUpdateSettings);

  function migrateDailyNoteSettings(): void {
    const dailyNoteSettings = getLegacyDailyNoteSettings();
    settingsStore.update((old) => ({
      ...old,
      ...{
        daily: { ...dailyNoteSettings, enabled: true },
        hasMigratedDailyNoteSettings: true,
      },
    }));
  }

  const periodicities: IPeriodicity[] = [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
  ];

  onDestroy(() => {
    unsubscribeFromSettings();
  });
</script>

{#if $settingsStore.showGettingStartedBanner}
  <GettingStartedBanner
    {migrateDailyNoteSettings}
    settings={settingsStore}
    handleTeardown={() => {
      $settingsStore.showGettingStartedBanner = false;
    }}
  />
{/if}
<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">每天开始时间 / Day starts at</div>
    <div class="setting-item-description">
      按本地时间，在此时间之前，“今天的日记”归属前一天。默认 04:00；设为 00:00 则从午夜开始。
      适用于本插件的日记命令、侧栏按钮及菜单；日历中指定日期、周记和月记等不受影响。
    </div>
  </div>
  <div class="setting-item-control">
    <input
      type="time"
      aria-label="每天开始时间 / Day starts at"
      value={$settingsStore.dayStartTime}
      on:change={(event) => {
        const input = event.currentTarget;
        const value = normalizeDayStart(input.value);
        input.value = value;
        $settingsStore.dayStartTime = value;
      }}
    />
  </div>
</div>
{#each periodicities as periodicity}
  <div class="setting-item setting-item-heading">
    <div class="setting-item-info">
      <div class="setting-item-name">
        <h3>
          {capitalize(periodicity)} Notes
        </h3>
      </div>
    </div>
    <div class="setting-item-control">
      <div
        class="checkbox-container"
        class:is-enabled={$settingsStore[periodicity].enabled}
        on:click={() => {
          $settingsStore[periodicity].enabled =
            !$settingsStore[periodicity].enabled;
        }}
      />
    </div>
  </div>
  {#if $settingsStore[periodicity].enabled}
    <div in:slide out:slide>
      <NoteFormatSetting {periodicity} settings={settingsStore} />
      <NoteTemplateSetting {periodicity} settings={settingsStore} />
      <NoteFolderSetting {periodicity} settings={settingsStore} />
    </div>
  {/if}
{/each}
