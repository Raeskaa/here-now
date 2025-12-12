import AsyncStorage from '@react-native-async-storage/async-storage';
import { GridLocation, PlaceNote, UserProfile, Reply, Award, SortOption, StoryType } from '../types';
import { coordinateToGridCode, GeoCoordinate, getDistance } from './GeoGrid';

const STORAGE_KEYS = {
  LOCATIONS: 'place_memory_locations',
  USER: 'place_memory_user',
  NOTES: 'place_memory_notes',
};

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create user profile
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (data) {
      const user = JSON.parse(data);
      // Ensure new fields exist
      return {
        karma: 0,
        awardsGiven: 0,
        awardsReceived: 0,
        capsulesCreated: 0,
        capsulesOpened: 0,
        seedsPlanted: 0,
        ...user,
      };
    }
  } catch (error) {
    console.error('Error reading user profile:', error);
  }
  
  // Create default user
  const newUser: UserProfile = {
    id: generateId(),
    name: 'Anonymous Explorer',
    notesCount: 0,
    joinedAt: Date.now(),
    karma: 0,
    awardsGiven: 0,
    awardsReceived: 0,
    capsulesCreated: 0,
    capsulesOpened: 0,
    seedsPlanted: 0,
  };
  
  await saveUserProfile(newUser);
  return newUser;
}

export async function saveUserProfile(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

// Get all locations
export async function getAllLocations(): Promise<Record<string, GridLocation>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading locations:', error);
  }
  return {};
}

// Get location by grid code
export async function getLocation(gridCode: string): Promise<GridLocation | null> {
  const locations = await getAllLocations();
  return locations[gridCode] || null;
}

// Create default note fields
function createDefaultNoteFields(): Pick<PlaceNote, 'upvotes' | 'downvotes' | 'votedBy' | 'awards' | 'replies' | 'replyCount' | 'storyType' | 'whisperRadius' | 'unlockAt'> {
  return {
    upvotes: 0,
    downvotes: 0,
    votedBy: {},
    awards: [],
    replies: [],
    replyCount: 0,
    storyType: 'story',
    whisperRadius: null,
    unlockAt: null,
  };
}

// Save a new note to a location
export async function saveNote(
  coordinate: GeoCoordinate,
  noteData: Omit<PlaceNote, 'id' | 'gridCode' | 'coordinate' | 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes' | 'votedBy' | 'awards' | 'replies' | 'replyCount'>
): Promise<{ note: PlaceNote; gridLocation: GridLocation }> {
  const gridCode = coordinateToGridCode(coordinate);
  const locations = await getAllLocations();
  const now = Date.now();
  
  const note: PlaceNote = {
    ...noteData,
    ...createDefaultNoteFields(),
    id: generateId(),
    gridCode,
    coordinate,
    createdAt: now,
    updatedAt: now,
  };
  
  // Get or create grid location
  let gridLocation = locations[gridCode];
  
  if (gridLocation) {
    // Add note to existing location
    gridLocation.notes.push(note);
    gridLocation.noteCount = gridLocation.notes.length;
  } else {
    // Create new location (first note generates QR)
    gridLocation = {
      code: gridCode,
      coordinate,
      notes: [note],
      firstNoteAt: now,
      qrGenerated: true, // QR is generated on first note
      noteCount: 1,
    };
  }
  
  locations[gridCode] = gridLocation;
  
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    
    // Update user's note count
    const user = await getUserProfile();
    user.notesCount += 1;
    await saveUserProfile(user);
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
  
  return { note, gridLocation };
}

// Vote on a note
export async function voteOnNote(
  gridCode: string,
  noteId: string,
  odId: string,
  voteType: 'up' | 'down' | 'none'
): Promise<PlaceNote | null> {
  const locations = await getAllLocations();
  const location = locations[gridCode];
  
  if (!location) return null;
  
  const noteIndex = location.notes.findIndex(n => n.id === noteId);
  if (noteIndex === -1) return null;
  
  const note = location.notes[noteIndex];
  const previousVote = note.votedBy[odId];
  
  // Remove previous vote
  if (previousVote === 'up') note.upvotes--;
  if (previousVote === 'down') note.downvotes--;
  
  // Apply new vote
  if (voteType === 'none') {
    delete note.votedBy[odId];
  } else {
    note.votedBy[odId] = voteType;
    if (voteType === 'up') note.upvotes++;
    if (voteType === 'down') note.downvotes++;
  }
  
  location.notes[noteIndex] = note;
  locations[gridCode] = location;
  
  await AsyncStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  
  // Update author karma
  const karmaChange = (voteType === 'up' ? 1 : voteType === 'down' ? -1 : 0) -
                      (previousVote === 'up' ? 1 : previousVote === 'down' ? -1 : 0);
  if (karmaChange !== 0) {
    // In a real app, you'd update the author's karma in a user database
  }
  
  return note;
}

