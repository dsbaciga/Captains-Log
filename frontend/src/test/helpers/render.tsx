/**
 * Custom render function that wraps components with all necessary providers
 * for testing React components in the Travel Life application.
 */

import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// ============================================================================
// Provider Setup
// ============================================================================

/**
 * Options for the custom render function
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for MemoryRouter (if not using BrowserRouter)
   */
  route?: string;

  /**
   * Use MemoryRouter instead of BrowserRouter
   */
  useMemoryRouter?: boolean;

  /**
   * Initial entries for MemoryRouter
   */
  initialEntries?: string[];

  /**
   * Custom QueryClient instance (creates new one if not provided)
   */
  queryClient?: QueryClient;

  /**
   * Initial auth state for testing protected routes
   */
  initialAuthState?: {
    isAuthenticated: boolean;
    user?: {
      id: number;
      username: string;
      email: string;
    };
  };
}

/**
 * Creates a fresh QueryClient instance for testing
 * with disabled retries and shorter stale times
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        staleTime: 0, // Always consider data stale
        gcTime: 0, // Garbage collect immediately (formerly cacheTime)
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Creates the wrapper component with all necessary providers
 */
function createWrapper(options: CustomRenderOptions = {}) {
  const {
    route = '/',
    useMemoryRouter = false,
    initialEntries = [route],
    queryClient = createTestQueryClient(),
  } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
    const routerProps = useMemoryRouter ? { initialEntries } : {};

    return (
      <QueryClientProvider client={queryClient}>
        <Router {...routerProps}>
          {children}
          <Toaster position="top-right" />
        </Router>
      </QueryClientProvider>
    );
  };

  return Wrapper;
}

// ============================================================================
// Custom Render Functions
// ============================================================================

/**
 * Custom render function that wraps components with all necessary providers
 *
 * @example
 * // Basic usage
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * @example
 * // With custom route
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   route: '/trips/1',
 *   useMemoryRouter: true,
 * });
 *
 * @example
 * // With custom QueryClient
 * const queryClient = createTestQueryClient();
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   queryClient,
 * });
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient || createTestQueryClient();
  const result = render(ui, {
    wrapper: createWrapper({ ...options, queryClient }),
    ...options,
  });

  return {
    ...result,
    queryClient,
  };
}

/**
 * Render with just BrowserRouter (minimal providers)
 * Useful for simple component tests that don't need query client
 */
export function renderWithRouter(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'queryClient'> = {}
): RenderResult {
  const { route = '/', useMemoryRouter = false, initialEntries = [route], ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    if (useMemoryRouter) {
      return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
    }
    return <BrowserRouter>{children}</BrowserRouter>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render with QueryClient only (no router)
 * Useful for testing hooks or components that don't need routing
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options: { queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'> = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient || createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper, ...options });

  return {
    ...result,
    queryClient,
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for loading states to complete
 * Useful when components have async initialization
 */
export async function waitForLoadingToComplete(
  container: HTMLElement,
  loadingSelector = '[data-testid="loading"]'
): Promise<void> {
  const loading = container.querySelector(loadingSelector);
  if (loading) {
    await new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        if (!container.querySelector(loadingSelector)) {
          obs.disconnect();
          resolve(undefined);
        }
      });
      observer.observe(container, { childList: true, subtree: true });
    });
  }
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Flush all pending promises and timers
 * Useful for ensuring async operations complete before assertions
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export everything from @testing-library/react for convenience
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

// Default export for common use case
export default renderWithProviders;
