# Feature Ideas

This document tracks potential future enhancements for Captain's Log.

## Enhanced Travel Planning

- **Budget Tracking & Analytics**: Track expenses per trip/category with currency conversion, visualize spending patterns, set budgets with alerts
- **Packing Lists**: Customizable checklists by trip type/destination with item sharing across trips
- **Trip Timeline View Enhancement**: Visual timeline showing chronological sequence of locations, transportation, lodging, and activities (basic timeline exists, could be enhanced with visual improvements)
- **Weather Forecasting**: Expand current weather integration to show forecasts during planning phase (OpenWeatherMap API configured but not integrated)
- **Route Optimization**: Suggest optimal ordering of locations to minimize travel time/distance

## Social & Sharing

- **Trip Collaboration UI**: Build UI for inviting others to view/edit trips (database schema complete via `TripCollaborator` model, UI needed)
- **Public Trip Gallery**: Leverage `privacyLevel` field to create discoverable public trips for inspiration
- **Trip Templates**: Export trips as templates others can clone/customize
- **Social Feed**: Activity stream showing updates from followed travelers
- **Comments & Reactions**: Allow comments on photos, locations, and journal entries

## Photo & Media Enhancements

- **Advanced Photo Organization**:
  - Auto-organize by date/location using EXIF data (EXIF parsing already implemented)
  - Facial recognition for companions
  - Smart albums (e.g., "All Sunsets", "Food Photos")
- **Video Support**: Upload and playback videos alongside photos
- **Photo Stories**: Create narrative slideshows combining photos + journal entries
- **Map-Photo Integration**: Display photos on map at capture location (photo location linking exists, map display could be enhanced)

## Trip Discovery & Inspiration

- **Destination Recommendations**: Suggest destinations based on travel history and preferences
- **Bucket List Management**: Enhance "Dream" status trips with inspiration feeds, cost estimates
- **Similar Trips**: Find public trips to same destinations for ideas
- **Travel Stats Dashboard**: Visualize countries/cities visited, total distance traveled, trip duration stats

## Location Intelligence

- **Points of Interest**: Auto-suggest nearby attractions, restaurants, landmarks using geocoding (Nominatim integration exists, POI suggestions not implemented)
- **Location Reviews & Ratings**: Personal ratings and notes for visited places
- **Offline Maps**: Download map tiles for offline access during travel
- **Location History Import**: Import from Google Timeline or similar services

## Journal & Storytelling

- **Rich Text Editor**: Support markdown, embeds, formatting in journal entries (basic text support exists)
- **Daily Auto-Journal**: Auto-generate journal entry drafts from day's locations/photos/activities
- **Export Options**: Generate PDFs, photo books, blog posts from trips
- **Voice Notes**: Record audio journal entries that transcribe to text

## Integrations

- **Calendar Sync**: Two-way sync with Google Calendar, iCal for trip dates
- **Booking Integrations**: Import confirmations from email (flights, hotels, activities)
- **Expand Immich Integration**: Two-way sync, advanced filtering from Immich library (basic integration complete)
- **Flight Tracking**: Real-time status updates using existing `aviationstack` integration (API configured but not integrated)
- **Mapping Services**: Add support for Google Maps, Mapbox alongside Leaflet
- **Google Photos Integration**: Connect to Google Photos to import photos directly into trips, similar to the existing Immich integration

## Mobile Experience

- **Progressive Web App (PWA)**: Offline support, install as native app
- **Mobile-Optimized UI**: Touch-friendly interfaces, swipe gestures
- **Quick Capture**: Fast photo upload + location tagging while traveling
- **Push Notifications**: Reminders for upcoming trips, flight updates

## Data & Analytics

- **Travel Statistics**: Countries/cities count, total miles, days traveled, photos taken
- **Year in Review**: Annual summary of travel highlights
- **Carbon Footprint**: Calculate environmental impact by transportation method
- **Data Export**: Export all data in standard formats (JSON, CSV)
- **Data Import**: Import from other travel apps, spreadsheets

## Advanced Features

- **AI-Powered Features**:
  - Auto-tag photos by content (beach, mountain, food, etc.)
  - Suggest journal entry topics based on photos/locations
  - Generate trip summaries
- **Multi-Language Support**: i18n for interface and content
- **Accessibility**: Screen reader support, keyboard navigation, high contrast themes
- **Search & Filtering**: Global search across trips, advanced filters by date/location/tags (basic filtering exists, could be expanded)
- **Custom Fields**: User-defined metadata fields for trips/locations/activities

## Transportation

- **Add multi-day travel**: Support transportation that spans multiple days (e.g., long train journeys, cruises, multi-day road trips) with the ability to show them across the timeline

## Quick Wins (Easy to Implement)

These features would be relatively straightforward given the current architecture:

1. **Trip Statistics Dashboard**: Query existing data for counts, totals, and visualizations
2. **Enhanced Filtering**: Backend already supports filtering; expand UI filters on dashboard
3. **Photo Gallery Improvements**: Better sorting, filtering by album/date
4. **Export Trip as JSON**: Simple data export feature
5. **Tag Management UI**: Enhanced CRUD interface for tags (many-to-many already implemented)
6. **Companion Management**: Enhanced CRUD interface for companions (many-to-many exists)
7. **Activity Cost Tracking**: Sum costs per trip, show spending breakdown (cost field exists, aggregation not implemented)
8. **Location Category Management**: Enhanced UI for custom categories (already in User model)