// Add reply to a note
export async function addReply(
  gridCode: string,
  noteId: string,
  parentReplyId: string | null,
  content: string,
  authorName: string,
  authorId: string
): Promise<Reply | null> {
  const locations = await getAllLocations();
  const location = locations[gridCode];
  
  if (!location) return null;
  
  const noteIndex = location.notes.findIndex(n => n.id === noteId);
  if (noteIndex === -1) return null;
  
  const note = location.notes[noteIndex];
  
  const newReply: Reply = {
    id: generateId(),
    parentId: parentReplyId,
    content,
    authorName,
    authorId,
    createdAt: Date.now(),
    upvotes: 0,
    downvotes: 0,
    votedBy: {},
    replies: [],
  };
  
  if (parentReplyId === null) {
    // Top-level reply
    note.replies.push(newReply);
  } else {
    // Nested reply - find parent and add
    const addNestedReply = (replies: Reply[]): boolean => {
      for (const reply of replies) {
        if (reply.id === parentReplyId) {
          reply.replies.push(newReply);
          return true;
        }
        if (addNestedReply(reply.replies)) return true;
      }
      return false;
    };
    addNestedReply(note.replies);
  }
  
  note.replyCount++;
  location.notes[noteIndex] = note;
  locations[gridCode] = location;
  
  await AsyncStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  
  return newReply;
}

// Give award to a note
export async function giveAward(
  gridCode: string,
  noteId: string,
  awardType: Award['type'],
  givenBy: string
): Promise<PlaceNote | null> {
  const locations = await getAllLocations();
  const location = locations[gridCode];
  
  if (!location) return null;
  
  const noteIndex = location.notes.findIndex(n => n.id === noteId);
  if (noteIndex === -1) return null;
  
  const note = location.notes[noteIndex];
  
  const award: Award = {
    id: generateId(),
    type: awardType,
    givenBy,
    givenAt: Date.now(),
  };
  
  note.awards.push(award);
  location.notes[noteIndex] = note;
  locations[gridCode] = location;
  
  await AsyncStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  
  // Update user stats
  const user = await getUserProfile();
  user.awardsGiven++;
  await saveUserProfile(user);
  
  return note;
}

