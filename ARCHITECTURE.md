# Cartpanda Admin Dashboard Architecture

## Overview

This document outlines the architecture for building a scalable, maintainable admin dashboard that supports multiple engineers shipping features in parallel while maintaining performance, accessibility, and code quality.

---

## 1. Architecture

### Route & Page Structure

**Pattern: Feature-based routing with domain modules**

```
src/
├── app/                    # App-level concerns
│   ├── layout/            # Root layout, navigation, sidebar
│   ├── providers/         # QueryClient, theme, auth providers
│   └── routes.tsx         # Route definitions
├── features/              # Feature modules (domain-driven)
│   ├── funnels/
│   │   ├── api/          # API hooks (TanStack Query)
│   │   ├── components/   # Feature-specific components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Feature hooks
│   │   ├── types/        # Feature types
│   │   └── index.ts      # Public API
│   ├── orders/
│   ├── customers/
│   ├── subscriptions/
│   ├── analytics/
│   ├── disputes/
│   └── settings/
├── shared/                # Shared across features
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Shared hooks
│   ├── lib/              # Utilities, API client
│   ├── types/            # Shared types
│   └── constants/        # App constants
└── components/ui/         # shadcn/ui primitives (don't modify)
```

**Key Principles:**
- **Feature modules own their routes**: Each feature exports its routes and pages
- **No cross-feature imports**: Features communicate via shared types/events or parent orchestration
- **Colocation**: API hooks, components, and types live together in the feature folder
- **Public API pattern**: Each feature exports only what's needed via `index.ts`

**Route Definition Example:**
```typescript
// features/funnels/index.ts
export const funnelRoutes = [
  { path: '/funnels', element: <FunnelsListPage /> },
  { path: '/funnels/:id', element: <FunnelDetailPage /> },
  { path: '/funnels/:id/edit', element: <FunnelEditPage /> },
];

// app/routes.tsx
import { funnelRoutes } from '@/features/funnels';
import { orderRoutes } from '@/features/orders';
// ... combine all routes
```

### Avoiding Spaghetti Code

1. **Feature folders**: Each domain (funnels, orders, etc.) is self-contained
2. **Barrel exports**: Use `index.ts` to control public APIs
3. **Shared layer**: Common UI/components live in `shared/`, not duplicated
4. **Type boundaries**: Use TypeScript to enforce module boundaries
5. **API abstraction**: All API calls go through a typed client in `shared/lib/api`

---

## 2. Design System

### Component Library: Buy + Extend

**Choice: shadcn/ui (already in use) + custom extensions**

- **Why**: Radix UI primitives provide accessibility out-of-the-box, shadcn gives us copy-paste control
- **Extend**: Build domain-specific components on top (e.g., `DataTable`, `FilterBar`, `StatusBadge`)
- **No vendor lock-in**: Components are in our codebase, fully customizable

### Enforcing Consistency

**Design Tokens (Tailwind + CSS Variables):**
```typescript
// tailwind.config.ts - extend with semantic tokens
theme: {
  extend: {
    colors: {
      primary: { /* semantic color scale */ },
      success: { /* ... */ },
      warning: { /* ... */ },
      error: { /* ... */ },
    },
    spacing: { /* 4px base unit system */ },
    typography: { /* font scale */ },
  }
}
```

**Accessibility Enforcement:**
1. **ESLint plugin**: `eslint-plugin-jsx-a11y` in CI/CD
2. **Component templates**: New components must include ARIA labels, keyboard navigation
3. **Storybook + a11y addon**: Visual regression + accessibility testing
4. **WCAG AA compliance**: Automated checks in PR pipeline (axe-core)
5. **Color contrast**: Tailwind config enforces accessible color pairs

**Typography & Spacing:**
- Use Tailwind's spacing scale (4px base) consistently
- Typography scale defined in config, enforced via ESLint rules
- Component variants use `cva` (class-variance-authority) for consistent styling

