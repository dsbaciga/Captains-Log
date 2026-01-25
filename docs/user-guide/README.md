# Travel Life User Guide

Welcome to Travel Life, your comprehensive travel documentation application. This guide will help you get the most out of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Trips](#managing-trips)
3. [Locations](#locations)
4. [Photos & Albums](#photos--albums)
5. [Transportation](#transportation)
6. [Lodging](#lodging)
7. [Activities](#activities)
8. [Journal Entries](#journal-entries)
9. [Timeline View](#timeline-view)
10. [Entity Linking](#entity-linking)
11. [Tags & Companions](#tags--companions)
12. [Search](#search)
13. [Settings](#settings)
14. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### Creating Your Account

1. Navigate to the application URL
2. Click **Register**
3. Enter your username, email, and password
4. Click **Create Account**

### First Login

After logging in, you'll see the Dashboard with your trips. If you're new, it will be empty.

### Setting Up Your Profile

1. Click your avatar in the top right corner
2. Select **Settings**
3. Configure:
   - **Timezone**: Your home timezone for dual-timezone display
   - **Theme**: Light or Dark mode
   - **External Services**: Immich, weather APIs, etc.

---

## Managing Trips

### Creating a Trip

1. From the Dashboard, click **+ New Trip**
2. Enter trip details:
   - **Title**: Give your trip a name
   - **Dates**: Start and end dates (optional for dream trips)
   - **Status**: Dream, Planning, Planned, etc.
   - **Description**: Trip overview
3. Click **Create**

### Trip Statuses

| Status | Description |
|--------|-------------|
| **Dream** | Wishlist trip you'd like to take someday |
| **Planning** | Actively researching and planning |
| **Planned** | All details finalized, ready to go |
| **In Progress** | Currently on the trip |
| **Completed** | Trip finished |
| **Cancelled** | Trip cancelled |

### Cloning a Trip

Want to reuse a trip's structure?

1. Open the trip
2. Click the **⋮** menu
3. Select **Duplicate Trip**
4. A copy is created with all locations, activities, etc.

---

## Locations

### Adding Locations

1. Open a trip
2. Go to the **Locations** tab
3. Click **+ Add Location**
4. Enter:
   - **Name**: Location name
   - **Address**: Will auto-geocode to coordinates
   - **Category**: Restaurant, Hotel, Attraction, etc.
   - **Visit Time**: When you plan to visit
   - **Duration**: How long you'll spend there

### Using the Map

- Click on the map to add a new location
- Drag markers to reposition
- Click a marker to see location details

### Location Categories

Create custom categories in **Settings > Location Categories**:
- Add categories with custom icons and colors
- Categories help organize and filter locations

---

## Photos & Albums

### Uploading Photos

1. Go to the **Photos** tab
2. Click **Upload** or drag files
3. Photos are automatically:
   - Geotagged (if EXIF data present)
   - Timestamped
   - Thumbnailed

### Batch Upload

Upload multiple photos at once:
1. Select multiple files
2. Photos upload in parallel
3. Progress shown for each file

### Creating Albums

1. Go to the **Albums** tab
2. Click **+ New Album**
3. Give it a name and description
4. Add photos to the album

### Immich Integration

If you use Immich for photo management:

1. Go to **Settings > Immich**
2. Enter your Immich server URL and API key
3. In a trip's Photos tab, click **Import from Immich**
4. Select photos to import

---

## Transportation

### Adding Transportation

1. Go to the **Transportation** tab
2. Click **+ Add Transportation**
3. Select type:
   - Flight, Train, Bus, Ferry, Car, Rideshare, Walk, Bike

### Flight-Specific Features

For flights:
- Enter flight number for tracking
- Gate and terminal information
- Baggage claim details
- Real-time status updates (if API configured)

### Connected Segments

For trips with connections (e.g., multi-leg flights):
1. Create the first segment
2. Create additional segments
3. Link them using **Connection Group**

### Distance Calculation

For car, bike, and walking:
- Distances are calculated automatically
- Uses OpenRouteService for road distances
- Falls back to straight-line if not configured

---

## Lodging

### Adding Accommodations

1. Go to the **Lodging** tab
2. Click **+ Add Lodging**
3. Enter:
   - **Type**: Hotel, Airbnb, Hostel, Camping, etc.
   - **Name**: Property name
   - **Check-in/out dates**
   - **Confirmation number**
   - **Cost**

### Multi-Day Display

Lodging automatically appears on the timeline for each day from check-in to check-out.

---

## Activities

### Adding Activities

1. Go to the **Activities** tab
2. Click **+ Add Activity**
3. Enter:
   - **Name**: Activity name
   - **Category**: Sightseeing, Dining, Adventure, etc.
   - **Time**: Start and end time
   - **Cost**: If applicable
   - **Booking details**

### Activity Categories

Default categories include:
- Sightseeing, Dining, Adventure, Entertainment
- Shopping, Recreation, Cultural, Sports
- Wellness, Tour, Other

Customize categories in **Settings > Activity Categories**.

### Sub-Activities

Create hierarchical activities:
1. Create a parent activity
2. Create child activities linked to the parent
3. Useful for multi-part experiences

---

## Journal Entries

### Trip-Level Journals

For overall trip reflections:
1. Go to **Journal** tab
2. Click **+ New Entry**
3. Select **Trip Journal**
4. Write your entry

### Daily Journals

For day-by-day documentation:
1. Click **+ New Entry**
2. Select **Daily Journal**
3. Choose the date
4. Add:
   - Content (rich text supported)
   - Mood
   - Weather notes

### Rich Text Editor

The journal supports:
- **Bold**, *italic*, ~~strikethrough~~
- Headings and lists
- Links and images
- Quote blocks

---

## Timeline View

### Viewing the Timeline

1. Open a trip
2. Click the **Timeline** tab
3. See all events chronologically

### Dual Timezone Display

Events show times in:
- **Trip timezone**: Local time at the destination
- **Home timezone**: Your configured timezone

This helps when planning across time zones.

### Filtering the Timeline

Filter by event type:
- Transportation
- Lodging
- Activities
- Locations

### Compact View

Toggle compact view for a denser timeline display.

### Printable Itinerary

1. Click **Print Itinerary**
2. A print-friendly version opens
3. Print or save as PDF

---

## Entity Linking

### What is Entity Linking?

Connect any item to any other item:
- Link photos to locations where they were taken
- Link activities to their locations
- Link journal entries to what they describe

### Creating Links

1. Open any item (photo, activity, etc.)
2. Click the **Link** icon
3. Select what to link to
4. Choose relationship type

### Relationship Types

| Type | Use For |
|------|---------|
| Related | General connection |
| Taken At | Photo at location |
| Occurred At | Activity at location |
| Part Of | Sub-items |
| Documents | Journal about something |
| Featured In | Photo in album |

---

## Tags & Companions

### Using Tags

Organize trips with tags:
1. Go to **Settings > Tags**
2. Create tags (e.g., "Beach", "City", "Road Trip")
3. Assign tags to trips from the trip settings

### Travel Companions

Track who you travel with:
1. Go to **Settings > Companions**
2. Add companions (family, friends, etc.)
3. Assign companions to trips

---

## Search

### Global Search

Press **Ctrl+K** (or **Cmd+K** on Mac) to open global search.

Search across:
- Trip names
- Locations
- Activities
- Journal entries

### Dashboard Filters

Filter trips by:
- Status
- Tags
- Date range

---

## Settings

### Profile Settings

- Update username and email
- Change password
- Upload avatar

### Application Settings

- **Timezone**: Your home timezone
- **Theme**: Light or Dark mode

### Location Categories

Add custom location categories with icons and colors.

### Activity Categories

Customize activity categories with emojis.

### External Services

Configure API keys for:
- **Immich**: Self-hosted photo library
- **OpenWeatherMap**: Weather data
- **AviationStack**: Flight tracking
- **OpenRouteService**: Road distances

### Backup & Restore

- **Export**: Download all your data as JSON
- **Import**: Restore from a backup file

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open global search |
| `Ctrl+N` | New trip |
| `Escape` | Close modal/panel |
| `?` | Show keyboard shortcuts help |

### In Timeline

| Shortcut | Action |
|----------|--------|
| `J` | Next item |
| `K` | Previous item |
| `Enter` | Open selected item |

---

## Tips & Tricks

### Planning a Trip

1. Start with status **Dream** or **Planning**
2. Add locations you want to visit
3. Research and add activities
4. Book transportation and lodging
5. Update status to **Planned**

### During the Trip

1. Change status to **In Progress**
2. Upload photos as you go
3. Write daily journal entries
4. Update activities with actual times

### After the Trip

1. Change status to **Completed**
2. Organize photos into albums
3. Write a trip journal
4. Link photos to locations

### Using Places Visited Map

After completing trips, view all your visited locations on a global map:
1. Go to **Places Visited** from the main menu
2. See pins for all locations from completed trips

---

## Getting Help

- **In-app help**: Click `?` for keyboard shortcuts
- **Documentation**: You're reading it!
- **Issues**: Report bugs on GitHub

---

## Related Documentation

- [docs/README.md](../README.md) - Documentation index
- [docs/architecture/](../architecture/) - Technical documentation
