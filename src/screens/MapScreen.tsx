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
  PanResponder,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { coordinateToGridCode, getDistance, formatDistance } from '../utils/GeoGrid';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList, GridLocation, PlaceNote } from '../types';
import { voteOnNote, addReply } from '../utils/storage';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const CARD_HEIGHT = 160;
const SHEET_MIN_HEIGHT = 320;
const SHEET_MAX_HEIGHT = height * 0.85;
const SNAP_THRESHOLD = 50;

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Custom map style
const CUSTOM_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f1eb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1eb' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9b2a6' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8e4de' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#c8d7a4' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8c967' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#b9d3c2' }] },
];

const ALL_TAGS = ['nostalgia', 'food', 'history', 'art', 'love', 'community', 'culture', 'childhood', 'milestone', 'nature'];
const TIME_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

// Memoized Story Marker
const StoryMarker = memo(({ location, isSelected, onPress }: { location: GridLocation; isSelected: boolean; onPress: () => void }) => {
  const noteCount = location.noteCount;
  const markerSize = Math.min(36 + noteCount * 2, 52);
  const fontSize = Math.min(13 + noteCount, 18);

  return (
    <Marker coordinate={location.coordinate} onPress={onPress} tracksViewChanges={false} anchor={{ x: 0.5, y: 1 }}>
      <View style={styles.markerWrapper}>
        {isSelected && <View style={[styles.selectionRing, { width: markerSize + 16, height: markerSize + 16 }]} />}
        <View style={[styles.markerBody, { width: markerSize, height: markerSize, borderRadius: markerSize / 2 }, isSelected && styles.markerBodySelected]}>
          <Text style={[styles.markerCount, { fontSize }]}>{noteCount}</Text>
        </View>
        <View style={[styles.markerTail, isSelected && styles.markerTailSelected]} />
      </View>
    </Marker>
  );
});

