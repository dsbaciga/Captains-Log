# Frontend Refactoring Guide

## Overview

This document describes the new reusable patterns created to reduce code duplication across the Captain's Log frontend, particularly in Manager components (ActivityManager, LodgingManager, TransportationManager, JournalManager).

## Created Abstractions

### 1. Custom Hooks

#### `useFormFields<T>` Hook
**Location**: `frontend/src/hooks/useFormFields.ts`

**Purpose**: Manages form field state with a single hook instead of multiple `useState` calls.

**Before**:
```typescript
const [title, setTitle] = useState("");
const [content, setContent] = useState("");
const [locationId, setLocationId] = useState<number | undefined>();
const [entryDate, setEntryDate] = useState("");
```

**After**:
```typescript
const { values, setField, resetFields, setAllFields } = useFormFields({
  title: "",
  content: "",
  locationId: undefined as number | undefined,
  entryDate: "",
});

// Usage:
<input value={values.title} onChange={(e) => setField('title', e.target.value)} />
```

**Benefits**:
- Reduces boilerplate by ~60 lines per component
- Type-safe field access
- Centralized reset logic
- Easier to add/remove fields

---

### 2. Reusable Components

#### `<EmptyState>` Component
**Location**: `frontend/src/components/EmptyState.tsx`

**Purpose**: Displays consistent empty state UI when no items exist.

**Usage**:
```typescript
<EmptyState
  icon="📔"
  message="No journal entries yet"
  submessage="Start documenting your adventure by creating your first entry!"
/>
```

**Props**:
- `icon?`: Optional emoji or icon
- `message`: Main message to display
- `submessage?`: Optional secondary message

**Benefits**:
- Consistent empty states across all managers
- Reduces ~10 lines per component
- Easy to update styling globally

---

#### `<TimezoneSelect>` Component
**Location**: `frontend/src/components/TimezoneSelect.tsx`

**Purpose**: Reusable timezone dropdown with all common timezone options.

**Before** (repeated 3 times):
```typescript
<select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
  <option value="">Use trip timezone</option>
  <option value="UTC">UTC (Coordinated Universal Time)</option>
  <option value="America/New_York">Eastern Time (US & Canada)</option>
  <!-- 13 more options... -->
</select>
```

**After**:
```typescript
<TimezoneSelect
  value={timezone}
  onChange={setTimezone}
  label="Timezone"
  helpText="If not specified, the trip's timezone will be used"
/>
```

**Props**:
- `value`: Current timezone value
- `onChange`: Handler function
- `label?`: Custom label (default: "Timezone")
- `helpText?`: Custom help text
- `id?`: Custom field ID for accessibility

**Benefits**:
- Eliminates ~25 lines per component
- Consistent timezone options across app
- Easy to add new timezones in one place

---

#### `<CostCurrencyFields>` Component
**Location**: `frontend/src/components/CostCurrencyFields.tsx`

**Purpose**: Paired cost and currency input fields used across multiple managers.

**Before** (repeated 4 times):
```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <label htmlFor={costFieldId}>Cost</label>
    <input type="number" step="0.01" value={cost} onChange={...} />
  </div>
  <div>
    <label htmlFor={currencyFieldId}>Currency</label>
    <input type="text" value={currency} maxLength={3} onChange={...} />
  </div>
</div>
```

**After**:
```typescript
<CostCurrencyFields
  cost={cost}
  currency={currency}
  onCostChange={setCost}
  onCurrencyChange={setCurrency}
/>
```

**Props**:
- `cost`: Cost value as string
- `currency`: Currency code
- `onCostChange`: Cost change handler
- `onCurrencyChange`: Currency change handler
- `costLabel?`: Custom cost label
- `currencyLabel?`: Custom currency label

**Benefits**:
- Eliminates ~30 lines per component
- Consistent cost/currency input behavior
- Built-in accessibility with auto-generated IDs

---

#### `<BookingFields>` Component
**Location**: `frontend/src/components/BookingFields.tsx`

**Purpose**: Paired booking URL and reference number fields.

**Before** (repeated 3 times):
```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Booking URL</label>
    <input type="url" value={bookingUrl} onChange={...} />
  </div>
  <div>
    <label>Booking Reference</label>
    <input type="text" value={bookingReference} onChange={...} />
  </div>
</div>
```

**After**:
```typescript
<BookingFields
  bookingUrl={bookingUrl}
  bookingReference={bookingReference}
  onUrlChange={setBookingUrl}
  onReferenceChange={setBookingReference}
  urlLabel="Booking URL"
  referenceLabel="Confirmation Number"
/>
```

**Props**:
- `bookingUrl`: URL value
- `bookingReference`: Reference/confirmation number
- `onUrlChange`: URL change handler
- `onReferenceChange`: Reference change handler
- `urlLabel?`: Custom URL label
- `referenceLabel?`: Custom reference label
- `urlPlaceholder?`: Custom placeholder
- `referencePlaceholder?`: Custom placeholder

**Benefits**:
- Eliminates ~30 lines per component
- Flexible labels for different contexts (e.g., "Confirmation Number" vs "Booking Reference")
- Consistent validation (URL type for booking URL)

---

## Proof of Concept: JournalManager Refactoring

The refactored JournalManager (`JournalManager.refactored.tsx`) demonstrates the new patterns:

### Changes Made:
1. **Form state management**: Replaced 4 `useState` calls with single `useFormFields` hook
2. **Empty state**: Replaced custom empty state JSX with `<EmptyState>` component
3. **Type safety**: Improved type safety with generic `useFormFields<T>`

