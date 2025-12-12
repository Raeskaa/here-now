import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { saveUserProfile, clearAllData, addDemoData } from '../utils/storage';

const { width } = Dimensions.get('window');

// Achievement definitions
const ACHIEVEMENTS = [
  {
    id: 'first_story',
    title: 'First Step',
    description: 'Share your first story',
    icon: '🎯',
    requirement: (stats: any) => stats.storiesShared >= 1,
  },
  {
    id: 'storyteller',
    title: 'Storyteller',
    description: 'Share 5 stories',
    icon: '📖',
    requirement: (stats: any) => stats.storiesShared >= 5,
  },
  {
    id: 'historian',
    title: 'Historian',
    description: 'Share 20 stories',
    icon: '📜',
    requirement: (stats: any) => stats.storiesShared >= 20,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Visit 10 locations',
    icon: '🧭',
    requirement: (stats: any) => stats.locationsVisited >= 10,
  },
  {
    id: 'cartographer',
    title: 'Cartographer',
    description: 'Create 5 new QRs',
    icon: '🗺️',
    requirement: (stats: any) => stats.qrCodesGenerated >= 5,
  },
  {
    id: 'popular',
    title: 'Popular',
    description: 'Get 50 upvotes',
    icon: '⭐',
    requirement: (stats: any) => stats.totalUpvotes >= 50,
  },
  {
    id: 'influencer',
    title: 'Influencer',
    description: 'Get 200 upvotes',
    icon: '🌟',
    requirement: (stats: any) => stats.totalUpvotes >= 200,
  },
  {
    id: 'generous',
    title: 'Generous',
    description: 'Give 10 awards',
    icon: '🎁',
    requirement: (stats: any) => stats.awardsGiven >= 10,
  },
  {
    id: 'beloved',
    title: 'Beloved',
    description: 'Receive 5 awards',
    icon: '🏆',
    requirement: (stats: any) => stats.awardsReceived >= 5,
  },
  {
    id: 'conversationalist',
    title: 'Conversationalist',
    description: 'Leave 25 replies',
    icon: '💬',
    requirement: (stats: any) => stats.repliesGiven >= 25,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'First at 3 locations',
    icon: '🐦',
    requirement: (stats: any) => stats.firstPosts >= 3,
  },
  {
    id: 'veteran',
    title: 'Veteran',
    description: 'Use app for 30 days',
    icon: '🎖️',
    requirement: (stats: any) => stats.daysActive >= 30,
  },
];

