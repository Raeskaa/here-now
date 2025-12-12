import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { RootStackParamList, PlaceNote, SortOption, Award, AWARD_CONFIG } from '../types';
import { useApp } from '../context/AppContext';
import { formatDistance } from '../utils/GeoGrid';
import { getAllNotesSorted, voteOnNote, giveAward, addReply } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

interface FeedItem {
  note: PlaceNote;
  distance: number | null;
}

export default function NearbyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { userLocation, refreshLocations, user } = useApp();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<PlaceNote | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadFeed = useCallback(async () => {
    const items = await getAllNotesSorted(sortBy, userLocation);
    setFeedItems(items);
  }, [sortBy, userLocation]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLocations();
    await loadFeed();
    setRefreshing(false);
  };

  const handleVote = async (note: PlaceNote, voteType: 'up' | 'down') => {
    if (!user) return;
    
    const currentVote = note.votedBy[user.id];
    const newVoteType = currentVote === voteType ? 'none' : voteType;
    
    await voteOnNote(note.gridCode, note.id, user.id, newVoteType as 'up' | 'down' | 'none');
    await loadFeed();
  };

  const handleGiveAward = async (awardType: Award['type']) => {
    if (!selectedNote || !user) return;
    
    await giveAward(selectedNote.gridCode, selectedNote.id, awardType, user.id);
    setShowAwardModal(false);
    setSelectedNote(null);
    await loadFeed();
  };

  const handleAddReply = async () => {
    if (!selectedNote || !user || !replyText.trim()) return;
    
    await addReply(
      selectedNote.gridCode,
      selectedNote.id,
      null,
      replyText.trim(),
      user.name,
      user.id
    );
    setShowReplyModal(false);
    setSelectedNote(null);
    setReplyText('');
    Keyboard.dismiss();
    await loadFeed();
  };

  const closeReplyModal = () => {
    Keyboard.dismiss();
    setShowReplyModal(false);
    setReplyText('');
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    return `${Math.floor(months / 12)}y`;
  };

  const getVoteScore = (note: PlaceNote) => note.upvotes - note.downvotes;

  const sortOptions: { key: SortOption; label: string; icon: string }[] = [
    { key: 'hot', label: 'Hot', icon: 'flame' },
    { key: 'new', label: 'New', icon: 'time' },
    { key: 'top', label: 'Top', icon: 'trophy' },
    { key: 'nearby', label: 'Nearby', icon: 'location' },
  ];

  const renderPostCard = ({ note, distance }: FeedItem) => {
    const score = getVoteScore(note);
    const userVote = user ? note.votedBy[user.id] : undefined;

    return (
      <View key={note.id} style={styles.postCard}>
        {/* Vote Column */}
        <View style={styles.voteColumn}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(note, 'up')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
              size={22}
              color={userVote === 'up' ? COLORS.success : COLORS.textMuted}
            />
          </TouchableOpacity>
          <Text style={[
            styles.voteScore,
            score > 0 && styles.voteScorePositive,
            score < 0 && styles.voteScoreNegative,
          ]}>
            {score}
          </Text>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(note, 'down')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
              size={22}
              color={userVote === 'down' ? COLORS.error : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Content Column */}
        <TouchableOpacity
          style={styles.postContent}
          onPress={() => navigation.navigate('NoteDetail', { note })}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.postHeader}>
            <View style={styles.postMeta}>
              <TouchableOpacity
                style={styles.locationBadge}
                onPress={() => navigation.navigate('ViewLocation', { gridCode: note.gridCode })}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="location" size={12} color={COLORS.primary} />
                <Text style={styles.locationText}>{note.gridCode}</Text>
              </TouchableOpacity>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{note.authorName}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{formatTimeAgo(note.createdAt)}</Text>
            </View>
            {distance !== null && (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={10} color={COLORS.textLight} />
                <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.postTitle}>{note.title}</Text>

          {/* Awards */}
          {note.awards.length > 0 && (
            <View style={styles.awardsRow}>
              {Object.entries(
                note.awards.reduce((acc, award) => {
                  acc[award.type] = (acc[award.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <View key={type} style={styles.awardBadge}>
                  <Text style={styles.awardIcon}>
                    {AWARD_CONFIG[type as keyof typeof AWARD_CONFIG].icon}
                  </Text>
                  {count > 1 && <Text style={styles.awardCount}>{count}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Preview */}
          <Text style={styles.postPreview} numberOfLines={3}>
            {note.content}
          </Text>

          {/* Images Preview */}
          {note.images.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: note.images[0] }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              {note.images.length > 1 && (
                <View style={styles.moreImages}>
                  <Text style={styles.moreImagesText}>+{note.images.length - 1}</Text>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {note.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('NoteDetail', { note })}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.actionText}>
                {note.replyCount} {note.replyCount === 1 ? 'Reply' : 'Replies'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedNote(note);
                setShowAwardModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="gift-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.actionText}>Award</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedNote(note);
                setShowReplyModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="arrow-redo-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Stories</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Scanner')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="qr-code" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Sort Tabs */}
      <View style={styles.sortContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScroll}
        >
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortTab,
                sortBy === option.key && styles.sortTabActive,
              ]}
              onPress={() => setSortBy(option.key)}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={sortBy === option.key ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.sortTabText,
                  sortBy === option.key && styles.sortTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={[styles.feedContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {feedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No stories yet</Text>
            <Text style={styles.emptyText}>
              Be the first to share a story! Long press on the map to get started.
            </Text>
          </View>
        ) : (
          feedItems.map(renderPostCard)
        )}
      </ScrollView>

      {/* Award Modal */}
      <Modal
        visible={showAwardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAwardModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAwardModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.awardModal, { paddingBottom: insets.bottom + SPACING.lg }]}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Give an Award</Text>
                <Text style={styles.modalSubtitle}>
                  Show appreciation for this story
                </Text>
                <View style={styles.awardsGrid}>
                  {Object.entries(AWARD_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.awardOption}
                      onPress={() => handleGiveAward(key as Award['type'])}
                    >
                      <Text style={styles.awardOptionIcon}>{config.icon}</Text>
                      <Text style={styles.awardOptionName}>{config.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Reply Modal - with proper keyboard handling */}
      <Modal
        visible={showReplyModal}
        transparent
        animationType="slide"
        onRequestClose={closeReplyModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableWithoutFeedback onPress={closeReplyModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.replyModal, { paddingBottom: insets.bottom + SPACING.lg }]}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Add Reply</Text>
                  {selectedNote && (
                    <Text style={styles.replyingTo} numberOfLines={1}>
                      Replying to: {selectedNote.title}
                    </Text>
                  )}
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write your reply..."
                    placeholderTextColor={COLORS.textMuted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeReplyModal}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        !replyText.trim() && styles.submitButtonDisabled,
                      ]}
                      onPress={handleAddReply}
                      disabled={!replyText.trim()}
                    >
                      <Text style={styles.submitButtonText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  sortScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'transparent',
    marginRight: SPACING.xs,
    minHeight: 36,
  },
  sortTabActive: {
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
  },
  sortTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  sortTabTextActive: {
    color: COLORS.primary,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingVertical: SPACING.sm,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginBottom: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  voteColumn: {
    width: 48,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  voteButton: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteScore: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  voteScorePositive: {
    color: COLORS.success,
  },
  voteScoreNegative: {
    color: COLORS.error,
  },
  postContent: {
    flex: 1,
    padding: SPACING.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minHeight: 28,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaDot: {
    color: COLORS.textMuted,
    marginHorizontal: 6,
    fontSize: 10,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    marginLeft: 3,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  awardsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  awardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  awardIcon: {
    fontSize: 12,
  },
  awardCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  postPreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.md,
  },
  moreImages: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  moreImagesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  tag: {
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 36,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  awardModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  awardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  awardOption: {
    width: (width - SPACING.lg * 2 - 20) / 3,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    marginBottom: SPACING.sm,
    minHeight: 80,
  },
  awardOptionIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  awardOptionName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  replyModal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  replyingTo: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  replyInput: {
    backgroundColor: '#F0F2F5',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    maxHeight: 200,
    marginBottom: SPACING.md,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
