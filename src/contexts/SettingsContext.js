import React, { createContext, useContext } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children, value }) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}