**Theme System:**
- `next-themes` for dark/light mode (already installed)
- CSS variables for theme tokens (enables runtime theme switching)
- All components respect theme automatically via Tailwind

---

## 3. Data Fetching + State

### Server State: TanStack Query (React Query)

**Already installed - leverage fully:**

**Query Caching Strategy:**
```typescript
// shared/lib/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Feature-level Query Hooks:**
```typescript
// features/orders/api/useOrders.ts
export const useOrders = (filters: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api.orders.list(filters),
  });
};

// features/orders/api/useOrder.ts
export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.orders.get(id),
  });
};
```

**Mutations with Optimistic Updates:**
```typescript
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.orders.update,
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['orders', newOrder.id] });
      const previous = queryClient.getQueryData(['orders', newOrder.id]);
      queryClient.setQueryData(['orders', newOrder.id], newOrder);
      return { previous };
    },
    onError: (err, newOrder, context) => {
      queryClient.setQueryData(['orders', newOrder.id], context?.previous);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    },
  });
};
```

### Client State: Zustand (lightweight, already in use for funnel store)

- **Server state**: TanStack Query (orders, customers, analytics)
- **Client state**: Zustand for UI state (filters, modals, sidebar state)
- **Form state**: React Hook Form (already installed) + Zod validation

### Loading/Error/Empty States

**Standardized Patterns:**
```typescript
// shared/components/QueryBoundary.tsx
export const QueryBoundary = ({ query, children, empty, error }) => {
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} />;
  if (query.data?.length === 0) return empty || <EmptyState />;
  return children(query.data);
};
```

**Usage:**
```typescript
const { data, ...query } = useOrders(filters);
return (
  <QueryBoundary query={query} empty={<EmptyOrders />}>
    <OrdersTable orders={data} />
  </QueryBoundary>
);
```

### Filters/Sorts/Pagination

**Pattern: URL state + TanStack Query**

```typescript
// features/orders/hooks/useOrderFilters.ts
export const useOrderFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = {
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 25,
    sort: searchParams.get('sort') || 'created_at',
    order: searchParams.get('order') || 'desc',
    status: searchParams.get('status')?.split(',') || [],
  };
  
  const updateFilters = (updates: Partial<typeof filters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, String(value));
        else next.delete(key);
      });
      return next;
    });
  };
  
  return { filters, updateFilters };
};

// In component
const { filters, updateFilters } = useOrderFilters();
const { data } = useOrders(filters); // Query key includes filters
```

**Benefits:**
- Shareable URLs (bookmarkable, shareable)
- Browser back/forward works
- Query cache keyed by filters automatically

---

## 4. Performance

### Bundle Splitting

**Vite Route-based Code Splitting:**
```typescript
// app/routes.tsx
const FunnelsListPage = lazy(() => import('@/features/funnels/pages/FunnelsListPage'));
const OrdersListPage = lazy(() => import('@/features/orders/pages/OrdersListPage'));
// ... wrap in <Suspense>
```

**Manual Chunking for Heavy Dependencies:**
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'query-vendor': ['@tanstack/react-query'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'charts': ['recharts'],
        'flow': ['@xyflow/react'],
      },
    },
  },
}
```

### Virtualization

**For Large Lists:**
- Use `@tanstack/react-virtual` for virtualized tables/lists
- Implement in shared `DataTable` component
- Auto-enable when row count > 100

**Example:**
```typescript
// shared/components/DataTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Virtualize rows for performance
```

### Memoization Strategy

1. **React.memo**: For expensive list items, table rows
2. **useMemo**: For derived data (filtered/sorted lists)
3. **useCallback**: For event handlers passed to memoized children
4. **TanStack Query**: Automatic memoization of query results

**Rule of Thumb**: Don't over-memoize. Profile first, then optimize.

### Avoiding Rerenders

1. **Colocate state**: Keep state as close to consumers as possible
2. **Zustand selectors**: Use shallow selectors to prevent unnecessary rerenders
3. **Query selectors**: Use `select` option in TanStack Query to subscribe to specific fields
4. **Component splitting**: Split large components to isolate rerender boundaries

