'use client';

import * as React from 'react';

interface NavigationContextValue {
  isNavOpen: boolean;
  toggleNav: () => void;
  closeNav: () => void;
  openNav: () => void;
}

const NavigationContext = React.createContext<NavigationContextValue | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps): React.JSX.Element {
  const [isNavOpen, setIsNavOpen] = React.useState<boolean>(false);

  const toggleNav = React.useCallback((): void => {
    setIsNavOpen((prev) => !prev);
  }, []);

  const closeNav = React.useCallback((): void => {
    setIsNavOpen(false);
  }, []);

  const openNav = React.useCallback((): void => {
    setIsNavOpen(true);
  }, []);

  const contextValue = React.useMemo(() => ({
    isNavOpen,
    toggleNav,
    closeNav,
    openNav,
  }), [isNavOpen, toggleNav, closeNav, openNav]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const context = React.useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }

  return context;
}