import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { GeoCoordinate, GridLocation, UserProfile } from '../types';
import { getAllLocations, getUserProfile, addDemoData } from '../utils/storage';

interface AppContextType {
  userLocation: GeoCoordinate | null;
  setUserLocation: (location: GeoCoordinate | null) => void;
  locations: Record<string, GridLocation>;
  refreshLocations: () => Promise<void>;
  user: UserProfile | null;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  locationPermission: boolean;
  requestLocationPermission: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<GeoCoordinate | null>(null);
  const [locations, setLocations] = useState<Record<string, GridLocation>>({});
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      
      if (granted) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const refreshLocations = async () => {
    try {
      const allLocations = await getAllLocations();
      setLocations(allLocations);
    } catch (error) {
      console.error('Error refreshing locations:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userProfile = await getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // Get user profile
      await refreshUser();
      
      // Request location permission
      await requestLocationPermission();
      
      // Load all locations
      const allLocations = await getAllLocations();
      
      // If no locations exist, add demo data
      if (Object.keys(allLocations).length === 0) {
        // Get current location for demo data
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await addDemoData({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          // If location fails, use a default location
          await addDemoData({
            latitude: 28.6139,
            longitude: 77.2090, // Delhi as default
          });
        }
      }
      
      await refreshLocations();
      setIsLoading(false);
    };

    init();
  }, []);

  // Watch location updates
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      if (locationPermission) {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [locationPermission]);

  return (
    <AppContext.Provider
      value={{
        userLocation,
        setUserLocation,
        locations,
        refreshLocations,
        user,
        refreshUser,
        isLoading,
        locationPermission,
        requestLocationPermission,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

