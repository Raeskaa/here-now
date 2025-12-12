import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../utils/theme';
import { RootStackParamList, Reply, Award, AWARD_CONFIG } from '../types';
import { useApp } from '../context/AppContext';
import { voteOnNote, addReply, giveAward, getLocation } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NoteDetail'>;
type RouteType = RouteProp<RootStackParamList, 'NoteDetail'>;

const { width } = Dimensions.get('window');

export default function NoteDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const { user, refreshLocations } = useApp();
  const [note, setNote] = useState(route.params.note);
  const [replyText, setReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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
    return `${months}mo`;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: note.title,
        message: `${note.title}\n\n${note.content}\n\n📍 ${note.gridCode}\n\nvia PlaceMemory`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) return;
    const currentVote = note.votedBy[user.id];
    const newVoteType = currentVote === voteType ? 'none' : voteType;
    const updatedNote = await voteOnNote(note.gridCode, note.id, user.id, newVoteType as 'up' | 'down' | 'none');
    if (updatedNote) setNote(updatedNote);
  };

  const handleSubmitReply = async () => {
    if (!user || !replyText.trim()) return;
    
    await addReply(
      note.gridCode,
      note.id,
      replyingToId,
      replyText.trim(),
      user.name,
      user.id
    );
    
    // Refresh the note data
    const location = await getLocation(note.gridCode);
    if (location) {
      const updatedNote = location.notes.find(n => n.id === note.id);
      if (updatedNote) setNote(updatedNote);
    }
    
    setReplyText('');
    setReplyingToId(null);
    setShowReplyInput(false);
    Keyboard.dismiss();
    await refreshLocations();
  };

  const handleGiveAward = async (awardType: Award['type']) => {
    if (!user) return;
    const updatedNote = await giveAward(note.gridCode, note.id, awardType, user.id);
    if (updatedNote) setNote(updatedNote);
  };

  const toggleExpanded = (replyId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(replyId)) {
      newExpanded.delete(replyId);
    } else {
      newExpanded.add(replyId);
    }
    setExpandedReplies(newExpanded);
  };

  const startReply = (parentId: string | null = null) => {
    setReplyingToId(parentId);
    setShowReplyInput(true);
  };

  const score = note.upvotes - note.downvotes;
  const userVote = user ? note.votedBy[user.id] : undefined;

  const renderReply = (reply: Reply, depth: number = 0) => {
    const isExpanded = expandedReplies.has(reply.id);
    const hasReplies = reply.replies && reply.replies.length > 0;
    const replyScore = reply.upvotes - reply.downvotes;

    return (
      <View key={reply.id} style={styles.replyWrapper}>
        {/* Depth indicator - earthy colored lines */}
        {depth > 0 && (
          <View style={styles.depthIndicators}>
            {Array.from({ length: Math.min(depth, 4) }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.depthLine,
                  { backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.accent }
                ]} 
              />
            ))}
          </View>
        )}
        
        <View style={[styles.replyCard, depth > 0 && styles.replyCardNested]}>
          {/* Reply Header */}
          <View style={styles.replyHeader}>
            <View style={styles.replyAuthorContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.replyAvatar}
              >
                <Text style={styles.replyAvatarText}>
                  {reply.authorName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <Text style={styles.replyAuthor}>{reply.authorName}</Text>
              <Text style={styles.replyDot}>·</Text>
              <Text style={styles.replyTime}>{formatTimeAgo(reply.createdAt)}</Text>
            </View>
          </View>

          {/* Reply Content */}
          <Text style={styles.replyContent}>{reply.content}</Text>

          {/* Reply Actions */}
          <View style={styles.replyActions}>
            <TouchableOpacity style={styles.replyAction}>
              <Ionicons name="arrow-up-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.replyActionText}>{replyScore}</Text>
              <Ionicons name="arrow-down-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.replyAction}
              onPress={() => startReply(reply.id)}
            >
              <Ionicons name="return-down-forward-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.replyActionText}>Reply</Text>
            </TouchableOpacity>

            {hasReplies && (
              <TouchableOpacity 
                style={styles.replyAction}
                onPress={() => toggleExpanded(reply.id)}
              >
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={COLORS.primary} 
                />
                <Text style={[styles.replyActionText, { color: COLORS.primary }]}>
                  {reply.replies.length} {reply.replies.length === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Nested Replies */}
          {hasReplies && isExpanded && (
            <View style={styles.nestedReplies}>
              {reply.replies.map(r => renderReply(r, depth + 1))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('QRDisplay', { gridCode: note.gridCode })}
        >
          <Ionicons name="qr-code-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: showReplyInput ? 180 : insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location Badge */}
        <TouchableOpacity
          style={styles.locationBadge}
          onPress={() => navigation.navigate('ViewLocation', { gridCode: note.gridCode })}
        >
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.locationCode}>{note.gridCode}</Text>
        </TouchableOpacity>

        {/* Author */}
        <View style={styles.authorRow}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.authorAvatar}
          >
            <Text style={styles.authorAvatarText}>
              {note.authorName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View>
            <Text style={styles.authorName}>{note.authorName}</Text>
            <Text style={styles.postTime}>{formatTimeAgo(note.createdAt)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{note.title}</Text>

        {/* Awards */}
        {note.awards && note.awards.length > 0 && (
          <View style={styles.awardsRow}>
            {Object.entries(
              note.awards.reduce((acc, award) => {
                acc[award.type] = (acc[award.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <View key={type} style={styles.awardChip}>
                <Text>{AWARD_CONFIG[type as keyof typeof AWARD_CONFIG].icon}</Text>
                {count > 1 && <Text style={styles.awardCount}>{count}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Images */}
        {note.images && note.images.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
          >
            {note.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.image} />
            ))}
          </ScrollView>
        )}

        {/* Content */}
        <Text style={styles.content}>{note.content}</Text>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {note.tags.map((tag, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions Bar */}
        <View style={styles.actionsBar}>
          {/* Votes */}
          <View style={styles.voteContainer}>
            <TouchableOpacity onPress={() => handleVote('up')} style={styles.voteBtn}>
              <Ionicons
                name={userVote === 'up' ? 'arrow-up' : 'arrow-up-outline'}
                size={22}
                color={userVote === 'up' ? COLORS.success : COLORS.textMuted}
              />
            </TouchableOpacity>
            <Text style={[
              styles.voteCount,
              score > 0 && { color: COLORS.success },
              score < 0 && { color: COLORS.error },
            ]}>
              {score}
            </Text>
            <TouchableOpacity onPress={() => handleVote('down')} style={styles.voteBtn}>
              <Ionicons
                name={userVote === 'down' ? 'arrow-down' : 'arrow-down-outline'}
                size={22}
                color={userVote === 'down' ? COLORS.error : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => startReply(null)}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.actionBtnText}>{note.replyCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleGiveAward('helpful')}
          >
            <Ionicons name="gift-outline" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Replies Section */}
        <View style={styles.repliesSection}>
          <View style={styles.repliesHeader}>
            <Text style={styles.repliesTitle}>
              {note.replyCount || 0} {(note.replyCount || 0) === 1 ? 'Reply' : 'Replies'}
            </Text>
            <TouchableOpacity 
              style={styles.addReplyBtn}
              onPress={() => startReply(null)}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addReplyBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Reply Input */}
          {showReplyInput && (
            <View style={styles.inlineReplyContainer}>
              {replyingToId && (
                <View style={styles.replyingToBar}>
                  <Text style={styles.replyingToText}>Replying to comment</Text>
                  <TouchableOpacity onPress={() => { setReplyingToId(null); setShowReplyInput(false); }}>
                    <Ionicons name="close" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.replyInputRow}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.replyInputAvatar}
                >
                  <Text style={styles.replyInputAvatarText}>
                    {user?.name.charAt(0).toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={COLORS.textMuted}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  maxLength={500}
                />
              </View>
              <View style={styles.replyInputActions}>
                <TouchableOpacity 
                  style={styles.cancelReplyBtn}
                  onPress={() => { setReplyText(''); setShowReplyInput(false); setReplyingToId(null); }}
                >
                  <Text style={styles.cancelReplyText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitReplyBtn, !replyText.trim() && styles.submitReplyBtnDisabled]}
                  onPress={handleSubmitReply}
                  disabled={!replyText.trim()}
                >
                  <Text style={styles.submitReplyText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Replies List */}
          {note.replies && note.replies.length > 0 ? (
            note.replies.map(reply => renderReply(reply, 0))
          ) : (
            <View style={styles.noReplies}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.noRepliesText}>No replies yet</Text>
              <Text style={styles.noRepliesSubtext}>Be the first to share your thoughts</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    borderRadius: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  locationCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  authorAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 30,
    marginBottom: SPACING.sm,
  },
  awardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  awardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  awardCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 4,
  },
  imageScroll: {
    marginHorizontal: -SPACING.lg,
    marginBottom: SPACING.md,
  },
  image: {
    width: width - SPACING.lg * 2,
    height: 200,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  content: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: SPACING.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  tagChip: {
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: SPACING.lg,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.06)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 4,
  },
  voteBtn: {
    padding: 8,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    minWidth: 28,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: SPACING.lg,
  },
  repliesSection: {},
  repliesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  addReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  addReplyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inlineReplyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(45, 71, 57, 0.15)',
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  replyingToText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  replyInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  replyInputAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  replyInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelReplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelReplyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  submitReplyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
  },
  submitReplyBtnDisabled: {
    opacity: 0.5,
  },
  submitReplyText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  noReplies: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  noRepliesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  noRepliesSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  replyWrapper: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  depthIndicators: {
    flexDirection: 'row',
    marginRight: SPACING.sm,
  },
  depthLine: {
    width: 3,
    borderRadius: 2,
    marginRight: 4,
  },
  replyCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  replyCardNested: {
    backgroundColor: 'rgba(250, 247, 242, 0.8)',
    borderLeftColor: COLORS.accent,
  },
  replyHeader: {
    marginBottom: SPACING.sm,
  },
  replyAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  replyAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  replyDot: {
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  replyTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyContent: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  nestedReplies: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
});
