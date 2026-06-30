import { fetchFearGreedIndex } from '@/lib/fear-greed';
import {
  buildAlertNotifications,
  FEAR_GREED_ALERT_ALARM,
  FEAR_GREED_ALERT_CHECK_INTERVAL_MINUTES,
  nextAlertState,
  normalizeFearGreedAlertSettings,
  type FearGreedAlertState,
} from '@/lib/fear-greed-alerts';
import { fearGreedAlertState, storage } from '@/lib/storage';
import { Language } from '@/types';

export function syncFearGreedAlertAlarm(enabled: boolean): void {
  if (enabled) {
    chrome.alarms.create(FEAR_GREED_ALERT_ALARM, {
      periodInMinutes: FEAR_GREED_ALERT_CHECK_INTERVAL_MINUTES,
    });
    // Run once soon after enabling
    void runFearGreedAlertCheck();
  } else {
    void chrome.alarms.clear(FEAR_GREED_ALERT_ALARM);
  }
}

async function showNotification(title: string, message: string): Promise<void> {
  const iconUrl = chrome.runtime.getURL('icon128.png');
  await chrome.notifications.create(`fear-greed-${Date.now()}`, {
    type: 'basic',
    iconUrl,
    title,
    message,
    priority: 2,
  });
}

export async function runFearGreedAlertCheck(): Promise<void> {
  const data = await storage.get();
  const alertSettings = normalizeFearGreedAlertSettings(data?.settings?.fearGreedAlerts);
  if (!alertSettings.enabled) return;

  if (alertSettings.alertBelow === null && alertSettings.alertAbove === null) {
    return;
  }

  const language: Language = data?.settings?.language === 'zh' ? 'zh' : 'en';

  let index;
  try {
    index = await fetchFearGreedIndex();
  } catch (e) {
    console.warn('[FearGreedAlert] Fetch failed:', e);
    return;
  }

  const prevState: FearGreedAlertState =
    (await fearGreedAlertState.get()) ?? {
      indexTimestamp: 0,
      notifiedBelow: false,
      notifiedAbove: false,
    };

  const decisions = buildAlertNotifications(index, alertSettings, language, prevState);
  if (decisions.length === 0) return;

  const fired = decisions.map((d) => d.kind);
  for (const decision of decisions) {
    await showNotification(decision.title, decision.message);
  }

  await fearGreedAlertState.set(nextAlertState(prevState, index, fired));
}

export function initFearGreedAlertListeners(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === FEAR_GREED_ALERT_ALARM) {
      void runFearGreedAlertCheck();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes['crypto-panel-data-v1']) return;
    try {
      const raw = changes['crypto-panel-data-v1'].newValue;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const enabled = Boolean(
        normalizeFearGreedAlertSettings(parsed?.settings?.fearGreedAlerts).enabled
      );
      syncFearGreedAlertAlarm(enabled);
    } catch (e) {
      console.warn('[FearGreedAlert] Failed to sync alarm from storage:', e);
    }
  });

  chrome.notifications.onClicked.addListener(() => {
    void chrome.action.openPopup?.();
  });

  // Restore alarm on service worker startup
  storage.get().then((data) => {
    const enabled = Boolean(
      normalizeFearGreedAlertSettings(data?.settings?.fearGreedAlerts).enabled
    );
    if (enabled) {
      chrome.alarms.create(FEAR_GREED_ALERT_ALARM, {
        periodInMinutes: FEAR_GREED_ALERT_CHECK_INTERVAL_MINUTES,
      });
    }
  });
}
