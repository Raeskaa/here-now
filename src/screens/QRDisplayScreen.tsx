import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { gridCodeToCoordinate } from '../utils/GeoGrid';

type NavigationProp = StackNavigationProp<RootStackParamList, 'QRDisplay'>;
type RouteType = RouteProp<RootStackParamList, 'QRDisplay'>;

const { width } = Dimensions.get('window');
const QR_SIZE = width - 100;

export default function QRDisplayScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { locations } = useApp();
  const { gridCode } = route.params;
  const qrRef = useRef<any>(null);

  const location = locations[gridCode];
  const coordinate = gridCodeToCoordinate(gridCode);

  // The QR code contains a deep link that can open the app directly to this location
  const qrValue = JSON.stringify({
    type: 'PlaceMemory',
    version: 1,
    gridCode,
    coordinate,
  });

  const handleShare = async () => {
    try {
      const noteCount = location?.noteCount || 0;
      await Share.share({
        title: `PlaceMemory: ${gridCode}`,
        message: `📍 Discover stories at this location!\n\nGrid Code: ${gridCode}\nStories: ${noteCount}\n\nScan the QR code with PlaceMemory app or visit the location to read stories from this place.\n\n#PlaceMemory`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.background}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Location QR Code</Text>
          <Text style={styles.subtitle}>
            Scan this code to discover all stories at this place
          </Text>

          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrValue}
                size={QR_SIZE}
                color={COLORS.primary}
                backgroundColor={COLORS.card}
                logo={undefined}
                logoSize={50}
                logoMargin={5}
                logoBorderRadius={10}
                getRef={(ref: any) => (qrRef.current = ref)}
              />
            </View>
            <View style={styles.qrCodeBadge}>
              <Text style={styles.qrCodeText}>{gridCode}</Text>
            </View>
          </View>

          {location && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{location.noteCount}</Text>
                <Text style={styles.statLabel}>
                  {location.noteCount === 1 ? 'Story' : 'Stories'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {new Date(location.firstNoteAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.statLabel}>Since</Text>
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Print or display this QR code at the physical location. Anyone who scans it can read and contribute stories about this place.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share QR Code</Text>
          </TouchableOpacity>

          {location && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('ViewLocation', { gridCode });
              }}
            >
              <Text style={styles.viewButtonText}>View Stories →</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.lg,
    marginBottom: SPACING.md,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  qrWrapper: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.large,
  },
  qrCodeBadge: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  qrCodeText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.textLight,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  shareButton: {
    backgroundColor: COLORS.textLight,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  viewButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

