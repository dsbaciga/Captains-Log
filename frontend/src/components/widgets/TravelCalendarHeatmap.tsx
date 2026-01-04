/**
 * TravelCalendarHeatmap - GitHub-style calendar heatmap showing travel activity
 * Displays the past year with intensity based on number of active trips per day
 * Only includes Completed, In Progress, and Planning trips
 */

import { useState, useEffect } from 'react';
import tripService from '../../services/trip.service';
import type { Trip } from '../../types/trip';
import { Skeleton } from '../Skeleton';

interface DayData {
  date: Date;
  count: number;
  trips: string[]; // Trip titles for tooltip
}

export default function TravelCalendarHeatmap() {
  const [isLoading, setIsLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  useEffect(() => {
    loadTravelData();
  }, []);

  const loadTravelData = async () => {
    try {
      const response = await tripService.getTrips();
      const trips = response.trips.filter(
        (trip) =>
          trip.status === 'Completed' ||
          trip.status === 'In Progress' ||
          trip.status === 'Planning'
      );

      // Generate data for the past year
      const data = generateYearData(trips);
      setHeatmapData(data);
    } catch (error) {
      console.error('Failed to load travel data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateYearData = (trips: Trip[]): DayData[] => {
    const data: DayData[] = [];
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Create a map of dates to trip counts
    const dateMap = new Map<string, { count: number; trips: string[] }>();

    // Process each trip
    trips.forEach((trip) => {
      if (!trip.startDate || !trip.endDate) return;

      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);

      // Iterate through each day in the trip
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { count: 0, trips: [] });
        }
        const dayData = dateMap.get(dateKey)!;
        dayData.count += 1;
        if (!dayData.trips.includes(trip.title)) {
          dayData.trips.push(trip.title);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Generate array for the past year
    const currentDate = new Date(oneYearAgo);
    // Start from the beginning of the week
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = dateMap.get(dateKey) || { count: 0, trips: [] };

      data.push({
        date: new Date(currentDate),
        count: dayData.count,
        trips: dayData.trips,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  };

  const getColorClass = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-navy-900/30';
    if (count === 1) return 'bg-primary-200 dark:bg-primary-900/50';
    if (count === 2) return 'bg-primary-400 dark:bg-primary-700/70';
    if (count === 3) return 'bg-primary-600 dark:bg-primary-600/80';
    return 'bg-primary-800 dark:bg-primary-500';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupByWeeks = (days: DayData[]): DayData[][] => {
    const weeks: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const getMonthLabels = (): { label: string; weekIndex: number }[] => {
    const labels: { label: string; weekIndex: number }[] = [];
    const weeks = groupByWeeks(heatmapData);

    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      // Check the first day of the week
      if (week.length > 0) {
        const firstDay = week[0].date;
        const month = firstDay.getMonth();

        // Only add label if it's a new month
        if (month !== lastMonth) {
          labels.push({
            label: firstDay.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border-2 border-primary-100 dark:border-sky/10">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded" />
        </div>
        <Skeleton className="h-32 w-full rounded" />
      </div>
    );
  }

  const weeks = groupByWeeks(heatmapData);
  const monthLabels = getMonthLabels();

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border-2 border-primary-100 dark:border-sky/10 hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">
          Travel Calendar
        </h3>
      </div>

      {/* Calendar Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month Labels */}
          <div className="relative mb-2 h-5">
            <div className="flex gap-[2px]" style={{ paddingLeft: '20px' }}>
              {monthLabels.map((monthLabel, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-500 dark:text-gray-400 font-medium"
                  style={{
                    position: 'absolute',
                    left: `${20 + monthLabel.weekIndex * 14}px`,
                  }}
                >
                  {monthLabel.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day Labels and Grid */}
          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col gap-[2px] justify-start">
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400" />
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400">Mon</div>
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400" />
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400">Wed</div>
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400" />
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400">Fri</div>
              <div className="h-3 text-xs text-gray-500 dark:text-gray-400" />
            </div>

            {/* Calendar grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm ${getColorClass(
                        day.count
                      )} cursor-pointer hover:ring-2 hover:ring-accent-500 transition-all duration-150`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${formatDate(day.date)}: ${day.count} trip${
                        day.count !== 1 ? 's' : ''
                      }`}
                    />
                  ))}
                  {/* Fill empty cells to maintain grid height */}
                  {week.length < 7 &&
                    Array.from({ length: 7 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-3 h-3" />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-navy-900/30" />
            <div className="w-3 h-3 rounded-sm bg-primary-200 dark:bg-primary-900/50" />
            <div className="w-3 h-3 rounded-sm bg-primary-400 dark:bg-primary-700/70" />
            <div className="w-3 h-3 rounded-sm bg-primary-600 dark:bg-primary-600/80" />
            <div className="w-3 h-3 rounded-sm bg-primary-800 dark:bg-primary-500" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDay.count > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {formatDate(hoveredDay.date)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {hoveredDay.count} active trip{hoveredDay.count !== 1 ? 's' : ''}:
          </div>
          <ul className="mt-1 text-xs text-gray-700 dark:text-gray-300 list-disc list-inside">
            {hoveredDay.trips.map((tripTitle, index) => (
              <li key={index}>{tripTitle}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
