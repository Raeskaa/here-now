import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region, Callout } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { coordinateToGridCode, getDistance, formatDistance } from '../utils/GeoGrid';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList, GridLocation, PlaceNote } from '../types';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const CARD_HEIGHT = 160;

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Custom map style - earthy, vintage aesthetic
const CUSTOM_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f1eb' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#523735' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f1eb' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c9b2a6' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#dcd2be' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ae9e90' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#e8e4de' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93817c' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c8d7a4' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#447530' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#f5f1e6' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#fdfcf8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f8c967' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e9bc62' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#e98d58' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#db8555' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#806b63' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8f7d77' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ebe3cd' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#dfd2ae' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#b9d3c2' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#92998d' }],
  },
];

// All unique tags from stories
const ALL_TAGS = ['nostalgia', 'food', 'history', 'art', 'love', 'community', 'culture', 'childhood', 'milestone', 'nature'];

// Time filter options
const TIME_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

// Memoized Story Marker Component - prevents unnecessary re-renders
const StoryMarker = memo(({ 
  location, 
  isSelected,
  onPress 
}: { 
  location: GridLocation; 
  isSelected: boolean;
  onPress: () => void;
}) => {
  const noteCount = location.noteCount;
  const latestNote = location.notes[location.notes.length - 1];
  const isNew = latestNote && Date.now() - latestNote.createdAt < 24 * 60 * 60 * 1000;
  const isPopular = location.notes.some(note => (note.upvotes || 0) - (note.downvotes || 0) >= 5);
  
  // Size based on story count
  const markerSize = Math.min(36 + noteCount * 2, 52);
  const fontSize = Math.min(13 + noteCount, 18);

  return (
    <Marker
      coordinate={location.coordinate}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.markerWrapper}>
        {/* Selection ring */}
        {isSelected && (
          <View style={[styles.selectionRing, { width: markerSize + 16, height: markerSize + 16 }]} />
        )}
        
        {/* New indicator - static glow */}
        {isNew && !isSelected && (
          <View style={[styles.newGlow, { width: markerSize + 12, height: markerSize + 12 }]} />
        )}
        
        {/* Main marker */}
        <View 
          style={[
            styles.markerBody,
            { 
              width: markerSize, 
              height: markerSize,
              borderRadius: markerSize / 2,
            },
            isSelected && styles.markerBodySelected,
            isPopular && styles.markerBodyPopular,
          ]}
        >
          {/* Hot badge */}
          {isPopular && (
            <View style={styles.hotBadge}>
              <Ionicons name="flame" size={8} color="#FFF" />
            </View>
          )}
          
          {/* Count */}
          <Text style={[styles.markerCount, { fontSize }]}>{noteCount}</Text>
        </View>
        
        {/* Tail/pointer */}
        <View style={[
          styles.markerTail,
          isSelected && styles.markerTailSelected,
          isPopular && styles.markerTailPopular,
        ]} />
      </View>
    </Marker>
  );
});

