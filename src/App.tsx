import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/Layout';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { LiveMonitorScreen } from './screens/LiveMonitorScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AiAssistantScreen } from './screens/AiAssistantScreen';
import { SosEmergencyScreen } from './screens/SosEmergencyScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function ScreenRouter() {
  const { authReady, user, guestPreview, activeScreen } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">Initializing HEATSHIELD AI...</div>
      </div>
    );
  }

  if ((!user && !guestPreview) || activeScreen === 'welcome') {
    return <WelcomeScreen />;
  }

  return (
    <AppLayout>
      {activeScreen === 'dashboard' && <DashboardScreen />}
      {activeScreen === 'live' && <LiveMonitorScreen />}
      {activeScreen === 'history' && <HistoryScreen />}
      {activeScreen === 'ai' && <AiAssistantScreen />}
      {activeScreen === 'sos' && <SosEmergencyScreen />}
      {activeScreen === 'reports' && <ReportsScreen />}
      {activeScreen === 'settings' && <SettingsScreen />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ScreenRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
