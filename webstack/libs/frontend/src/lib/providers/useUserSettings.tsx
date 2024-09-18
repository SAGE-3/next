/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, createContext, useContext, useState, useEffect } from 'react';

type UserSettings = {
  showCursors: boolean;
  showViewports: boolean;
  showAppTitles: boolean;
  showUI: boolean;
  showTags: boolean;
  selectedBoardListView: 'grid' | 'list';
  primaryActionMode: 'lasso' | 'grab' | 'pen' | 'eraser';
};

const defaultSettings: UserSettings = {
  showCursors: true,
  showViewports: true,
  showAppTitles: false,
  showUI: true,
  showTags: false,
  selectedBoardListView: 'grid',
  primaryActionMode: 'lasso',
};

const USER_SETTINGS_KEY = 's3_user_settings';

type UserSettingsContextType = {
  settings: UserSettings;
  toggleShowCursors: () => void;
  toggleShowViewports: () => void;
  toggleShowAppTitles: () => void;
  toggleShowUI: () => void;
  toggleShowTags: () => void;
  setBoardListView: (value: UserSettings['selectedBoardListView']) => void;
  setPrimaryActionMode: (value: UserSettings['primaryActionMode']) => void;
  restoreDefaultSettings: () => void;
};

const UserSettingsContext = createContext<UserSettingsContextType>({
  settings: defaultSettings,
  toggleShowCursors: () => { },
  toggleShowViewports: () => { },
  toggleShowAppTitles: () => { },
  toggleShowUI: () => { },
  toggleShowTags: () => { },
  setBoardListView: (value: UserSettings['selectedBoardListView']) => { },
  setPrimaryActionMode: (value: UserSettings['primaryActionMode']) => { },
  restoreDefaultSettings: () => { },
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

  const restoreDefaultSettings = useCallback(() => {
    setSettings(defaultSettings);
    setUserSettings(defaultSettings);
  }, [setSettings]);

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        toggleShowCursors,
        toggleShowViewports,
        toggleShowAppTitles,
        toggleShowUI,
        toggleShowTags,
        setBoardListView,
        setPrimaryActionMode,
        restoreDefaultSettings,
      }}
    >
      {props.children}
    </UserSettingsContext.Provider>
  );
}
