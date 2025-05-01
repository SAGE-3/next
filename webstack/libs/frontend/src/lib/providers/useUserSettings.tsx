/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, createContext, useContext, useState, useEffect } from 'react';

import { isElectron } from 'libs/applications/src/lib/apps/Cobrowse/util';

/**
 * Represents the user preferences for the application.
 *
 * @typedef {Object} UserSettings
 *
 * @property {boolean} showCursors - Indicates whether cursors should be displayed.
 * @property {boolean} showViewports - Indicates whether viewports should be displayed.
 * @property {boolean} showAppTitles - Indicates whether application titles should be displayed.
 * @property {'none'| 'selected' | 'all'} showLinks - Indicates whether provenance information should be displayed (arrows).
 * @property {boolean} showUI - Indicates whether the user interface should be displayed.
 * @property {boolean} showTags - Indicates whether tags should be displayed.
 * @property {'grid' | 'list'} selectedBoardListView - The view mode for the board list, either 'grid' or 'list'.
 * @property {'lasso' | 'grab' | 'pen' | 'eraser' | 'linker'} primaryActionMode - The primary action mode, which can be 'lasso', 'grab', 'pen', or 'eraser'.
 * @property {'llama' | 'openai'} aiModel - The AI model to be used, either 'llama' or 'openai'.
 */
type UserSettings = {
  showCursors: boolean;
  showViewports: boolean;
  showAppTitles: boolean;
  showLinks: 'none' | 'selected' | 'selected-path' | 'all';
  showUI: boolean;
  showTags: boolean;
  selectedBoardListView: 'grid' | 'list';
  primaryActionMode: 'lasso' | 'grab' | 'pen' | 'eraser' | 'linker';
  aiModel: 'llama' | 'openai';
  uiScale: 'xs' | 's' | 'md' | 'lg' | 'xl';
};

const uiScaleDict = {
  xs: -1.0,
  s: -0.5,
  md: 0,
  lg: 0.5,
  xl: 1.0,
};

const defaultSettings: UserSettings = {
  showCursors: true,
  showViewports: true,
  showAppTitles: false,
  showLinks: 'selected',
  showUI: true,
  showTags: false,
  selectedBoardListView: 'grid',
  primaryActionMode: 'lasso',
  aiModel: 'llama',
  uiScale: 'md',
};

const USER_SETTINGS_KEY = 's3_user_settings';

type UserSettingsContextType = {
  settings: UserSettings;
  toggleShowCursors: () => void;
  toggleShowViewports: () => void;
  toggleShowAppTitles: () => void;
  setShowLinks: (value: UserSettings['showLinks']) => void;
  toggleShowUI: () => void;
  toggleShowTags: () => void;
  setBoardListView: (value: UserSettings['selectedBoardListView']) => void;
  setPrimaryActionMode: (value: UserSettings['primaryActionMode']) => void;
  setDefaultPrimaryActionMode: () => void;
  restoreDefaultSettings: () => void;
  setAIModel: (value: UserSettings['aiModel']) => void;
  setUIScale: (value: UserSettings['uiScale']) => void;
};

const UserSettingsContext = createContext<UserSettingsContextType>({
  settings: defaultSettings,
  toggleShowCursors: () => { },
  toggleShowViewports: () => { },
  toggleShowAppTitles: () => { },
  setShowLinks: (value: UserSettings['showLinks']) => { },
  toggleShowUI: () => { },
  toggleShowTags: () => { },
  setBoardListView: (value: UserSettings['selectedBoardListView']) => { },
  setPrimaryActionMode: (value: UserSettings['primaryActionMode']) => { },
  setDefaultPrimaryActionMode: () => { },
  restoreDefaultSettings: () => { },
  setAIModel: (value: UserSettings['aiModel']) => { },
  setUIScale: (value: UserSettings['uiScale']) => { },
});

/**
 * Hook to oberve the user's settings
 */
