import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList, GridLocation, PlaceNote } from '../types';
import { useApp } from '../context/AppContext';
import { formatDistance, getDistance } from '../utils/GeoGrid';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ViewLocation'>;
type RouteType = RouteProp<RootStackParamList, 'ViewLocation'>;

const { width } = Dimensions.get('window');

export default function ViewLocationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { locations, userLocation } = useApp();
  const { gridCode } = route.params;

  const location: GridLocation | undefined = locations[gridCode];
  const distance = userLocation && location
    ? getDistance(userLocation, location.coordinate)
    : null;

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>Location not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate('QRDisplay', { gridCode })}
          >
            <Text style={styles.qrButtonText}>QR Code</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCode}>{gridCode}</Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{location.noteCount}</Text>
            <Text style={styles.statLabel}>
              {location.noteCount === 1 ? 'Story' : 'Stories'}
            </Text>
          </View>
          {distance !== null && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>Away</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDate(location.firstNoteAt)}</Text>
            <Text style={styles.statLabel}>First Story</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {location.notes.map((note, index) => (
          <TouchableOpacity
            key={note.id}
            style={styles.noteCard}
            onPress={() => navigation.navigate('NoteDetail', { note })}
            activeOpacity={0.8}
          >
            <View style={styles.noteHeader}>
              <View style={styles.noteNumber}>
                <Text style={styles.noteNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.noteMeta}>
                <Text style={styles.noteAuthor}>{note.authorName}</Text>
                <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
              </View>
            </View>

            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteContent} numberOfLines={3}>
              {note.content}
            </Text>

            {note.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.noteImages}
              >
                {note.images.map((img, imgIndex) => (
                  <Image
                    key={imgIndex}
                    source={{ uri: img }}
                    style={styles.noteImage}
                  />
                ))}
              </ScrollView>
            )}

            {note.tags && note.tags.length > 0 && (
              <View style={styles.noteTags}>
                {note.tags.map((tag, tagIndex) => (
                  <View key={tagIndex} style={styles.noteTag}>
                    <Text style={styles.noteTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.noteFooter}>
              <Text style={styles.readMore}>Read full story →</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addNoteButton}
          onPress={() => navigation.navigate('AddNote', {
            coordinate: location.coordinate,
            gridCode,
          })}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentDark]}
            style={styles.addNoteGradient}
          >
            <Text style={styles.addNoteIcon}>✍️</Text>
            <Text style={styles.addNoteText}>Add Your Story</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  qrButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  qrButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  headerCode: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.lg,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  noteCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noteNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  noteNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  noteMeta: {
    flex: 1,
  },
  noteAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  noteDate: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  noteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 26,
  },
  noteContent: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  noteImages: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  noteImage: {
    width: 140,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  noteTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  noteTag: {
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  noteTagText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: SPACING.md,
  },
  readMore: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  addNoteButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  addNoteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  addNoteIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  addNoteText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  backButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});

