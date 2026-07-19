"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { PageTransition } from "@/components/animation/page-transition";
import { TerminalPanel } from "@/components/terminal/terminal-panel";

interface Trip {
  id: string;
  title: string;
  updatedAt: string;
}

interface AppState {
  darkMode: boolean;
  toggleTheme: () => void;
  trips: Trip[];
  activeTripId?: string;
  onNewTrip: () => void;
  onSelectTrip: (id: string) => void;
  aiConnected: boolean;
  aiLabel?: string;
  setAiConnected: (connected: boolean, label?: string) => void;
  showAiConnect: boolean;
  openAiConnect: () => void;
  closeAiConnect: () => void;
  terminalOpen: boolean;
  terminalCommand?: string;
  openTerminal: (command?: string) => void;
  closeTerminal: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppShell");
  }
  return ctx;
}

const THEME_KEY = "marcopolo.theme";
const TRIPS_KEY = "marcopolo.trips";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readTheme(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === "dark" : true;
  } catch {
    return true;
  }
}

function readTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Trip[]) : [];
  } catch {
    return [];
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(readTheme);
  const [trips, setTrips] = useState<Trip[]>(readTrips);
  const [activeTripId, setActiveTripId] = useState<string | undefined>();
  const [aiConnected, setAiConnectedState] = useState(false);
  const [aiLabel, setAiLabelState] = useState<string | undefined>();
  const [showAiConnect, setShowAiConnect] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalCommand, setTerminalCommand] = useState<string | undefined>();


  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
    } catch {}
    if (darkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    } catch {}
  }, [trips]);

  const toggleTheme = useCallback(() => setDarkMode((d) => !d), []);

  const onNewTrip = useCallback(() => {
    const title = `Trip ${trips.length + 1}`;
    const trip: Trip = {
      id: makeId(),
      title,
      updatedAt: new Date().toISOString(),
    };
    setTrips((prev) => [trip, ...prev]);
    setActiveTripId(trip.id);
  }, [trips.length]);

  const onSelectTrip = useCallback((id: string) => {
    setActiveTripId(id);
  }, []);

  const setAiConnected = useCallback((connected: boolean, label?: string) => {
    setAiConnectedState(connected);
    setAiLabelState(label);
  }, []);

  const openAiConnect = useCallback(() => setShowAiConnect(true), []);
  const closeAiConnect = useCallback(() => setShowAiConnect(false), []);

  const openTerminal = useCallback((command?: string) => {
    setTerminalCommand(command);
    setTerminalOpen(true);
  }, []);

  const closeTerminal = useCallback(() => {
    setTerminalOpen(false);
    setTerminalCommand(undefined);
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        darkMode,
        toggleTheme,
        trips,
        activeTripId,
        onNewTrip,
        onSelectTrip,
        aiConnected,
        aiLabel,
        setAiConnected,
        showAiConnect,
        openAiConnect,
        closeAiConnect,
        terminalOpen,
        terminalCommand,
        openTerminal,
        closeTerminal,
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <AppSidebar
          trips={trips}
          activeTripId={activeTripId}
          onNewTrip={onNewTrip}
          onSelectTrip={onSelectTrip}
          connected={aiConnected}
          aiLabel={aiLabel}
          onOpenConnect={openAiConnect}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1 overflow-hidden">
            <PageTransition className="h-full overflow-y-auto">
              {children}
            </PageTransition>
          </main>
          <TerminalPanel
            open={terminalOpen}
            onClose={closeTerminal}
            initialCommand={terminalCommand}
          />
        </div>
      </div>
    </AppStateContext.Provider>
  );
}