export function useUserSettings() {
  return useContext(UserSettingsContext);
}

/**
 * Get the user's settings from local storage
 * @param key
 * @returns
 */
export function getUserSettings() {
  const settings = localStorage.getItem(USER_SETTINGS_KEY);
  if (settings) {
    return { ...defaultSettings, ...JSON.parse(settings) };
  } else {
    setUserSettings(defaultSettings);
    return defaultSettings;
  }
}

function setElectronUIScale(value: UserSettings['uiScale']) {
  if (isElectron()) {
    window.electron.send('set-scale-level', uiScaleDict[value] * window.devicePixelRatio);
  }
}

/**
 * Set the user's settings in local storage
 * @param settings
 */
export function setUserSettings(settings: UserSettings) {
  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
}

export function UserSettingsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  // On load, ensure all the properties on the settings object are present. If not , set them to the default values
  useEffect(() => {
    const settings = getUserSettings();
    const newSettings = { ...defaultSettings, ...settings };
    setUserSettings(newSettings);
    setElectronUIScale(newSettings.uiScale);
  }, []);

  const [settings, setSettings] = useState<UserSettings>(getUserSettings());

  const toggleShowCursors = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.showCursors = !prev.showCursors;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const toggleShowViewports = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.showViewports = !prev.showViewports;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const toggleShowAppTitles = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.showAppTitles = !prev.showAppTitles;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const toggleShowUI = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.showUI = !prev.showUI;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const setShowLinks = useCallback(
    (value: UserSettings['showLinks']) => {
      setSettings((prev) => {
        const newSettings = { ...prev };
        newSettings.showLinks = value;
        setUserSettings(newSettings);
        return newSettings;
      });
    },
    [setSettings]
  );

  const toggleShowTags = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.showTags = !prev.showTags;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const setBoardListView = useCallback(
    (value: UserSettings['selectedBoardListView']) => {
      setSettings((prev) => {
        const newSettings = { ...prev };
        newSettings.selectedBoardListView = value;
        setUserSettings(newSettings);
        return newSettings;
      });
    },
    [setSettings]
  );

  const setPrimaryActionMode = useCallback(
    (value: UserSettings['primaryActionMode']) => {
      setSettings((prev) => {
        const newSettings = { ...prev };
        newSettings.primaryActionMode = value;
        setUserSettings(newSettings);
        return newSettings;
      });
    },
    [setSettings]
  );

  const setAIModel = useCallback(
    (value: UserSettings['aiModel']) => {
      setSettings((prev) => {
        const newSettings = { ...prev };
        newSettings.aiModel = value;
        setUserSettings(newSettings);
        return newSettings;
      });
    },
    [setSettings]
  );

  const setDefaultPrimaryActionMode = useCallback(() => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      newSettings.primaryActionMode = defaultSettings.primaryActionMode;
      setUserSettings(newSettings);
      return newSettings;
    });
  }, [setSettings]);

  const restoreDefaultSettings = useCallback(() => {
    setSettings(defaultSettings);
    setUserSettings(defaultSettings);
    setElectronUIScale(defaultSettings.uiScale);
  }, [setSettings]);

  const setUIScale = useCallback(
    (value: UserSettings['uiScale']) => {
      setSettings((prev) => {
        const newSettings = { ...prev };
        newSettings.uiScale = value;
        setUserSettings(newSettings);
        setElectronUIScale(value);
        return newSettings;
      });
    },
    [setSettings]
  );

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        toggleShowCursors,
        toggleShowViewports,
        toggleShowAppTitles,
        toggleShowUI,
        setShowLinks,
        toggleShowTags,
        setBoardListView,
        setPrimaryActionMode,
        setDefaultPrimaryActionMode,
        restoreDefaultSettings,
        setAIModel,
        setUIScale,
      }}
    >
      {props.children}
    </UserSettingsContext.Provider>
  );
}
