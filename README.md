# here&now

> A digital archive of physical spaces — Every place has a story waiting to be told.

**here&now** transforms the world into a living storybook. Discover the hidden narratives of places around you, or become the author of new ones. Each location holds memories, histories, and tales from the people who've passed through.

## The Idea

What if every street corner, every park bench, every forgotten building could tell its story? This app makes that possible. Leave a note at any GPS location, and it becomes part of that place's permanent memory. Future visitors can scan a QR code to read what you wrote — and add their own chapter.

## Features

### Stories
Share memories, histories, observations about any place. Add photos, tag with themes, and let others discover your story on the map.

### Time Capsules
Bury a story that won't be readable until a future date. Others can see a capsule exists at a location, but they can't read it until it unlocks. Create anticipation and mystery.

### Story Seeds
Plant a prompt for others to respond to. Instead of telling your own story, ask a question: "What's your earliest memory of this street?" — and watch others respond with their own tales.

### Whisper Radius
Some stories are meant to be discovered only when you're actually there. Set a whisper radius so your story is only visible within 50m, 200m, or 500m of the location. Forces people to actually go to places.

### Place Codes
Every ~10m² spot gets a unique grid code. Auto-generated QR codes for sharing. Print and place QRs in the real world. Scan any QR to unlock location stories.

### Your Journey
Track stories shared, places visited. Earn badges: Storyteller, Explorer, Historian. Level up through karma. Beautiful profile with earthy aesthetics.

## Design

- **Earthy & Warm**: Parchment backgrounds, forest greens, terracotta accents
- **Archival Feel**: Like reading from an old journal
- **No White Backgrounds**: Cream everywhere, white only for inputs
- **Smooth Animations**: Every interaction feels intentional
- **No Random Emojis**: Clean, icon-based UI

## Tech Stack

- **React Native** + Expo
- **TypeScript**
- **react-native-maps** with custom earthy styling
- **expo-camera** for QR scanning
- **AsyncStorage** for local persistence
- **Expo Location** for GPS

## Getting Started

```bash
# Clone
git clone https://github.com/raeskaa/here-now.git
cd here-now

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
│   ├── context/AppContext.tsx
│   ├── navigation/AppNavigator.tsx
│   ├── screens/
│   │   ├── MapScreen.tsx
│   │   ├── NearbyScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── AddNoteScreen.tsx
│   │   ├── NoteDetailScreen.tsx
│   │   └── ...
│   ├── types/index.ts
│   └── utils/
│       ├── GeoGrid.ts
│       ├── storage.ts
│       └── theme.ts
```

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Forest Green | `#2D4739` | Primary, markers |
| Light Green | `#4A7C59` | Gradients |
| Terracotta | `#D4A574` | Accents, new badges |
| Parchment | `#FAF7F2` | Background |
| Whisper | `#8B7355` | Whisper radius |
| Capsule | `#6B5B4F` | Time capsules |
| Seed | `#5C7A5A` | Story seeds |

## License

MIT

---

*here&now — Every place has a story*
