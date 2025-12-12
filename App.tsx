import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/utils/theme';

function AppContent() {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.loadingContainer}
      >
        <Text style={styles.loadingLogo}>📍</Text>
        <Text style={styles.loadingTitle}>PlaceMemory</Text>
        <Text style={styles.loadingSubtitle}>Loading stories...</Text>
        <ActivityIndicator
          color={COLORS.textLight}
          size="large"
          style={styles.loadingSpinner}
        />
      </LinearGradient>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="auto" />
          <AppContent />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 72,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
  },
  loadingSpinner: {
    marginTop: 16,
  },
});
