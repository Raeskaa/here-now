export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface Award {
  id: string;
  type: 'gold' | 'silver' | 'helpful' | 'local_legend' | 'historian' | 'storyteller';
  givenBy: string;
  givenAt: number;
}

export interface Reply {
  id: string;
  parentId: string | null;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  votedBy: Record<string, 'up' | 'down'>;
  replies: Reply[];
}

// Story type - regular story, time capsule, or story seed (prompt)
export type StoryType = 'story' | 'timecapsule' | 'seed';

export interface PlaceNote {
  id: string;
  gridCode: string;
  coordinate: GeoCoordinate;
  title: string;
  content: string;
  images: string[];
  authorName: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  
  // Story type & special features
  storyType: StoryType;
  
  // Whisper Radius - story only visible within this distance (meters)
  // null = visible everywhere, number = only visible within X meters
  whisperRadius: number | null;
  
  // Time Capsule - story locked until this timestamp
  // null = not a time capsule, number = unlock timestamp
  unlockAt: number | null;
  
  // Story Seed - prompt for others to respond to
  // If this is a seed, responses are stored as replies
  seedPrompt?: string;
  
  // Engagement
  upvotes: number;
  downvotes: number;
  votedBy: Record<string, 'up' | 'down'>;
  awards: Award[];
  replies: Reply[];
  replyCount: number;
}

export interface GridLocation {
  code: string;
  coordinate: GeoCoordinate;
  notes: PlaceNote[];
  firstNoteAt: number;
  qrGenerated: boolean;
  noteCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  notesCount: number;
  joinedAt: number;
  karma: number;
  awardsGiven: number;
  awardsReceived: number;
  // Track time capsules created
  capsulesCreated: number;
  capsulesOpened: number;
  // Track seeds planted
  seedsPlanted: number;
}

export interface NearbyLocation {
  gridLocation: GridLocation;
  distance: number;
}

export type SortOption = 'hot' | 'new' | 'top' | 'nearby';

export type RootStackParamList = {
  Main: undefined;
  AddNote: { coordinate: GeoCoordinate; gridCode: string };
  ViewLocation: { gridCode: string };
  NoteDetail: { note: PlaceNote };
  Scanner: undefined;
  QRDisplay: { gridCode: string };
};

export type MainTabParamList = {
  Map: undefined;
  Nearby: undefined;
  Profile: undefined;
};

// Award config without emojis - using icon names instead
export const AWARD_CONFIG = {
  gold: { name: 'Gold', icon: 'trophy', color: '#D4A574', cost: 500 },
  silver: { name: 'Silver', icon: 'medal', color: '#9B9B9B', cost: 100 },
  helpful: { name: 'Helpful', icon: 'bulb', color: '#D4A574', cost: 50 },
  local_legend: { name: 'Local Legend', icon: 'star', color: '#B8865C', cost: 200 },
  historian: { name: 'Historian', icon: 'book', color: '#8B7355', cost: 150 },
  storyteller: { name: 'Storyteller', icon: 'sparkles', color: '#4A7C59', cost: 100 },
} as const;

// Whisper radius options in meters
export const WHISPER_OPTIONS = [
  { value: null, label: 'Everywhere', description: 'Visible from any distance' },
  { value: 50, label: '50m', description: 'Very close - must be at the spot' },
  { value: 200, label: '200m', description: 'Nearby - a short walk away' },
  { value: 500, label: '500m', description: 'In the area' },
] as const;

// Time capsule duration options
export const CAPSULE_DURATIONS = [
  { value: 1, label: '1 day', unit: 'day' },
  { value: 7, label: '1 week', unit: 'week' },
  { value: 30, label: '1 month', unit: 'month' },
  { value: 365, label: '1 year', unit: 'year' },
  { value: 1825, label: '5 years', unit: 'years' },
] as const;