// New location marker
const NewLocationMarker = memo(({ coordinate }: { coordinate: { latitude: number; longitude: number } }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Marker coordinate={coordinate} tracksViewChanges={true} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.newMarkerContainer}>
        <Animated.View style={[styles.newMarkerPulse, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.4], outputRange: [0.6, 0] }) }]} />
        <View style={styles.newMarkerDot} />
      </View>
    </Marker>
  );
});

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { userLocation, locations, user, refreshLocations } = useApp();
  const mapRef = useRef<MapView>(null);
  
  // State
  const [selectedLocation, setSelectedLocation] = useState<GridLocation | null>(null);
  const [selectedNote, setSelectedNote] = useState<PlaceNote | null>(null);
  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Animations
  const sheetHeight = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for draggable sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = sheetExpanded 
          ? SHEET_MAX_HEIGHT - gestureState.dy 
          : SHEET_MIN_HEIGHT - gestureState.dy;
        
        if (newHeight >= 100 && newHeight <= SHEET_MAX_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = sheetExpanded ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
        const newHeight = currentHeight - gestureState.dy;
        
        // Swipe down to dismiss
        if (gestureState.dy > 100 && gestureState.vy > 0.5) {
          hideSheet();
          return;
        }
        
        // Snap to expanded or collapsed
        if (newHeight > (SHEET_MIN_HEIGHT + SHEET_MAX_HEIGHT) / 2) {
          expandSheet();
        } else if (newHeight < SHEET_MIN_HEIGHT - SNAP_THRESHOLD) {
          hideSheet();
        } else {
          collapseSheet();
        }
      },
    })
  ).current;

  const showSheet = useCallback((location: GridLocation, note?: PlaceNote) => {
    setSelectedLocation(location);
    setSelectedNote(note || location.notes[location.notes.length - 1]);
    setSheetExpanded(false);
    
    Animated.parallel([
      Animated.spring(sheetHeight, { toValue: SHEET_MIN_HEIGHT, useNativeDriver: false, tension: 65, friction: 11 }),
      Animated.timing(sheetOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  }, []);

  const hideSheet = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetHeight, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(sheetOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
    ]).start(() => {
      setSelectedLocation(null);
      setSelectedNote(null);
      setLongPressCoord(null);
      setSheetExpanded(false);
      setReplyText('');
    });
  }, []);

  const expandSheet = useCallback(() => {
    setSheetExpanded(true);
    Animated.spring(sheetHeight, { toValue: SHEET_MAX_HEIGHT, useNativeDriver: false, tension: 65, friction: 11 }).start();
  }, []);

  const collapseSheet = useCallback(() => {
    setSheetExpanded(false);
    Keyboard.dismiss();
    Animated.spring(sheetHeight, { toValue: SHEET_MIN_HEIGHT, useNativeDriver: false, tension: 65, friction: 11 }).start();
  }, []);

  // Filter locations
  const filteredLocations = useMemo(() => {
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    return Object.values(locations).filter(location => {
      if (timeFilter !== 'all') {
        const range = timeRanges[timeFilter];
        if (!location.notes.some(note => now - note.createdAt < range)) return false;
      }
      if (selectedTags.length > 0) {
        const locationTags = location.notes.flatMap(note => note.tags || []);
        if (!selectedTags.some(tag => locationTags.includes(tag))) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!location.notes.some(note => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query))) return false;
      }
      return true;
    });
  }, [locations, timeFilter, selectedTags, searchQuery]);

  const sortedLocations = useMemo(() => {
    if (!userLocation) return filteredLocations;
    return [...filteredLocations].sort((a, b) => getDistance(userLocation, a.coordinate) - getDistance(userLocation, b.coordinate));
  }, [filteredLocations, userLocation]);

  useEffect(() => {
    if (userLocation && mapRef.current && mapReady) {
      mapRef.current.animateToRegion({ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
    }
  }, [userLocation, mapReady]);

  const toggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
    Animated.timing(searchAnim, { toValue: showSearch ? 0 : 1, duration: 300, useNativeDriver: false }).start();
  }, [showSearch]);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
    Animated.timing(filterAnim, { toValue: showFilters ? 0 : 1, duration: 300, useNativeDriver: false }).start();
  }, [showFilters]);

  const handleMarkerPress = useCallback((location: GridLocation) => {
    setLongPressCoord(null);
    if (mapRef.current) {
      mapRef.current.animateToRegion({ latitude: location.coordinate.latitude - 0.003, longitude: location.coordinate.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 400);
    }
    showSheet(location);
  }, [showSheet]);

  const handleMapLongPress = useCallback((event: any) => {
    const { coordinate } = event.nativeEvent;
    const gridCode = coordinateToGridCode(coordinate);
    
    if (locations[gridCode]) {
      handleMarkerPress(locations[gridCode]);
    } else {
      setLongPressCoord(coordinate);
      setSelectedLocation(null);
      setSelectedNote(null);
      Animated.parallel([
        Animated.spring(sheetHeight, { toValue: 200, useNativeDriver: false, tension: 65, friction: 11 }),
        Animated.timing(sheetOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [locations, handleMarkerPress]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || !selectedNote || !selectedLocation) return;
    const currentVote = selectedNote.votedBy[user.id];
    const newVoteType = currentVote === voteType ? 'none' : voteType;
    const updatedNote = await voteOnNote(selectedNote.gridCode, selectedNote.id, user.id, newVoteType as 'up' | 'down' | 'none');
    if (updatedNote) {
      setSelectedNote(updatedNote);
      await refreshLocations();
    }
  };

  const handleAddReply = async () => {
    if (!user || !selectedNote || !replyText.trim()) return;
    await addReply(selectedNote.gridCode, selectedNote.id, null, replyText.trim(), user.name, user.id);
    setReplyText('');
    Keyboard.dismiss();
    await refreshLocations();
    // Refresh the note
    const location = locations[selectedNote.gridCode];
    if (location) {
      const updatedNote = location.notes.find(n => n.id === selectedNote.id);
      if (updatedNote) setSelectedNote(updatedNote);
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const initialRegion: Region = userLocation
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  const renderStoryCard = useCallback(({ item: location }: { item: GridLocation }) => {
    const latestNote = location.notes[location.notes.length - 1];
    const distance = userLocation ? getDistance(userLocation, location.coordinate) : null;

    return (
      <TouchableOpacity style={styles.storyCard} onPress={() => handleMarkerPress(location)} activeOpacity={0.9}>
        <View style={styles.cardAccent} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            {distance !== null && <Text style={styles.cardDistance}>{formatDistance(distance)}</Text>}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{latestNote?.title || 'Untitled'}</Text>
          <Text style={styles.cardPreview} numberOfLines={2}>{latestNote?.content || 'No description'}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.cardStats}>
              <Ionicons name="document-text" size={14} color={COLORS.textMuted} />
              <Text style={styles.cardStatText}>{location.noteCount}</Text>
            </View>
            <Text style={styles.cardCode}>{location.code}</Text>
          </View>
        </View>
        {latestNote?.images?.[0] && <Image source={{ uri: latestNote.images[0] }} style={styles.cardImage} resizeMode="cover" />}
      </TouchableOpacity>
    );
  }, [userLocation, handleMarkerPress]);

  const searchHeight = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] });
  const filterHeight = filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 100] });

  const score = selectedNote ? selectedNote.upvotes - selectedNote.downvotes : 0;
  const userVote = user && selectedNote ? selectedNote.votedBy[user.id] : undefined;

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
        onPress={() => hideSheet()}
        onMapReady={() => setMapReady(true)}
        mapPadding={{ top: 120, right: 0, bottom: showCards ? CARD_HEIGHT + 40 : 0, left: 0 }}
      >
        {filteredLocations.map((location) => (
          <StoryMarker key={location.code} location={location} isSelected={selectedLocation?.code === location.code} onPress={() => handleMarkerPress(location)} />
        ))}
        {longPressCoord && <NewLocationMarker coordinate={longPressCoord} />}
      </MapView>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <LinearGradient colors={['rgba(250, 247, 242, 0.98)', 'rgba(250, 247, 242, 0.85)']} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>here&now</Text>
              <Text style={styles.headerSubtitle}>{filteredLocations.length} stories nearby</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={[styles.headerButton, showSearch && styles.headerButtonActive]} onPress={toggleSearch}>
                <Ionicons name="search" size={22} color={showSearch ? COLORS.textLight : COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, showFilters && styles.headerButtonActive]} onPress={toggleFilters}>
                <Ionicons name="options" size={22} color={showFilters ? COLORS.textLight : COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={[styles.searchContainer, { height: searchHeight }]}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput style={styles.searchInput} placeholder="Search stories..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[styles.filtersContainer, { height: filterHeight }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIME_FILTERS.map(filter => (
                <TouchableOpacity key={filter.key} style={[styles.filterChip, timeFilter === filter.key && styles.filterChipActive]} onPress={() => setTimeFilter(filter.key)}>
                  <Text style={[styles.filterChipText, timeFilter === filter.key && styles.filterChipTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {ALL_TAGS.slice(0, 6).map(tag => (
                <TouchableOpacity key={tag} style={[styles.filterChip, selectedTags.includes(tag) && styles.filterChipActive]} onPress={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>
                  <Text style={[styles.filterChipText, selectedTags.includes(tag) && styles.filterChipTextActive]}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </LinearGradient>
      </View>

      {/* Controls */}
      <View style={[styles.mapControls, { top: insets.top + (showSearch ? 180 : showFilters ? 200 : 100) }]}>
        <TouchableOpacity style={styles.controlButton} onPress={() => userLocation && mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500)}>
          <Ionicons name="navigate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, !showCards && styles.controlButtonActive]} onPress={() => setShowCards(!showCards)}>
          <Ionicons name={showCards ? 'layers' : 'layers-outline'} size={22} color={showCards ? COLORS.primary : COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Scan Button */}
      <TouchableOpacity style={[styles.scanButton, { bottom: showCards ? insets.bottom + CARD_HEIGHT + 40 : insets.bottom + 100 }]} onPress={() => navigation.navigate('Scanner')}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.scanButtonGradient}>
          <Ionicons name="qr-code" size={18} color={COLORS.textLight} />
          <Text style={styles.scanButtonText}>Scan</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Story Cards */}
      {showCards && sortedLocations.length > 0 && (
        <View style={[styles.cardsContainer, { bottom: insets.bottom + 20 }]}>
          <FlatList data={sortedLocations} renderItem={renderStoryCard} keyExtractor={item => item.code} horizontal showsHorizontalScrollIndicator={false} snapToInterval={CARD_WIDTH + 12} decelerationRate="fast" contentContainerStyle={styles.cardsList} />
        </View>
      )}

      {/* Interactive Story Sheet */}
      <Animated.View style={[styles.storySheet, { height: sheetHeight, opacity: sheetOpacity }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.sheetDragArea}>
            <View style={styles.sheetHandle} />
            {selectedNote && (
              <View style={styles.sheetHeaderRow}>
                <TouchableOpacity onPress={hideSheet} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => sheetExpanded ? collapseSheet() : expandSheet()} style={styles.expandBtn}>
                  <Ionicons name={sheetExpanded ? 'chevron-down' : 'chevron-up'} size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
                {selectedLocation && selectedLocation.noteCount > 1 && (
                  <TouchableOpacity onPress={() => { hideSheet(); navigation.navigate('ViewLocation', { gridCode: selectedLocation.code }); }} style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>View all {selectedLocation.noteCount}</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {selectedNote ? (
              <>
                {/* Location Badge */}
                <TouchableOpacity style={styles.locationBadge} onPress={() => { hideSheet(); navigation.navigate('ViewLocation', { gridCode: selectedNote.gridCode }); }}>
                  <Ionicons name="location" size={12} color={COLORS.primary} />
                  <Text style={styles.locationBadgeText}>{selectedNote.gridCode}</Text>
                </TouchableOpacity>

                {/* Author & Time */}
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorAvatarText}>{selectedNote.authorName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.authorName}>{selectedNote.authorName}</Text>
                    <Text style={styles.timeAgo}>{formatTimeAgo(selectedNote.createdAt)}</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.storyTitle}>{selectedNote.title}</Text>

                {/* Content */}
                <Text style={styles.storyContent} numberOfLines={sheetExpanded ? undefined : 4}>{selectedNote.content}</Text>

                {/* Images */}
                {selectedNote.images && selectedNote.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                    {selectedNote.images.map((img, i) => (
                      <Image key={i} source={{ uri: img }} style={styles.storyImage} />
                    ))}
                  </ScrollView>
                )}

                {/* Tags */}
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {selectedNote.tags.map((tag, i) => (
                      <View key={i} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <View style={styles.voteContainer}>
                    <TouchableOpacity onPress={() => handleVote('up')} style={styles.voteBtn}>
                      <Ionicons name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'} size={22} color={userVote === 'up' ? COLORS.success : COLORS.textMuted} />
                    </TouchableOpacity>
                    <Text style={[styles.voteCount, score > 0 && { color: COLORS.success }, score < 0 && { color: COLORS.error }]}>{score}</Text>
                    <TouchableOpacity onPress={() => handleVote('down')} style={styles.voteBtn}>
                      <Ionicons name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'} size={22} color={userVote === 'down' ? COLORS.error : COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => { hideSheet(); navigation.navigate('NoteDetail', { note: selectedNote }); }}>
                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.textMuted} />
                    <Text style={styles.actionBtnText}>{selectedNote.replyCount || 0}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QRDisplay', { gridCode: selectedNote.gridCode })}>
                    <Ionicons name="qr-code-outline" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Quick Reply */}
                {sheetExpanded && (
                  <View style={styles.replySection}>
                    <Text style={styles.replySectionTitle}>Add a reply</Text>
                    <View style={styles.replyInputRow}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Share your thoughts..."
                        placeholderTextColor={COLORS.textMuted}
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                      />
                      <TouchableOpacity style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]} onPress={handleAddReply} disabled={!replyText.trim()}>
                        <Ionicons name="send" size={18} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Read More / Full Story Button */}
                {!sheetExpanded && (
                  <TouchableOpacity style={styles.readMoreBtn} onPress={expandSheet}>
                    <Text style={styles.readMoreText}>Expand to read more & reply</Text>
                    <Ionicons name="chevron-up" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </>
            ) : longPressCoord ? (
              <>
                <Text style={styles.newLocationTitle}>New Location</Text>
                <Text style={styles.newLocationCode}>{coordinateToGridCode(longPressCoord)}</Text>
                <Text style={styles.newLocationDesc}>Be the first to share a story here. A unique QR code will be generated.</Text>
                <TouchableOpacity style={styles.addFirstBtn} onPress={() => { hideSheet(); navigation.navigate('AddNote', { coordinate: longPressCoord, gridCode: coordinateToGridCode(longPressCoord) }); }}>
                  <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={styles.addFirstBtnGradient}>
                    <Ionicons name="create" size={18} color={COLORS.textLight} />
                    <Text style={styles.addFirstBtnText}>Add First Story</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerGradient: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, borderBottomLeftRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.xl, ...SHADOWS.medium },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: SPACING.sm },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(45, 71, 57, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerButtonActive: { backgroundColor: COLORS.primary },
  searchContainer: { overflow: 'hidden', marginTop: SPACING.sm },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, height: 48, borderWidth: 1, borderColor: COLORS.inputBorder },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text, marginLeft: SPACING.sm },
  filtersContainer: { overflow: 'hidden', marginTop: SPACING.sm },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, marginRight: SPACING.sm },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.textLight },
  mapControls: { position: 'absolute', right: SPACING.lg, gap: SPACING.sm },
  controlButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  controlButtonActive: { backgroundColor: COLORS.primary },
  scanButton: { position: 'absolute', right: SPACING.lg, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.large },
  scanButtonGradient: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: SPACING.sm },
  scanButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.textLight },
  cardsContainer: { position: 'absolute', left: 0, right: 0 },
  cardsList: { paddingHorizontal: 20 },
  storyCard: { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, marginRight: 12, flexDirection: 'row', overflow: 'hidden', ...SHADOWS.large },
  cardAccent: { width: 4, backgroundColor: COLORS.primary },
  cardContent: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end' },
  cardDistance: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardPreview: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, flex: 1, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  cardStatText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  cardCode: { fontSize: 10, fontFamily: 'monospace', color: COLORS.primary, backgroundColor: 'rgba(45, 71, 57, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardImage: { width: 90, height: '100%' },
  // Markers
  markerWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  selectionRing: { position: 'absolute', borderRadius: 100, borderWidth: 3, borderColor: COLORS.primary, opacity: 0.3 },
  markerBody: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  markerBodySelected: { backgroundColor: '#1A5A3A', transform: [{ scale: 1.1 }] },
  markerCount: { color: COLORS.textLight, fontWeight: '800' },
  markerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.primary, marginTop: -1 },
  markerTailSelected: { borderTopColor: '#1A5A3A' },
  newMarkerContainer: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  newMarkerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.accent },
  newMarkerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.accent, borderWidth: 3, borderColor: COLORS.card, ...SHADOWS.medium },
  // Story Sheet
  storySheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...SHADOWS.large, overflow: 'hidden' },
  sheetDragArea: { paddingTop: 12, paddingHorizontal: SPACING.lg },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, alignSelf: 'center', marginBottom: SPACING.sm, opacity: 0.4 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  expandBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', backgroundColor: 'rgba(45, 71, 57, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, gap: 4 },
  viewAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: SPACING.lg },
  locationBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(45, 71, 57, 0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.md },
  locationBadgeText: { fontSize: 11, fontFamily: 'monospace', color: COLORS.primary, marginLeft: 4, fontWeight: '600' },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  authorAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  authorName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  timeAgo: { fontSize: 12, color: COLORS.textMuted },
  storyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, lineHeight: 26, marginBottom: SPACING.sm },
  storyContent: { fontSize: 15, color: COLORS.text, lineHeight: 24, marginBottom: SPACING.md },
  imagesScroll: { marginBottom: SPACING.md, marginHorizontal: -SPACING.lg, paddingHorizontal: SPACING.lg },
  storyImage: { width: 200, height: 140, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  tagChip: { backgroundColor: 'rgba(45, 71, 57, 0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  tagChipText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: SPACING.lg },
  voteContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(45, 71, 57, 0.06)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 4 },
  voteBtn: { padding: 8 },
  voteCount: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, minWidth: 28, textAlign: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  actionBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  replySection: { marginTop: SPACING.lg, paddingTop: SPACING.lg, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  replySectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  replyInput: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: 15, color: COLORS.text, minHeight: 50, maxHeight: 100, borderWidth: 1, borderColor: COLORS.inputBorder },
  replySubmitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  replySubmitBtnDisabled: { opacity: 0.4 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm, gap: 6 },
  readMoreText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  // New location sheet
  newLocationTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  newLocationCode: { fontSize: 14, fontFamily: 'monospace', color: COLORS.primary, backgroundColor: 'rgba(45, 71, 57, 0.08)', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, alignSelf: 'flex-start', marginBottom: SPACING.md },
  newLocationDesc: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.lg },
  addFirstBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  addFirstBtnGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  addFirstBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
});
