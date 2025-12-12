# Once Upon a Time 📍✨

> A digital archive of physical spaces — Every place has a story waiting to be told.

**Once Upon a Time** transforms the world into a living storybook. Discover the hidden narratives of places around you, or become the author of new ones. Each location holds memories, histories, and tales from the people who've passed through.

## The Idea

What if every street corner, every park bench, every forgotten building could tell its story? This app makes that possible. Leave a note at any GPS location, and it becomes part of that place's permanent memory. Future visitors can scan a QR code to read what you wrote — and add their own chapter.

## Features

### 🗺️ Story Map
- Explore an earthy, vintage-styled map showing story locations
- Tap markers to preview stories
- Long press anywhere to plant a new story
- Dynamic markers that grow with more stories

### 📖 Storytelling
- Write memories, histories, observations
- Add up to 4 photos
- Tag with themes: nostalgia, food, history, love, art...
- Threaded discussions with upvotes/downvotes

### 🔲 Place Codes
- Every ~10m² spot gets a unique grid code
- Auto-generated QR codes for sharing
- Print and place QRs in the real world
- Scan any QR to unlock location stories

### 👤 Your Journey
- Track stories shared, places visited
- Earn badges: Storyteller, Explorer, Historian...
- Level up through karma
- Beautiful profile with earthy aesthetics

### 🔍 Discovery
- Reddit-style feed of nearby stories
- Filter by time, tags, distance
- Swipeable story cards on the map
- Search through all local tales

## Tech Stack

- **React Native** + Expo
- **TypeScript**
- **react-native-maps** with custom earthy styling
- **expo-camera** for QR scanning
- **AsyncStorage** for local persistence
- **Expo Location** for GPS

## Grid System

Inspired by India's DigiPin system:
- World divided into ~10m × 10m cells
- Each cell: `XXXX-YYYY-ZZ` unique code
- First storyteller at a location generates the QR
- All future stories share that grid code

## Getting Started

```bash
# Clone
git clone https://github.com/raeskaa/onceuponatime.git
cd onceuponatime

# Install
npm install

# Run
npx expo start
```

Scan the QR with Expo Go on your phone.

## Project Structure

```
├── App.tsx
├── src/
│   ├── context/AppContext.tsx    # Global state
│   ├── navigation/AppNavigator.tsx
│   ├── screens/
│   │   ├── MapScreen.tsx         # Main map
│   │   ├── NearbyScreen.tsx      # Story feed
│   │   ├── ProfileScreen.tsx     # User profile
│   │   ├── NoteDetailScreen.tsx  # Story view
│   │   ├── AddNoteScreen.tsx     # Create story
│   │   └── ...
│   ├── types/index.ts
│   └── utils/
│       ├── GeoGrid.ts            # Coordinate system
│       ├── storage.ts            # Data layer
│       └── theme.ts              # Visual design
```

## Design Philosophy

- **Earthy & Warm**: Parchment backgrounds, forest greens, terracotta accents
- **Archival Feel**: Like reading from an old journal
- **Simple & Focused**: No social clutter, just places and stories
- **Community First**: Collaborative storytelling, not individual profiles

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Forest Green | `#2D4739` | Primary, markers |
| Light Green | `#4A7C59` | Gradients |
| Terracotta | `#D4A574` | Accents, new badges |
| Parchment | `#FAF7F2` | Background |

## Future Dreams

- ☁️ Cloud sync
- 🎙️ Voice stories
- 🕰️ Historical timelines
- 📷 AR story viewing
- 🏛️ Museum/library partnerships
- 🌍 Multi-language stories

## License

MIT — Use it, fork it, make your own version.

---

*Once upon a time, in a place just like this...*
