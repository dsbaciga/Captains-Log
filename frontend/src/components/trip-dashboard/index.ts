/**
 * Trip Dashboard Components
 *
 * These components provide the Dashboard view for trips, serving as the central
 * hub for trip information with an at-a-glance view of status, upcoming events,
 * statistics, and quick navigation.
 *
 * Main Components:
 * - TripDashboard: Main container component for the dashboard layout
 * - DashboardHero: Hero section with trip title, dates, status, and cover photo
 * - TripDayIndicator: Displays countdown/day indicator based on trip status
 * - NextUpCard: Shows the next upcoming event based on trip status
 * - EventPreview: Reusable component to display any event type
 * - QuickActionsBar: Context-sensitive quick actions based on trip status
 * - ChecklistsWidget: Quick view of checklist progress
 * - TodaysItinerary: Today's schedule for in-progress trips
 */

export { default as TripDashboard } from './TripDashboard';
export { default as DashboardHero } from './DashboardHero';
export { default as TripDayIndicator } from './TripDayIndicator';
export { default as NextUpCard } from './NextUpCard';
export { default as EventPreview, EventIcon, getEventTypeColors } from './EventPreview';
export { default as QuickActionsBar } from './QuickActionsBar';
export { default as ChecklistsWidget } from './ChecklistsWidget';
export { default as TodaysItinerary } from './TodaysItinerary';