### Instrumentation

**Performance Monitoring:**
```typescript
// shared/lib/performance.ts
export const measurePageLoad = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          // Send to analytics
          analytics.track('page_load', {
            duration: entry.duration,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          });
        }
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  }
};
```

**Metrics to Track:**
- Time to First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Query cache hit rate
- Bundle size over time

**Dashboard Performance Dashboard:**
- Track query durations, cache hit rates
- Alert on slow queries (>1s)
- Monitor bundle size in CI

---

## 5. DX & Scaling to a Team

### Onboarding Engineers

**1. Starter Template:**
```bash
# scripts/create-feature.sh
./scripts/create-feature.sh orders
# Creates feature folder structure with:
# - API hooks template
# - Page component template
# - Types template
# - Route export
```

**2. Documentation:**
- `CONTRIBUTING.md`: Architecture overview, patterns, examples
- Component Storybook: Visual catalog + code examples
- API docs: Generated from TypeScript types

**3. Code Review Checklist (PR Template):**
```markdown
## Checklist
- [ ] Feature module follows folder structure
- [ ] No cross-feature imports
- [ ] Types exported via index.ts
- [ ] Loading/error/empty states handled
- [ ] Accessibility (keyboard nav, ARIA labels)
- [ ] Responsive design (mobile/tablet)
- [ ] Tests added/updated
- [ ] Storybook story added (if new component)
```

### Conventions Enforced

**Linting & Formatting:**
- ESLint: `typescript-eslint`, `react-hooks`, `jsx-a11y`
- Prettier: Auto-format on save (VS Code settings)
- Husky: Pre-commit hooks (lint-staged)
- CI: Block PRs with lint errors

**TypeScript Strict Mode:**
- `strict: true` in tsconfig
- No `any` types (ESLint rule)
- Exhaustive type checking

**Component Guidelines:**
1. **Naming**: PascalCase for components, camelCase for hooks/utils
2. **File structure**: One component per file, co-locate related files
3. **Props**: Use TypeScript interfaces, never inline object types
4. **Accessibility**: All interactive elements must have ARIA labels
5. **Responsive**: Mobile-first, test on 320px, 768px, 1024px

**API Conventions:**
- All API calls through `shared/lib/api` client
- Zod schemas for request/response validation
- Error handling: Standardized error types

### Preventing One-off UI

**1. Component Library First:**
- Before building custom UI, check if it can use/extend shared components
- PR review: "Can this use `DataTable` instead?"

**2. Design System Tokens:**
- No magic numbers: Use Tailwind spacing/color tokens
- ESLint rule: Block hardcoded colors/spacing

**3. Storybook:**
- All shared components must have Storybook stories
- Visual regression testing (Chromatic) in CI
- Designers review components in Storybook

**4. Shared Component Approval:**
- New shared components require 2+ approvals
- Must include Storybook story + accessibility audit

---

## 6. Testing Strategy

### Testing Pyramid

**Unit Tests (70%):**
- **What**: Utilities, hooks, pure functions, component logic
- **Tool**: Vitest (already installed)
- **Coverage target**: 80% for utilities, 60% for components
- **Example**: `useOrderFilters` hook, `formatCurrency` util

**Integration Tests (20%):**
- **What**: Feature workflows (e.g., "create order flow")
- **Tool**: Vitest + React Testing Library
- **Example**: "User can filter orders by status and paginate"

**E2E Tests (10%):**
- **What**: Critical user journeys
- **Tool**: Playwright (add to project)
- **Examples**: 
  - "User can create a funnel end-to-end"
  - "User can process a refund"
- **Run**: Pre-deploy, nightly

### Minimum Testing Before Shipping

**Required:**
1. Unit tests for all API hooks (query/mutation logic)
2. Integration test for main feature flow
3. Accessibility test (axe-core in CI)
4. TypeScript compiles without errors

