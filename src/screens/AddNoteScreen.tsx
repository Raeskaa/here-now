import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList, StoryType, WHISPER_OPTIONS, CAPSULE_DURATIONS } from '../types';
import { saveNote, getUserProfile } from '../utils/storage';
import { useApp } from '../context/AppContext';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddNote'>;
type RouteType = RouteProp<RootStackParamList, 'AddNote'>;

export default function AddNoteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { refreshLocations, refreshUser } = useApp();
  const { coordinate, gridCode } = route.params;

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Special features
  const [storyType, setStoryType] = useState<StoryType>('story');
  const [whisperRadius, setWhisperRadius] = useState<number | null>(null);
  const [capsuleDays, setCapsuleDays] = useState<number>(7);
  const [showCapsulePicker, setShowCapsulePicker] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages([...images, base64Image]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImages([...images, base64Image]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const getUnlockTimestamp = (): number | null => {
    if (storyType !== 'timecapsule') return null;
    return Date.now() + capsuleDays * 24 * 60 * 60 * 1000;
  };

  const handleSave = async () => {
    if (storyType === 'seed') {
      if (!seedPrompt.trim()) {
        Alert.alert('Prompt required', 'Please add a prompt for others to respond to.');
        return;
      }
    } else {
      if (!title.trim()) {
        Alert.alert('Title required', 'Please add a title for your story.');
        return;
      }
      if (!content.trim()) {
        Alert.alert('Story required', 'Please share your story about this place.');
        return;
      }
    }

    setIsSaving(true);

    try {
      const user = await getUserProfile();
      const tagArray = tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      await saveNote(coordinate, {
        title: storyType === 'seed' ? seedPrompt.trim() : title.trim(),
        content: storyType === 'seed' ? '' : content.trim(),
        images,
        authorName: user.name,
        authorId: user.id,
        tags: tagArray,
        storyType,
        whisperRadius,
        unlockAt: getUnlockTimestamp(),
        seedPrompt: storyType === 'seed' ? seedPrompt.trim() : undefined,
      });

      await refreshLocations();
      await refreshUser();

      const successMessages = {
        story: {
          title: 'Story Saved',
          message: 'Your story has been added to this location.',
        },
        timecapsule: {
          title: 'Time Capsule Buried',
          message: `Your capsule will unlock in ${capsuleDays} days. Others can see it exists, but can't read it yet.`,
        },
        seed: {
          title: 'Seed Planted',
          message: 'Your prompt is now waiting for others to respond with their stories.',
        },
      };

      const msg = successMessages[storyType];

      Alert.alert(msg.title, msg.message, [
        {
          text: 'View QR Code',
          onPress: () => navigation.replace('QRDisplay', { gridCode }),
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStoryTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.label}>What are you creating?</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeOption, storyType === 'story' && styles.typeOptionActive]}
          onPress={() => setStoryType('story')}
        >
          <Ionicons 
            name="book-outline" 
            size={20} 
            color={storyType === 'story' ? COLORS.textLight : COLORS.primary} 
          />
          <Text style={[styles.typeOptionText, storyType === 'story' && styles.typeOptionTextActive]}>
            Story
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeOption, storyType === 'timecapsule' && styles.typeOptionActive]}
          onPress={() => setStoryType('timecapsule')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={storyType === 'timecapsule' ? COLORS.textLight : COLORS.capsule} 
          />
          <Text style={[styles.typeOptionText, storyType === 'timecapsule' && styles.typeOptionTextActive]}>
            Capsule
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeOption, storyType === 'seed' && styles.typeOptionActive]}
          onPress={() => setStoryType('seed')}
        >
          <Ionicons 
            name="leaf-outline" 
            size={20} 
            color={storyType === 'seed' ? COLORS.textLight : COLORS.seed} 
          />
          <Text style={[styles.typeOptionText, storyType === 'seed' && styles.typeOptionTextActive]}>
            Seed
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWhisperRadius = () => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Ionicons name="eye-off-outline" size={16} color={COLORS.whisper} />
        <Text style={[styles.label, { marginLeft: 6, marginBottom: 0 }]}>Whisper Radius</Text>
      </View>
      <Text style={styles.sublabel}>
        Only visible when someone is close enough
      </Text>
      <View style={styles.whisperOptions}>
        {WHISPER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.whisperOption,
              whisperRadius === option.value && styles.whisperOptionActive,
            ]}
            onPress={() => setWhisperRadius(option.value)}
          >
            <Text style={[
              styles.whisperOptionText,
              whisperRadius === option.value && styles.whisperOptionTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCapsuleOptions = () => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Ionicons name="hourglass-outline" size={16} color={COLORS.capsule} />
        <Text style={[styles.label, { marginLeft: 6, marginBottom: 0 }]}>Unlock After</Text>
      </View>
      <Text style={styles.sublabel}>
        Story will be locked until this time passes
      </Text>
      <View style={styles.capsuleOptions}>
        {CAPSULE_DURATIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.capsuleOption,
              capsuleDays === option.value && styles.capsuleOptionActive,
            ]}
            onPress={() => setCapsuleDays(option.value)}
          >
            <Text style={[
              styles.capsuleOptionText,
              capsuleDays === option.value && styles.capsuleOptionTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSeedPrompt = () => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Ionicons name="help-circle-outline" size={16} color={COLORS.seed} />
        <Text style={[styles.label, { marginLeft: 6, marginBottom: 0 }]}>Your Prompt</Text>
      </View>
      <Text style={styles.sublabel}>
        Ask a question for others to answer with their stories
      </Text>
      <TextInput
        style={styles.seedInput}
        placeholder="What's your earliest memory of this street?"
        placeholderTextColor={COLORS.textMuted}
        value={seedPrompt}
        onChangeText={setSeedPrompt}
        maxLength={150}
        multiline
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {storyType === 'story' ? 'Share a Story' : 
             storyType === 'timecapsule' ? 'Bury a Capsule' : 
             'Plant a Seed'}
          </Text>
          <View style={styles.headerCodeBadge}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerCode}>{gridCode}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {renderStoryTypeSelector()}

          {storyType === 'seed' ? (
            renderSeedPrompt()
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="What's this place's story?"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Story</Text>
                <TextInput
                  style={styles.contentInput}
                  placeholder="Share memories, history, or anything special about this place..."
                  placeholderTextColor={COLORS.textMuted}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Photos</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageScroll}
                >
                  {images.map((img, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri: img }} style={styles.image} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close" size={14} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length < 4 && (
                    <View style={styles.addImageButtons}>
                      <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                        <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.addImageText}>Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.addImageText}>Camera</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            </>
          )}

          {/* Whisper Radius - available for all types */}
          {renderWhisperRadius()}

          {/* Time Capsule options */}
          {storyType === 'timecapsule' && renderCapsuleOptions()}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.tagsInput}
              placeholder="history, food, memory (comma separated)"
              placeholderTextColor={COLORS.textMuted}
              value={tags}
              onChangeText={setTags}
            />
          </View>

          {/* Info box */}
          <View style={[
            styles.infoBox,
            storyType === 'timecapsule' && styles.infoBoxCapsule,
            storyType === 'seed' && styles.infoBoxSeed,
          ]}>
            <Ionicons 
              name={storyType === 'story' ? 'information-circle-outline' : 
                    storyType === 'timecapsule' ? 'time-outline' : 'leaf-outline'} 
              size={20} 
              color={storyType === 'story' ? COLORS.primary : 
                     storyType === 'timecapsule' ? COLORS.capsule : COLORS.seed} 
            />
            <Text style={styles.infoText}>
              {storyType === 'story' && 'Your story will be visible to anyone who discovers this location.'}
              {storyType === 'timecapsule' && `Others will see a locked capsule here. It opens in ${capsuleDays} days.`}
              {storyType === 'seed' && 'Your prompt will invite others to share their stories about this place.'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              storyType === 'timecapsule' ? [COLORS.capsule, '#8B7355'] :
              storyType === 'seed' ? [COLORS.seed, COLORS.primaryLight] :
              [COLORS.primary, COLORS.primaryLight]
            }
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <Ionicons 
                  name={storyType === 'story' ? 'create-outline' : 
                        storyType === 'timecapsule' ? 'lock-closed-outline' : 'leaf-outline'} 
                  size={20} 
                  color={COLORS.textLight} 
                />
                <Text style={styles.saveButtonText}>
                  {storyType === 'story' ? 'Save Story' : 
                   storyType === 'timecapsule' ? 'Bury Capsule' : 'Plant Seed'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  headerCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  headerCode: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  typeSelectorContainer: {
    marginBottom: SPACING.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    gap: 6,
    ...SHADOWS.small,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: COLORS.textLight,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  titleInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  contentInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 140,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  seedInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  whisperOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  whisperOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  whisperOptionActive: {
    backgroundColor: COLORS.whisper,
  },
  whisperOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  whisperOptionTextActive: {
    color: COLORS.textLight,
  },
  capsuleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  capsuleOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  capsuleOptionActive: {
    backgroundColor: COLORS.capsule,
  },
  capsuleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  capsuleOptionTextActive: {
    color: COLORS.textLight,
  },
  imageScroll: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  imageContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  image: {
    width: 110,
    height: 85,
    borderRadius: BORDER_RADIUS.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addImageButton: {
    width: 85,
    height: 85,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.04)',
  },
  addImageText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  tagsInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(45, 71, 57, 0.06)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  infoBoxCapsule: {
    backgroundColor: 'rgba(107, 91, 79, 0.08)',
  },
  infoBoxSeed: {
    backgroundColor: 'rgba(92, 122, 90, 0.08)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