// Level thresholds
const LEVELS = [
  { level: 1, title: 'Newcomer', minKarma: 0, color: '#8B7355' },
  { level: 2, title: 'Explorer', minKarma: 50, color: '#6B8E4E' },
  { level: 3, title: 'Contributor', minKarma: 150, color: '#4A7C59' },
  { level: 4, title: 'Storyteller', minKarma: 350, color: '#3D6B4F' },
  { level: 5, title: 'Historian', minKarma: 700, color: '#2D4739' },
  { level: 6, title: 'Legend', minKarma: 1500, color: '#B8865C' },
  { level: 7, title: 'Icon', minKarma: 3000, color: '#D4A574' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, refreshLocations, userLocation, locations } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [activeTab, setActiveTab] = useState<'journey' | 'badges'>('journey');

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const allNotes = Object.values(locations).flatMap(loc => loc.notes);
    const myNotes = allNotes.filter(note => note.authorId === user?.id);
    
    const totalUpvotes = myNotes.reduce((sum, note) => sum + (note.upvotes || 0), 0);
    const totalDownvotes = myNotes.reduce((sum, note) => sum + (note.downvotes || 0), 0);
    const totalReplies = myNotes.reduce((sum, note) => sum + (note.replyCount || 0), 0);
    const awardsReceived = myNotes.reduce((sum, note) => sum + (note.awards?.length || 0), 0);
    
    const firstPosts = Object.values(locations).filter(loc => 
      loc.notes[0]?.authorId === user?.id
    ).length;

    const daysActive = user ? Math.floor((Date.now() - user.joinedAt) / (24 * 60 * 60 * 1000)) : 0;

    return {
      storiesShared: user?.notesCount || 0,
      locationsVisited: Object.keys(locations).length,
      qrCodesGenerated: firstPosts,
      totalUpvotes,
      totalDownvotes,
      karma: totalUpvotes - totalDownvotes,
      totalReplies,
      awardsGiven: user?.awardsGiven || 0,
      awardsReceived,
      firstPosts,
      repliesGiven: 0,
      daysActive,
    };
  }, [locations, user]);

  // Calculate level
  const currentLevel = useMemo(() => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (stats.karma >= LEVELS[i].minKarma) {
        return LEVELS[i];
      }
    }
    return LEVELS[0];
  }, [stats.karma]);

  const nextLevel = useMemo(() => {
    const idx = LEVELS.findIndex(l => l.level === currentLevel.level);
    return LEVELS[idx + 1] || null;
  }, [currentLevel]);

  const progressToNextLevel = useMemo(() => {
    if (!nextLevel) return 1;
    const range = nextLevel.minKarma - currentLevel.minKarma;
    const progress = stats.karma - currentLevel.minKarma;
    return Math.min(progress / range, 1);
  }, [stats.karma, currentLevel, nextLevel]);

  // Unlocked achievements
  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(a => a.requirement(stats));
  }, [stats]);

  const lockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(a => !a.requirement(stats));
  }, [stats]);

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    Keyboard.dismiss();
    await saveUserProfile({ ...user, name: editName.trim() });
    await refreshUser();
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setIsEditing(false);
    setEditName(user?.name || '');
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all stories and reset your profile. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await refreshUser();
            await refreshLocations();
            Alert.alert('Done', 'All data has been reset.');
          },
        },
      ]
    );
  };

  const handleAddDemoData = async () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Enable location services to add demo data near you.');
      return;
    }
    await addDemoData(userLocation);
    await refreshLocations();
    Alert.alert('Done', 'Demo stories have been added near your location!');
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with earthy gradient */}
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            {/* Decorative pattern */}
            <View style={styles.headerPattern}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[styles.patternLine, { opacity: 0.03 + i * 0.01 }]} />
              ))}
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarRing, { borderColor: currentLevel.color }]}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {user?.name.charAt(0).toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              </View>
              <View style={[styles.levelIndicator, { backgroundColor: currentLevel.color }]}>
                <Text style={styles.levelIndicatorText}>{currentLevel.level}</Text>
              </View>
            </View>

            {/* Name */}
            {isEditing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.nameRow}>
                <Text style={styles.userName}>{user?.name || 'Anonymous'}</Text>
                <View style={styles.editIcon}>
                  <Ionicons name="pencil" size={12} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            )}

            {/* Level Title */}
            <View style={styles.levelBadge}>
              <Text style={[styles.levelTitle, { color: currentLevel.color }]}>
                {currentLevel.title}
              </Text>
            </View>

            {/* Progress to next level */}
            {nextLevel && (
              <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={[currentLevel.color, COLORS.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${progressToNextLevel * 100}%` }]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {stats.karma} / {nextLevel.minKarma} karma to {nextLevel.title}
                </Text>
              </View>
            )}

            <Text style={styles.joinedText}>
              Exploring since {user ? formatDate(user.joinedAt) : 'today'}
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(45, 71, 57, 0.1)' }]}>
                <Ionicons name="document-text" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stats.storiesShared}</Text>
              <Text style={styles.statLabel}>Stories</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(212, 165, 116, 0.15)' }]}>
                <Ionicons name="location" size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.statValue}>{stats.locationsVisited}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <Ionicons name="arrow-up" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{stats.totalUpvotes}</Text>
              <Text style={styles.statLabel}>Upvotes</Text>
            </View>
          </View>

          {/* Karma Highlight */}
          <View style={styles.karmaCard}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.karmaGradient}
            >
              <View style={styles.karmaContent}>
                <View>
                  <Text style={styles.karmaLabel}>Total Karma</Text>
                  <Text style={styles.karmaValue}>{stats.karma}</Text>
                </View>
                <View style={styles.karmaDivider} />
                <View>
                  <Text style={styles.karmaLabel}>Badges Earned</Text>
                  <Text style={styles.karmaValue}>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'journey' && styles.tabBtnActive]}
              onPress={() => setActiveTab('journey')}
            >
              <Ionicons 
                name="compass-outline" 
                size={18} 
                color={activeTab === 'journey' ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.tabBtnText, activeTab === 'journey' && styles.tabBtnTextActive]}>
                Journey
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'badges' && styles.tabBtnActive]}
              onPress={() => setActiveTab('badges')}
            >
              <Ionicons 
                name="ribbon-outline" 
                size={18} 
                color={activeTab === 'badges' ? COLORS.primary : COLORS.textMuted} 
              />
              <Text style={[styles.tabBtnText, activeTab === 'badges' && styles.tabBtnTextActive]}>
                Badges
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'journey' && (
            <View style={styles.tabContent}>
              {/* Detailed Stats Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="chatbubbles-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.totalReplies}</Text>
                  <Text style={styles.detailLabel}>Replies</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="gift-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.awardsGiven}</Text>
                  <Text style={styles.detailLabel}>Given</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="trophy-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.awardsReceived}</Text>
                  <Text style={styles.detailLabel}>Received</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="flag-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.firstPosts}</Text>
                  <Text style={styles.detailLabel}>Firsts</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.daysActive}</Text>
                  <Text style={styles.detailLabel}>Days</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="qr-code-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.detailValue}>{stats.qrCodesGenerated}</Text>
                  <Text style={styles.detailLabel}>QR Codes</Text>
                </View>
              </View>

              {/* About Card */}
              <View style={styles.aboutCard}>
                <View style={styles.aboutHeader}>
                  <Ionicons name="leaf" size={20} color={COLORS.primary} />
                  <Text style={styles.aboutTitle}>About PlaceMemory</Text>
                </View>
                <Text style={styles.aboutText}>
                  A digital archive of physical spaces. Share stories, discover history, 
                  and help build a collective memory of the world around us.
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={styles.tabContent}>
              {/* Unlocked Badges */}
              {unlockedAchievements.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    Earned ({unlockedAchievements.length})
                  </Text>
                  <View style={styles.badgesGrid}>
                    {unlockedAchievements.map(achievement => (
                      <View key={achievement.id} style={styles.badgeCard}>
                        <View style={styles.badgeIconBg}>
                          <Text style={styles.badgeIcon}>{achievement.icon}</Text>
                        </View>
                        <Text style={styles.badgeTitle}>{achievement.title}</Text>
                        <Text style={styles.badgeDesc}>{achievement.description}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Locked Badges */}
              {lockedAchievements.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
                    Locked ({lockedAchievements.length})
                  </Text>
                  <View style={styles.badgesGrid}>
                    {lockedAchievements.map(achievement => (
                      <View key={achievement.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                        <View style={[styles.badgeIconBg, styles.badgeIconBgLocked]}>
                          <Text style={[styles.badgeIcon, { opacity: 0.4 }]}>🔒</Text>
                        </View>
                        <Text style={[styles.badgeTitle, { color: COLORS.textMuted }]}>
                          {achievement.title}
                        </Text>
                        <Text style={styles.badgeDesc}>{achievement.description}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Developer Options */}
          <View style={styles.devSection}>
            <Text style={styles.sectionLabel}>Developer Options</Text>
            <TouchableOpacity style={styles.devButton} onPress={handleAddDemoData}>
              <View style={styles.devButtonIcon}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.devButtonContent}>
                <Text style={styles.devButtonTitle}>Add Demo Stories</Text>
                <Text style={styles.devButtonSubtitle}>Populate nearby locations</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devButton, styles.devButtonDanger]} onPress={handleResetData}>
              <View style={[styles.devButtonIcon, styles.devButtonIconDanger]}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </View>
              <View style={styles.devButtonContent}>
                <Text style={[styles.devButtonTitle, { color: COLORS.error }]}>Reset All Data</Text>
                <Text style={styles.devButtonSubtitle}>Clear everything</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerVersion}>PlaceMemory v1.0</Text>
            <Text style={styles.footerTagline}>Every place has a story</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  patternLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 60,
    borderWidth: 3,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  levelIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  levelIndicatorText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  editIcon: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNameContainer: {
    width: '80%',
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
    minWidth: 180,
    minHeight: 44,
  },
  editButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  levelBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(45, 71, 57, 0.06)',
    borderRadius: BORDER_RADIUS.full,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressSection: {
    width: '80%',
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(45, 71, 57, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  joinedText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  karmaCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  karmaGradient: {
    padding: SPACING.lg,
  },
  karmaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  karmaDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  karmaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    textAlign: 'center',
  },
  karmaValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    backgroundColor: 'rgba(45, 71, 57, 0.06)',
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: COLORS.card,
    ...SHADOWS.small,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  detailItem: {
    width: (width - SPACING.lg * 2 - SPACING.sm * 2) / 3,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.small,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 8,
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm * 2) / 3,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  badgeCardLocked: {
    backgroundColor: 'rgba(250, 247, 242, 0.8)',
  },
  badgeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeIconBgLocked: {
    backgroundColor: 'rgba(155, 155, 155, 0.1)',
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  devSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  devButtonDanger: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
  },
  devButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devButtonIconDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  devButtonContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  devButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  devButtonSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginTop: SPACING.lg,
  },
  footerVersion: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  footerTagline: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