// Get all notes sorted
export async function getAllNotesSorted(
  sortBy: SortOption,
  userLocation: GeoCoordinate | null
): Promise<Array<{ note: PlaceNote; distance: number | null }>> {
  const locations = await getAllLocations();
  const allNotes: Array<{ note: PlaceNote; distance: number | null }> = [];
  
  for (const gridCode in locations) {
    const location = locations[gridCode];
    const distance = userLocation ? getDistance(userLocation, location.coordinate) : null;
    
    for (const note of location.notes) {
      // Ensure note has all required fields
      allNotes.push({
        note: {
          ...createDefaultNoteFields(),
          ...note,
        },
        distance,
      });
    }
  }
  
  // Sort based on option
  switch (sortBy) {
    case 'hot':
      // Hot = (upvotes - downvotes) / age^1.5
      allNotes.sort((a, b) => {
        const ageA = (Date.now() - a.note.createdAt) / (1000 * 60 * 60); // hours
        const ageB = (Date.now() - b.note.createdAt) / (1000 * 60 * 60);
        const scoreA = (a.note.upvotes - a.note.downvotes) / Math.pow(ageA + 2, 1.5);
        const scoreB = (b.note.upvotes - b.note.downvotes) / Math.pow(ageB + 2, 1.5);
        return scoreB - scoreA;
      });
      break;
    case 'new':
      allNotes.sort((a, b) => b.note.createdAt - a.note.createdAt);
      break;
    case 'top':
      allNotes.sort((a, b) => (b.note.upvotes - b.note.downvotes) - (a.note.upvotes - a.note.downvotes));
      break;
    case 'nearby':
      if (userLocation) {
        allNotes.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
      break;
  }
  
  return allNotes;
}

// Get nearby locations within radius (meters)
export async function getNearbyLocations(
  center: GeoCoordinate,
  radiusMeters: number = 5000
): Promise<Array<{ gridLocation: GridLocation; distance: number }>> {
  const locations = await getAllLocations();
  const nearby: Array<{ gridLocation: GridLocation; distance: number }> = [];
  
  for (const gridCode in locations) {
    const location = locations[gridCode];
    const distance = getDistance(center, location.coordinate);
    
    if (distance <= radiusMeters) {
      // Ensure all notes have required fields
      location.notes = location.notes.map(note => ({
        ...createDefaultNoteFields(),
        ...note,
      }));
      nearby.push({ gridLocation: location, distance });
    }
  }
  
  // Sort by distance
  nearby.sort((a, b) => a.distance - b.distance);
  
  return nearby;
}

// Delete a note
export async function deleteNote(gridCode: string, noteId: string): Promise<void> {
  const locations = await getAllLocations();
  const location = locations[gridCode];
  
  if (location) {
    location.notes = location.notes.filter(n => n.id !== noteId);
    location.noteCount = location.notes.length;
    
    // Remove location if no notes left
    if (location.notes.length === 0) {
      delete locations[gridCode];
    } else {
      locations[gridCode] = location;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  }
}

// Get all notes for a grid code
export async function getNotesForLocation(gridCode: string): Promise<PlaceNote[]> {
  const location = await getLocation(gridCode);
  return location?.notes || [];
}

// Search notes by content
export async function searchNotes(query: string): Promise<PlaceNote[]> {
  const locations = await getAllLocations();
  const results: PlaceNote[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const gridCode in locations) {
    const location = locations[gridCode];
    for (const note of location.notes) {
      if (
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery) ||
        note.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          ...createDefaultNoteFields(),
          ...note,
        });
      }
    }
  }
  
  return results;
}

// Clear all data (for development)
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LOCATIONS,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.NOTES,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Add some demo data
export async function addDemoData(currentLocation: GeoCoordinate): Promise<void> {
  const demoNotes = [
    {
      title: 'The Old Coffee Shop',
      content: 'This used to be a small coffee shop in the 1990s. My grandmother would bring me here every Sunday for hot chocolate. The owner, Mr. Chen, always had a smile and would give kids extra marshmallows. It closed in 2005 when Mr. Chen retired.',
      images: [],
      authorName: 'Sarah M.',
      authorId: 'demo-1',
      tags: ['nostalgia', 'food', 'childhood'],
    },
    {
      title: 'First Kiss Spot',
      content: 'Right here under this tree, I had my first kiss in high school. It was 1998, and we were both so nervous. We\'re now married with two kids. Every time we walk by, we hold hands a little tighter.',
      images: [],
      authorName: 'David & Lisa',
      authorId: 'demo-2',
      tags: ['love', 'memories', 'milestone'],
    },
    {
      title: 'The Great Flood of 2019',
      content: 'During the monsoon of 2019, this entire area was underwater for three days. Neighbors helped each other move belongings to upper floors. The community came together like never before. We set up a relief camp at the nearby school.',
      images: [],
      authorName: 'Amit K.',
      authorId: 'demo-3',
      tags: ['history', 'community', 'disaster'],
    },
    {
      title: 'Street Art That Disappeared',
      content: 'There used to be a beautiful mural here painted by a local artist in 2015. It depicted the neighborhood\'s history. When they renovated the building, they painted over it. I\'m glad I took photos. This place needs more art.',
      images: [],
      authorName: 'Maya P.',
      authorId: 'demo-4',
      tags: ['art', 'culture', 'preservation'],
    },
  ];
  
  // Spread demo notes around the current location
  for (let i = 0; i < demoNotes.length; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.01;
    const offsetLng = (Math.random() - 0.5) * 0.01;
    const coord = {
      latitude: currentLocation.latitude + offsetLat,
      longitude: currentLocation.longitude + offsetLng,
    };
    
    await saveNote(coord, demoNotes[i]);
  }
}
