import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MapScreen from '../screens/MapScreen';
import NearbyScreen from '../screens/NearbyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddNoteScreen from '../screens/AddNoteScreen';
import ViewLocationScreen from '../screens/ViewLocationScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import ScannerScreen from '../screens/ScannerScreen';
import QRDisplayScreen from '../screens/QRDisplayScreen';

import { RootStackParamList, MainTabParamList } from '../types';
import { COLORS, SHADOWS } from '../utils/theme';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  focusedName: IconName;
  label: string;
  focused: boolean;
}

function TabIcon({ name, focusedName, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Ionicons
        name={focused ? focusedName : name}
        size={24}
        color={focused ? COLORS.primary : COLORS.textMuted}
      />
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelFocused]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="compass-outline"
              focusedName="compass"
              label="Explore"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="layers-outline"
              focusedName="layers"
              label="Feed"
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="person-outline"
              focusedName="person"
              label="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddNote"
          component={AddNoteScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="ViewLocation"
          component={ViewLocationScreen}
          options={{
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="NoteDetail"
          component={NoteDetailScreen}
          options={{
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="QRDisplay"
          component={QRDisplayScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...SHADOWS.small,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