// New location marker with pulse
const NewLocationMarker = memo(({ coordinate }: { coordinate: { latitude: number; longitude: number } }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Marker coordinate={coordinate} tracksViewChanges={true} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.newMarkerContainer}>
        <Animated.View
          style={[
            styles.newMarkerPulse,
            { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
              inputRange: [1, 1.4],
              outputRange: [0.6, 0],
            }) },
          ]}
        />
        <View style={styles.newMarkerDot} />
      </View>
    </Marker>
  );
});

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { userLocation, locations } = useApp();
  const mapRef = useRef<MapView>(null);
  
  // State
  const [selectedLocation, setSelectedLocation] = useState<GridLocation | null>(null);
  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  // Filter locations based on tags and time
  const filteredLocations = useMemo(() => {
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    return Object.values(locations).filter(location => {
      // Time filter
      if (timeFilter !== 'all') {
        const range = timeRanges[timeFilter];
        const hasRecentNote = location.notes.some(note => now - note.createdAt < range);
        if (!hasRecentNote) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const locationTags = location.notes.flatMap(note => note.tags || []);
        const hasMatchingTag = selectedTags.some(tag => locationTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = location.notes.some(note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [locations, timeFilter, selectedTags, searchQuery]);

  // Sorted locations by distance for cards
  const sortedLocations = useMemo(() => {
    if (!userLocation) return filteredLocations;
    return [...filteredLocations].sort((a, b) => {
      const distA = getDistance(userLocation, a.coordinate);
      const distB = getDistance(userLocation, b.coordinate);
      return distA - distB;
    });
  }, [filteredLocations, userLocation]);

  // Check if story is new (within 24 hours)
  const isNewStory = useCallback((location: GridLocation) => {
    const latestNote = location.notes[location.notes.length - 1];
    return latestNote && Date.now() - latestNote.createdAt < 24 * 60 * 60 * 1000;
  }, []);

  // Check if story is popular (5+ upvotes)
  const isPopular = useCallback((location: GridLocation) => {
    return location.notes.some(note => (note.upvotes || 0) - (note.downvotes || 0) >= 5);
  }, []);

  useEffect(() => {
    if (userLocation && mapRef.current && mapReady) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [userLocation, mapReady]);

  const toggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
    Animated.timing(searchAnim, {
      toValue: showSearch ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showSearch, searchAnim]);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
    Animated.timing(filterAnim, {
      toValue: showFilters ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showFilters, filterAnim]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const showBottomSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const hideBottomSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedLocation(null);
      setLongPressCoord(null);
    });
  }, [slideAnim, fadeAnim]);

  const handleMapLongPress = useCallback((event: any) => {
    const { coordinate } = event.nativeEvent;
    const gridCode = coordinateToGridCode(coordinate);
    
    if (locations[gridCode]) {
      setSelectedLocation(locations[gridCode]);
      setLongPressCoord(null);
    } else {
      setLongPressCoord(coordinate);
      setSelectedLocation(null);
    }
    showBottomSheet();
  }, [locations, showBottomSheet]);

  const handleMarkerPress = useCallback((location: GridLocation) => {
    setSelectedLocation(location);
    setLongPressCoord(null);
    
    // Smooth camera animation to marker
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coordinate.latitude - 0.002, // Offset to show marker above bottom sheet
        longitude: location.coordinate.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 400);
    }
    
    showBottomSheet();
  }, [showBottomSheet]);

  const handleAddNote = useCallback(() => {
    if (longPressCoord) {
      const gridCode = coordinateToGridCode(longPressCoord);
      hideBottomSheet();
      navigation.navigate('AddNote', { coordinate: longPressCoord, gridCode });
    }
  }, [longPressCoord, hideBottomSheet, navigation]);

  const handleViewLocation = useCallback(() => {
    if (selectedLocation) {
      hideBottomSheet();
      navigation.navigate('ViewLocation', { gridCode: selectedLocation.code });
    }
  }, [selectedLocation, hideBottomSheet, navigation]);

  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [userLocation]);

  const focusOnLocation = useCallback((location: GridLocation) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
    setSelectedLocation(location);
    showBottomSheet();
  }, [showBottomSheet]);

  const handleRegionChange = useCallback(() => {
    // Fade header slightly when moving map
    Animated.timing(headerOpacity, {
      toValue: 0.7,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  const handleRegionChangeComplete = useCallback(() => {
    // Restore header opacity
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 28.6139,
        longitude: 77.209,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const renderStoryCard = useCallback(({ item: location }: { item: GridLocation }) => {
    const latestNote = location.notes[location.notes.length - 1];
    const distance = userLocation ? getDistance(userLocation, location.coordinate) : null;
    const isNew = isNewStory(location);
    const popular = isPopular(location);

    return (
      <TouchableOpacity
        style={styles.storyCard}
        onPress={() => focusOnLocation(location)}
        activeOpacity={0.9}
      >
        <View style={[styles.cardAccent, isNew && styles.cardAccentNew, popular && styles.cardAccentPopular]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardBadges}>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {popular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="flame" size={10} color={COLORS.textLight} />
                  <Text style={styles.popularBadgeText}>HOT</Text>
                </View>
              )}
            </View>
            {distance !== null && (
              <Text style={styles.cardDistance}>{formatDistance(distance)}</Text>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {latestNote?.title || 'Untitled'}
          </Text>
          <Text style={styles.cardPreview} numberOfLines={2}>
            {latestNote?.content || 'No description'}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.cardStats}>
              <Ionicons name="document-text" size={14} color={COLORS.textMuted} />
              <Text style={styles.cardStatText}>{location.noteCount}</Text>
              {latestNote && (
                <>
                  <Ionicons name="chatbubble" size={14} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                  <Text style={styles.cardStatText}>{latestNote.replyCount || 0}</Text>
                </>
              )}
            </View>
            <Text style={styles.cardCode}>{location.code}</Text>
          </View>
        </View>
        {latestNote?.images?.[0] && (
          <Image
            source={{ uri: latestNote.images[0] }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    );
  }, [userLocation, isNewStory, isPopular, focusOnLocation]);

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const filterHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        customMapStyle={CUSTOM_MAP_STYLE}
        onLongPress={handleMapLongPress}
        onPress={() => hideBottomSheet()}
        onMapReady={() => setMapReady(true)}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        mapPadding={{ top: 120, right: 0, bottom: showCards ? CARD_HEIGHT + 40 : 0, left: 0 }}
      >
        {filteredLocations.map((location) => (
          <StoryMarker
            key={location.code}
            location={location}
            isSelected={selectedLocation?.code === location.code}
            onPress={() => handleMarkerPress(location)}
          />
        ))}

        {longPressCoord && <NewLocationMarker coordinate={longPressCoord} />}
      </MapView>

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 10, opacity: headerOpacity }]}>
        <LinearGradient
          colors={['rgba(250, 247, 242, 0.98)', 'rgba(250, 247, 242, 0.85)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>here&now</Text>
              <Text style={styles.headerSubtitle}>
                {filteredLocations.length} {filteredLocations.length === 1 ? 'story' : 'stories'} nearby
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.headerButton, showSearch && styles.headerButtonActive]}
                onPress={toggleSearch}
              >
                <Ionicons
                  name="search"
                  size={22}
                  color={showSearch ? COLORS.textLight : COLORS.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, showFilters && styles.headerButtonActive]}
                onPress={toggleFilters}
              >
                <Ionicons
                  name="options"
                  size={22}
                  color={showFilters ? COLORS.textLight : COLORS.primary}
                />
                {(selectedTags.length > 0 || timeFilter !== 'all') && (
                  <View style={styles.filterBadge} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <Animated.View style={[styles.searchContainer, { height: searchHeight }]}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stories..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Filters */}
          <Animated.View style={[styles.filtersContainer, { height: filterHeight }]}>
            {/* Time Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeFilterScroll}
            >
              {TIME_FILTERS.map(filter => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.timeChip,
                    timeFilter === filter.key && styles.timeChipActive,
                  ]}
                  onPress={() => setTimeFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      timeFilter === filter.key && styles.timeChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tag Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagFilterScroll}
            >
              {ALL_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag) && styles.tagChipActive,
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      selectedTags.includes(tag) && styles.tagChipTextActive,
                    ]}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Map Controls */}
      <View style={[styles.mapControls, { top: insets.top + (showSearch ? 180 : showFilters ? 200 : 100) }]}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnUser}
        >
          <Ionicons name="navigate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, !showCards && styles.controlButtonActive]}
          onPress={() => setShowCards(!showCards)}
        >
          <Ionicons
            name={showCards ? 'layers' : 'layers-outline'}
            size={22}
            color={showCards ? COLORS.primary : COLORS.textLight}
          />
        </TouchableOpacity>
      </View>

      {/* Compass */}
      <View style={[styles.compass, { top: insets.top + (showSearch ? 240 : showFilters ? 260 : 160) }]}>
        <View style={styles.compassInner}>
          <View style={styles.compassNorth} />
          <Text style={styles.compassText}>N</Text>
        </View>
      </View>

      {/* Scanner Button */}
      <TouchableOpacity
        style={[styles.scanButton, { bottom: showCards ? insets.bottom + CARD_HEIGHT + 40 : insets.bottom + 100 }]}
        onPress={() => navigation.navigate('Scanner')}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          style={styles.scanButtonGradient}
        >
          <Ionicons name="qr-code" size={18} color={COLORS.textLight} />
          <Text style={styles.scanButtonText}>Scan</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Story Cards Carousel */}
      {showCards && sortedLocations.length > 0 && (
        <View style={[styles.cardsContainer, { bottom: insets.bottom + 20 }]}>
          <FlatList
            data={sortedLocations}
            renderItem={renderStoryCard}
            keyExtractor={item => item.code}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.cardsList}
          />
        </View>
      )}

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
            paddingBottom: insets.bottom + SPACING.lg,
          },
        ]}
      >
        {selectedLocation ? (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetBadges}>
                {isNewStory(selectedLocation) && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
                {isPopular(selectedLocation) && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="flame" size={10} color={COLORS.textLight} />
                    <Text style={styles.popularBadgeText}>HOT</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.sheetTitle}>
              {selectedLocation.notes[0]?.title || 'Stories at this location'}
            </Text>
            <Text style={styles.sheetCode}>{selectedLocation.code}</Text>
            <Text style={styles.sheetCount}>
              {selectedLocation.noteCount} {selectedLocation.noteCount === 1 ? 'story' : 'stories'} here
            </Text>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.sheetButtonSecondary}
                onPress={() => {
                  hideBottomSheet();
                  if (selectedLocation) {
                    navigation.navigate('AddNote', {
                      coordinate: selectedLocation.coordinate,
                      gridCode: selectedLocation.code,
                    });
                  }
                }}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
                <Text style={styles.sheetButtonSecondaryText}>Add Story</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetButtonPrimary}
                onPress={handleViewLocation}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.sheetButtonGradient}
                >
                  <Text style={styles.sheetButtonPrimaryText}>View All</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.textLight} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : longPressCoord ? (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Location</Text>
            <Text style={styles.sheetCode}>
              {coordinateToGridCode(longPressCoord)}
            </Text>
            <Text style={styles.sheetDescription}>
              Be the first to share a story about this place. A unique QR code will be generated.
            </Text>
            <TouchableOpacity
              style={styles.sheetButtonPrimary}
              onPress={handleAddNote}
            >
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentDark]}
                style={styles.sheetButtonGradient}
              >
                <Ionicons name="create" size={18} color={COLORS.textLight} />
                <Text style={styles.sheetButtonPrimaryText}>Add First Story</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  searchContainer: {
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  filtersContainer: {
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  timeFilterScroll: {
    marginBottom: SPACING.sm,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  timeChipActive: {
    backgroundColor: COLORS.primary,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timeChipTextActive: {
    color: COLORS.textLight,
  },
  tagFilterScroll: {
    marginTop: SPACING.xs,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    marginRight: SPACING.sm,
  },
  tagChipActive: {
    backgroundColor: COLORS.accent,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  tagChipTextActive: {
    color: COLORS.textLight,
  },
  mapControls: {
    position: 'absolute',
    right: SPACING.lg,
    gap: SPACING.sm,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
  },
  compass: {
    position: 'absolute',
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  compassInner: {
    alignItems: 'center',
  },
  compassNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.error,
    marginBottom: 2,
  },
  compassText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  // Marker Styles
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  selectionRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: COLORS.primary,
    opacity: 0.3,
  },
  newGlow: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
  },
  markerBody: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  markerBodySelected: {
    backgroundColor: '#1A5A3A',
    transform: [{ scale: 1.1 }],
  },
  markerBodyPopular: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  hotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCount: {
    color: COLORS.textLight,
    fontWeight: '800',
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    marginTop: -1,
  },
  markerTailSelected: {
    borderTopColor: '#1A5A3A',
  },
  markerTailPopular: {
    borderTopColor: COLORS.primary,
  },
  newMarkerContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMarkerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent,
  },
  newMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    borderWidth: 3,
    borderColor: COLORS.card,
    ...SHADOWS.medium,
  },
  scanButton: {
    position: 'absolute',
    right: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  scanButtonGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: SPACING.sm,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  cardsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  cardsList: {
    paddingHorizontal: 20,
  },
  storyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  cardAccent: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  cardAccentNew: {
    backgroundColor: COLORS.accent,
  },
  cardAccentPopular: {
    backgroundColor: '#FF6B6B',
  },
  cardContent: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  newBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  cardDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  cardPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStatText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  cardCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.primary,
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardImage: {
    width: 90,
    height: '100%',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.large,
  },
  sheetContent: {
    padding: SPACING.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  sheetHeader: {
    marginBottom: SPACING.sm,
  },
  sheetBadges: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sheetCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.primary,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  sheetCount: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sheetDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  sheetButtonPrimary: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minHeight: 50,
  },
  sheetButtonGradient: {
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    gap: SPACING.sm,
  },
  sheetButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  sheetButtonSecondary: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    gap: SPACING.xs,
  },
  sheetButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
