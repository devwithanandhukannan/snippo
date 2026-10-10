/**
 * Messaging Bus: Typed message contracts between content script, popup, manager, and service worker.
 */

import { Settings, Snippet, TriggerIndex } from '../core/types';

export type MessageType =
  | 'GET_TRIGGER_INDEX'
  | 'GET_SNIPPET'
  | 'GET_ALL_SNIPPETS'
  | 'GET_SETTINGS'
  | 'TOGGLE_SITE_EXCLUSION'
  | 'CHECK_SITE_EXCLUSION'
  | 'EXPAND_TRIGGER'
  | 'OPEN_MANAGER'
  | 'RECORD_USAGE'
  | 'SNIPPETS_UPDATED';

export interface VerbatimMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface ExpandTriggerPayload {
  snippetId: string;
}

export interface ToggleSitePayload {
  domain: string;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MessageBus {
  /**
   * Sends a message to the background service worker.
   */
  public static async send<TReq = unknown, TRes = unknown>(
    type: MessageType,
    payload?: TReq
  ): Promise<TRes> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      throw new Error('Chrome runtime messaging is unavailable');
    }

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type, payload } as VerbatimMessage<TReq>,
        (response: MessageResponse<TRes>) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response?.error || 'Unknown messaging error'));
            return;
          }
          resolve(response.data as TRes);
        }
      );
    });
  }

  /**
   * Broadcasts a message to all active browser tabs.
   */
  public static async broadcastToTabs(type: MessageType, payload?: unknown): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;

    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type, payload }).catch(() => {
            // Tab may not have content script loaded (e.g. chrome://) - ignore
          });
        }
      }
    } catch {
      // Ignore background broadcast failures
    }
  }
}