**Nice to Have (can add later):**
- Visual regression tests
- E2E tests (start with 3-5 critical paths)

**Testing Patterns:**
```typescript
// features/orders/api/__tests__/useOrders.test.ts
describe('useOrders', () => {
  it('fetches orders with filters', async () => {
    const { result } = renderHook(() => useOrders({ status: 'pending' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
  });
});
```

**Mock Strategy:**
- Mock API at network level (MSW - Mock Service Worker)
- Don't mock React Query, test with real QueryClient
- Mock external services (analytics, error tracking)

---

## 7. Release & Quality

### Feature Flags

**Tool: LaunchDarkly or custom (environment-based)**

```typescript
// shared/lib/featureFlags.ts
export const useFeatureFlag = (flag: string) => {
  // Check environment variable or API
  return import.meta.env.VITE_FEATURE_FLAGS?.includes(flag);
};

// Usage
const { data: newCheckout } = useFeatureFlag('new-checkout')
  ? useNewCheckout()
  : useLegacyCheckout();
```

**Strategy:**
- Flags in environment variables for simple cases
- API-based flags for dynamic control
- Remove flags after 2-3 releases (tech debt cleanup)

### Staged Rollouts

**Deployment Strategy:**
1. **Internal**: Deploy to staging, team tests
2. **Beta**: 10% of users (via feature flag)
3. **Gradual**: 25% → 50% → 100% over 3 days
4. **Rollback**: Instant via feature flag or deployment rollback

**Monitoring:**
- Error rate (should not increase)
- Performance metrics (LCP, TTI)
- User feedback (in-app feedback widget)

### Error Monitoring

**Tool: Sentry (recommended) or similar**

```typescript
// shared/lib/errorTracking.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  beforeSend(event) {
    // Filter sensitive data
    return event;
  },
});

// Error boundaries
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

**Error Handling:**
- All API errors caught and logged
- User-friendly error messages
- Critical errors alert on-call engineer

### Ship Fast but Safe

**CI/CD Pipeline:**
1. **Lint/Type check**: Block on failure
2. **Unit tests**: Block on failure (< 5 min)
3. **Build**: Verify bundle size (< threshold)
4. **Deploy to staging**: Auto-deploy on merge to `main`
5. **E2E tests**: Run on staging (non-blocking, alert on failure)
6. **Production deploy**: Manual approval or auto-deploy with feature flags

**Quality Gates:**
- Bundle size increase > 50KB requires approval
- Test coverage drop > 5% requires approval
- New dependencies require security audit

**Release Cadence:**
- **Daily**: Bug fixes, small features (feature-flagged)
- **Weekly**: Feature releases (after beta period)
- **Monthly**: Major features, architecture changes

---

## Pragmatic Tradeoffs

### Skip Now, Add Later

**Skip:**
- E2E test suite (start with 3-5 critical paths)
- Visual regression testing (add after 6 months)
- Micro-frontends (premature optimization)
- Advanced caching strategies (TanStack Query default is enough)

**Add Later:**
- GraphQL (if REST becomes bottleneck)
- Service workers / offline support (if needed)
- Advanced analytics dashboard (start with basics)
- Component visual regression (after design system stabilizes)

### What We're Optimizing For

1. **Developer velocity**: Fast iteration, clear patterns
2. **Code quality**: Type safety, testing, accessibility
3. **Performance**: Good enough (sub-3s load, <100ms interactions)
4. **Maintainability**: Clear boundaries, minimal coupling

---

## Summary

This architecture prioritizes:
- **Feature modules** for parallel development
- **TanStack Query + Zustand** for predictable state
- **shadcn/ui + Tailwind** for consistent, accessible UI
- **TypeScript + ESLint** for safety and conventions
- **Progressive enhancement**: Start simple, add complexity when needed

The key to avoiding "big rewrite" traps is **strong boundaries** (feature modules), **shared conventions** (linting, patterns), and **incremental improvement** (feature flags, staged rollouts).