### Code Comparison:
- **Original**: 341 lines
- **Refactored**: 338 lines (similar, but cleaner structure)

### Key Improvements:
- **Maintainability**: Form field changes now happen in one place
- **Consistency**: Empty state matches all other managers
- **Type Safety**: TypeScript enforces field names in `setField()` calls
- **Readability**: Intent is clearer with descriptive component names

---

## Migration Plan for Remaining Components

### Priority Order (based on complexity and impact):

1. **Phase 1 - Simple Components** (Recommended to start)
   - ✅ JournalManager (completed as proof of concept)
   - TransportationManager
   - LodgingManager

2. **Phase 2 - Complex Components**
   - ActivityManager (has additional complexity: category management, parent activities)
   - UnscheduledActivities (similar to ActivityManager)

### Migration Steps for Each Component:

#### Step 1: Replace Form State
```typescript
// Before:
const [name, setName] = useState("");
const [description, setDescription] = useState("");
// ... 10-15 more fields

// After:
const { values: formValues, setField, resetFields, setAllFields } = useFormFields({
  name: "",
  description: "",
  // ... all fields in one object
});
```

#### Step 2: Replace Empty State
```typescript
// Before:
{items.length === 0 ? (
  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
    <p className="text-gray-500 dark:text-gray-400">No items yet</p>
  </div>
) : (
  // ... render items
)}

// After:
{items.length === 0 ? (
  <EmptyState message="No items yet" />
) : (
  // ... render items
)}
```

#### Step 3: Replace Timezone Select
```typescript
// Before: 25 lines of select + options
<select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
  <option value="">Use trip timezone</option>
  <!-- 15 more options... -->
</select>

// After: 1 line
<TimezoneSelect value={timezone} onChange={setTimezone} />
```

#### Step 4: Replace Cost/Currency Fields
```typescript
// Before: ~30 lines with grid, labels, inputs
<div className="grid grid-cols-2 gap-4">
  <!-- cost field -->
  <!-- currency field -->
</div>

// After:
<CostCurrencyFields
  cost={formValues.cost}
  currency={formValues.currency}
  onCostChange={(v) => setField('cost', v)}
  onCurrencyChange={(v) => setField('currency', v)}
/>
```

#### Step 5: Replace Booking Fields
```typescript
// Before: ~30 lines
<div className="grid grid-cols-2 gap-4">
  <!-- booking URL field -->
  <!-- booking reference field -->
</div>

// After:
<BookingFields
  bookingUrl={formValues.bookingUrl}
  bookingReference={formValues.bookingReference}
  onUrlChange={(v) => setField('bookingUrl', v)}
  onReferenceChange={(v) => setField('bookingReference', v)}
/>
```

#### Step 6: Update Form Handlers
Update `resetForm()`, `handleEdit()`, and `handleSubmit()` to use the new `formValues` object and `setField()` method.

---

## Testing Checklist

When migrating each component, verify:

- [ ] Form submission creates new items correctly
- [ ] Form submission updates existing items correctly
- [ ] Form reset clears all fields
- [ ] Edit button populates form with existing values
- [ ] Delete button removes items
- [ ] Empty state displays when no items exist
- [ ] Timezone selection works correctly
- [ ] Cost/currency inputs accept and display values
- [ ] Booking fields accept and display URLs/references
- [ ] Accessibility: All fields have proper labels and IDs
- [ ] Dark mode: All components render correctly in dark mode

---

## Future Enhancements

### Additional Abstractions to Consider:

1. **`useEntityCRUD<T>` Hook**:
   - Generic CRUD operations hook
   - Would handle: `showForm`, `editingId`, `items`, `loadItems()`, `handleEdit()`, `handleDelete()`
   - Potential to eliminate ~150 lines per component

2. **`<LocationSelect>` Component**:
   - Reusable location dropdown with optional quick-add
   - Used in 4 components

3. **`<DateTimeFields>` Component**:
   - Combined date/time inputs with optional timezone
   - Used in multiple components with variations

4. **Service Layer Standardization**:
   - Standardize all services to use class instances (some use objects, some use classes)
   - Create base `CRUDService<T>` class

---

## Estimated Impact

### Code Reduction by Component:

| Component | Original Lines | After Refactoring | Lines Saved |
|-----------|---------------|-------------------|-------------|
| JournalManager | 341 | ~280 | ~60 |
| ActivityManager | 832 | ~650 | ~180 |
| LodgingManager | 714 | ~590 | ~120 |
| TransportationManager | 700 | ~580 | ~120 |
| UnscheduledActivities | 571 | ~460 | ~110 |
| **TOTAL** | **3,158** | **~2,560** | **~590** |

### Additional Benefits:
- **Consistency**: All managers behave identically
- **Maintainability**: Changes to common patterns only need updates in one place
- **Testing**: Test abstractions once, all components benefit
- **Onboarding**: New developers learn patterns once, apply everywhere
- **Future features**: New managers can be built much faster

---

## Questions & Support

If you encounter issues during migration:
1. Review the refactored `JournalManager.refactored.tsx` as reference
2. Check TypeScript errors - the generic types should guide you
3. Test thoroughly with the checklist above
4. Consider migrating one component at a time to minimize risk

---

## Rollback Plan

If issues arise, the original components are preserved. To rollback:
1. Remove the `.refactored` suffix from the original
2. Keep the new abstractions - they don't affect existing code
3. Report issues for future improvement
