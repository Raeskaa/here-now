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
  parentId: string | null; // null for top-level replies, noteId for replies to note
  content: string;
  authorName: string;
  authorId: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  votedBy: Record<string, 'up' | 'down'>; // { odId: 'up' | 'down' }
  replies: Reply[]; // nested replies
}

export interface PlaceNote {
  id: string;
  gridCode: string;
  coordinate: GeoCoordinate;
  title: string;
  content: string;
  images: string[]; // Base64 or URIs
  authorName: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  // Reddit-like features
  upvotes: number;
  downvotes: number;
  votedBy: Record<string, 'up' | 'down'>; // { odId: 'up' | 'down' }
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
  karma: number; // Total karma from upvotes
  awardsGiven: number;
  awardsReceived: number;
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

export const AWARD_CONFIG = {
  gold: { name: 'Gold', icon: '🏆', color: '#FFD700', cost: 500 },
  silver: { name: 'Silver', icon: '🥈', color: '#C0C0C0', cost: 100 },
  helpful: { name: 'Helpful', icon: '💡', color: '#FFB347', cost: 50 },
  local_legend: { name: 'Local Legend', icon: '🌟', color: '#FF6B6B', cost: 200 },
  historian: { name: 'Historian', icon: '📜', color: '#8B4513', cost: 150 },
  storyteller: { name: 'Storyteller', icon: '✨', color: '#9B59B6', cost: 100 },
} as const;
