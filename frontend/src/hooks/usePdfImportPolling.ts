import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import pdfImportService from '../services/pdfImport.service';
import type { PdfImportStatus } from '../types/pdfImport';

const TERMINAL_STATUSES: PdfImportStatus[] = ['PARSED', 'PARSE_FAILED', 'NO_ENTITIES'];

// First 10 attempts at 2s = 20s, remaining 50 at 5s = 250s → total ~4.5 minutes
// before the hook gives up and stops polling. Prevents runaway polling when the
// backend job crashes without updating status.
const MAX_POLL_ATTEMPTS = 60;

export function usePdfImportPolling(importId: number | null) {
  const attemptCountRef = useRef(0);
  const [timedOut, setTimedOut] = useState(false);

  // Reset attempt counter and timeout flag whenever we start polling a new import
  useEffect(() => {
    attemptCountRef.current = 0;
    setTimedOut(false);
  }, [importId]);

  const query = useQuery({
    queryKey: ['pdfImport', importId],
    queryFn: async () => {
      attemptCountRef.current += 1;
      return pdfImportService.getPdfImportById(importId!);
    },
    enabled: importId !== null && !timedOut,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Only stop polling once we have a terminal status
      if (status && TERMINAL_STATUSES.includes(status)) return false;
      // Cap polling so a crashed background job can't poll forever
      if (attemptCountRef.current >= MAX_POLL_ATTEMPTS) {
        setTimedOut(true);
        return false;
      }
      // Exponential backoff: 2s for first 10 attempts, then 5s
      return attemptCountRef.current < 10 ? 2000 : 5000;
    },
    refetchIntervalInBackground: false,
  });

  return { ...query, timedOut };
}
