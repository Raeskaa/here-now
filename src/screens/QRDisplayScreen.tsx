import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList, PlaceNote } from '../types';
import { useApp } from '../context/AppContext';
import { gridCodeToCoordinate } from '../utils/GeoGrid';

type NavigationProp = StackNavigationProp<RootStackParamList, 'QRDisplay'>;
type RouteType = RouteProp<RootStackParamList, 'QRDisplay'>;

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.45; // Smaller QR

export default function QRDisplayScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { locations } = useApp();
  const { gridCode } = route.params;
  const qrRef = useRef<any>(null);

  const location = locations[gridCode];
  const coordinate = gridCodeToCoordinate(gridCode);
  const stories = location?.notes || [];

  const qrValue = JSON.stringify({
    type: 'here&now',
    version: 1,
    gridCode,
    coordinate,
  });

  const handleShare = async () => {
    try {
      const noteCount = location?.noteCount || 0;
      await Share.share({
        title: `here&now: ${gridCode}`,
        message: `Discover ${noteCount} ${noteCount === 1 ? 'story' : 'stories'} at this location!\n\nGrid Code: ${gridCode}\n\nScan the QR code with here&now app to read stories from this place.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewOnMap = () => {
    navigation.goBack();
    // Navigate to map and the map will center on this location
    navigation.navigate('Main');
  };

  const handleViewStory = (note: PlaceNote) => {
    navigation.navigate('NoteDetail', { note });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location QR</Text>
        <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrValue}
                size={QR_SIZE}
                color={COLORS.primary}
                backgroundColor={COLORS.card}
                getRef={(ref: any) => (qrRef.current = ref)}
              />
            </View>
            <View style={styles.qrCodeBadge}>
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.qrCodeText}>{gridCode}</Text>
            </View>
          </View>

          {/* Quick Stats */}
          {location && (
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Ionicons name="document-text" size={18} color={COLORS.primary} />
                <Text style={styles.quickStatValue}>{location.noteCount}</Text>
                <Text style={styles.quickStatLabel}>{location.noteCount === 1 ? 'Story' : 'Stories'}</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.accent} />
                <Text style={styles.quickStatValue}>
                  {new Date(location.firstNoteAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.quickStatLabel}>Since</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewOnMap}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(45, 71, 57, 0.1)' }]}>
              <Ionicons name="map" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View on Map</Text>
              <Text style={styles.actionSubtitle}>See this location on the map</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => {
              navigation.goBack();
              navigation.navigate('AddNote', { coordinate, gridCode });
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(212, 165, 116, 0.15)' }]}>
              <Ionicons name="create" size={22} color={COLORS.accent} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add Your Story</Text>
              <Text style={styles.actionSubtitle}>Share a memory about this place</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(90, 122, 138, 0.1)' }]}>
              <Ionicons name="share-social" size={22} color={COLORS.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Share Location</Text>
              <Text style={styles.actionSubtitle}>Send this QR code to others</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stories at this location */}
        {stories.length > 0 && (
          <View style={styles.storiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stories Here</Text>
              {stories.length > 3 && (
                <TouchableOpacity onPress={() => { navigation.goBack(); navigation.navigate('ViewLocation', { gridCode }); }}>
                  <Text style={styles.seeAllText}>See all {stories.length}</Text>
                </TouchableOpacity>
              )}
            </View>

            {stories.slice(0, 3).map((note) => (
              <TouchableOpacity 
                key={note.id} 
                style={styles.storyCard}
                onPress={() => handleViewStory(note)}
                activeOpacity={0.7}
              >
                {note.images && note.images.length > 0 && (
                  <Image source={{ uri: note.images[0] }} style={styles.storyImage} />
                )}
                <View style={styles.storyContent}>
                  <Text style={styles.storyTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.storyPreview} numberOfLines={2}>{note.content}</Text>
                  <View style={styles.storyMeta}>
                    <Text style={styles.storyAuthor}>{note.authorName}</Text>
                    <Text style={styles.storyDot}>·</Text>
                    <Text style={styles.storyTime}>{formatTimeAgo(note.createdAt)}</Text>
                    <View style={styles.storyStats}>
                      <Ionicons name="arrow-up" size={12} color={COLORS.textMuted} />
                      <Text style={styles.storyStatText}>{note.upvotes - note.downvotes}</Text>
                      <Ionicons name="chatbubble-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                      <Text style={styles.storyStatText}>{note.replyCount || 0}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tip */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
          <Text style={styles.tipText}>
            Print this QR code and display it at the physical location. Anyone who scans it can discover and contribute stories.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => { navigation.goBack(); navigation.navigate('ViewLocation', { gridCode }); }}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.primaryBtnGradient}>
            <Ionicons name="book-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.primaryBtnText}>View All Stories</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  shareIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  qrCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  qrWrapper: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
  },
  qrCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  qrCodeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    ...SHADOWS.small,
  },
  quickStat: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  quickStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  actionsSection: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  storiesSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  storyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  storyImage: {
    width: 80,
    height: 80,
  },
  storyContent: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  storyPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  storyAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  storyDot: {
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  storyTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  storyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  storyStatText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  primaryBtn: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
