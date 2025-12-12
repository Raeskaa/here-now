import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

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
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View 
      style={[
        styles.tabIconContainer,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
      ]}
    >
      <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
        <Ionicons
          name={focused ? focusedName : name}
          size={22}
          color={focused ? COLORS.primary : COLORS.textMuted}
        />
      </View>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelFocused]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
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
              label="Stories"
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
              label="You"
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
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddNote"
          component={AddNoteScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
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
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="QRDisplay"
          component={QRDisplayScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    elevation: 0,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperFocused: {
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
