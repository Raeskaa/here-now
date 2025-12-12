import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList } from '../types';
import { saveNote, getUserProfile } from '../utils/storage';
import { useApp } from '../context/AppContext';

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddNote'>;
type RouteType = RouteProp<RootStackParamList, 'AddNote'>;

export default function AddNoteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { refreshLocations, refreshUser } = useApp();
  const { coordinate, gridCode } = route.params;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please add a title for your story.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Story required', 'Please share your story about this place.');
      return;
    }

    setIsSaving(true);

    try {
      const user = await getUserProfile();
      const tagArray = tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      await saveNote(coordinate, {
        title: title.trim(),
        content: content.trim(),
        images,
        authorName: user.name,
        authorId: user.id,
        tags: tagArray,
      });

      await refreshLocations();
      await refreshUser();

      Alert.alert(
        'Story Saved! 📍',
        'Your story has been added to this location. A QR code has been generated for this place.',
        [
          {
            text: 'View QR Code',
            onPress: () => {
              navigation.replace('QRDisplay', { gridCode });
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save your story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Share Your Story</Text>
          <Text style={styles.headerCode}>{gridCode}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={styles.label}>Photos (optional)</Text>
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
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 4 && (
              <View style={styles.addImageButtons}>
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                  <Text style={styles.addImageIcon}>🖼</Text>
                  <Text style={styles.addImageText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                  <Text style={styles.addImageIcon}>📷</Text>
                  <Text style={styles.addImageText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags (optional)</Text>
          <TextInput
            style={styles.tagsInput}
            placeholder="history, food, memory, art (comma separated)"
            placeholderTextColor={COLORS.textMuted}
            value={tags}
            onChangeText={setTags}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Your story will be visible to anyone who scans the QR code or discovers this location on the map.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.saveButtonGradient}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.saveButtonText}>Save Story</Text>
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
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  headerContent: {},
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  headerCode: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    ...SHADOWS.small,
  },
  contentInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 150,
    lineHeight: 24,
    ...SHADOWS.small,
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
    width: 120,
    height: 90,
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
  removeImageText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  addImageButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addImageButton: {
    width: 80,
    height: 90,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 71, 57, 0.05)',
  },
  addImageIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  addImageText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  tagsInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    ...SHADOWS.small,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(45, 71, 57, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  saveButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});

