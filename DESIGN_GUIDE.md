# GitDaddy Design System & Pattern Guide

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Navigation Patterns](#navigation-patterns)
7. [User Flow](#user-flow)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Code Patterns](#code-patterns)

---

## Design Philosophy

### Core Principles

1. **GitHub-Inspired**: Clean, professional, minimal design inspired by GitHub's interface
2. **Functional First**: Every element serves a purpose, no decorative clutter
3. **Responsive by Default**: Mobile-first approach, works on all devices
4. **Accessible**: WCAG AA compliant, keyboard navigable, screen reader friendly
5. **Consistent**: Predictable patterns across all pages and components

### Visual Language

- **Clean Lines**: No gradients, no heavy shadows, no pixel art
- **Subtle Depth**: Use borders and light shadows for hierarchy
- **Whitespace**: Generous spacing for breathing room
- **Hierarchy**: Clear visual hierarchy through size, weight, and color
- **Feedback**: Immediate visual feedback for all interactions

---

## Color System

### Primary Colors

```css
/* Primary - Used for links, primary actions, active states */
--color-primary: #0969da;
--color-primary-hover: #0860ca;
--color-primary-light: #ddf4ff;

/* Success - Used for positive actions, create buttons */
--color-success: #1f883d;
--color-success-hover: #1a7f37;
--color-success-light: #dafbe1;

/* Danger - Used for destructive actions, errors */
--color-danger: #d1242f;
--color-danger-hover: #c11f2a;
--color-danger-light: #ffebe9;

/* Warning - Used for warnings, cautions */
--color-warning: #bf8700;
--color-warning-light: #fff8c5;
```

### Neutral Colors

```css
/* Text Colors */
--color-text-primary: #24292f;    /* Main text */
--color-text-secondary: #57606a;  /* Muted text, labels */
--color-text-tertiary: #6e7781;   /* Disabled text */

/* Background Colors */
--color-bg-primary: #ffffff;      /* Cards, panels */
--color-bg-secondary: #f6f8fa;    /* Page background */
--color-bg-tertiary: #eaeef2;     /* Subtle backgrounds */

/* Border Colors */
--color-border-primary: #d0d7de;  /* Main borders */
--color-border-secondary: #d8dee4; /* Subtle borders */
--color-border-muted: #eaeef2;    /* Very subtle borders */
```

### Usage Guidelines

**Primary Blue (`#0969da`)**
- Links and hypertext
- Primary action buttons
- Active navigation items
- Selected states
- Focus indicators

**Success Green (`#1f883d`)**
- Create/Add buttons
- Success messages
- Positive indicators
- Merge/Approve actions

**Danger Red (`#d1242f`)**
- Delete buttons
- Error messages
- Destructive actions
- Critical warnings

**Neutral Gray**
- Text content
- Borders and dividers
- Backgrounds
- Disabled states

### Color Contrast

All color combinations meet WCAG AA standards:
- Text on white: 4.5:1 minimum
- Large text on white: 3:1 minimum
- Interactive elements: Clear focus indicators

---

## Typography

### Font Families

```css
/* Sans-serif - Primary font for UI */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", 
             Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

/* Monospace - For code and technical content */
font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, 
             "Liberation Mono", monospace;
```

### Type Scale

```css
/* Headings */
--text-4xl: 2.25rem;  /* 36px - Page titles */
--text-3xl: 1.875rem; /* 30px - Section titles */
--text-2xl: 1.5rem;   /* 24px - Card titles */
--text-xl: 1.25rem;   /* 20px - Subsection titles */
--text-lg: 1.125rem;  /* 18px - Large body */

/* Body */
--text-base: 1rem;    /* 16px - Default body */
--text-sm: 0.875rem;  /* 14px - Small text, labels */
--text-xs: 0.75rem;   /* 12px - Captions, badges */
```

### Font Weights

```css
--font-normal: 400;   /* Regular text */
--font-medium: 500;   /* Emphasized text */
--font-semibold: 600; /* Headings, buttons */
--font-bold: 700;     /* Strong emphasis */
```

### Line Heights

```css
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Long-form content */
```

### Usage Guidelines

**Headings**
- Use semantic HTML (`h1`, `h2`, `h3`)
- One `h1` per page
- Maintain hierarchy (don't skip levels)
- Use `font-semibold` or `font-bold`

**Body Text**
- Default: `text-sm` (14px) for UI elements
- Use `text-base` (16px) for long-form content
- Line height: `leading-normal` (1.5)

**Code**
- Use monospace font
- Background: `bg-[#f6f8fa]`
- Border: `border-[#d0d7de]`
- Padding: `px-2 py-1` for inline, `p-4` for blocks

---

## Spacing & Layout

### Spacing Scale

Based on 4px grid system:

```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Layout Patterns

**Container Widths**
```css
--container-sm: 640px;   /* Small content */
--container-md: 768px;   /* Medium content */
--container-lg: 1024px;  /* Large content */
--container-xl: 1280px;  /* Extra large content */
--container-2xl: 1536px; /* Maximum width */
```

**Common Layouts**

1. **Full Width with Sidebar**
```jsx
<div className="flex min-h-screen">
  <Sidebar className="w-64" />
  <main className="flex-1 px-4 py-6 lg:px-8">
    {/* Content */}
  </main>
</div>
```

2. **Centered Content**
```jsx
<div className="mx-auto max-w-[1280px] px-4 py-6">
  {/* Content */}
</div>
```

3. **Two Column**
```jsx
<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <main>{/* Main content */}</main>
  <aside>{/* Sidebar content */}</aside>
</div>
```

4. **Three Column**
```jsx
<div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
  <aside>{/* Left sidebar */}</aside>
  <main>{/* Main content */}</main>
  <aside>{/* Right sidebar */}</aside>
</div>
```

### Spacing Guidelines

**Component Spacing**
- Between sections: `gap-6` (24px)
- Between cards: `gap-4` (16px)
- Inside cards: `p-4` (16px)
- Between form fields: `gap-3` (12px)

**Text Spacing**
- Paragraph spacing: `mt-4` (16px)
- List item spacing: `gap-2` (8px)
- Heading to content: `mt-3` (12px)

---

## Components

### Buttons

**Primary Button**
```jsx
<button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:opacity-60 disabled:cursor-not-allowed">
  <Icon icon={Add01Icon} size={16} />
  Create
</button>
```

**Secondary Button**
```jsx
<button className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]">
  <Icon icon={Settings01Icon} size={16} />
  Settings
</button>
```

**Danger Button**
```jsx
<button className="inline-flex h-8 items-center rounded-md border border-[#d1242f] bg-white px-3 text-sm font-medium text-[#d1242f] hover:bg-[#d1242f] hover:text-white">
  Delete
</button>
```

**Icon Button**
```jsx
<button className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-[#f6f8fa]" aria-label="Menu">
  <Icon icon={MoreVerticalIcon} size={18} />
</button>
```

**Button Sizes**
- Small: `h-7` (28px)
- Default: `h-8` (32px)
- Medium: `h-9` (36px)
- Large: `h-10` (40px)

**Button States**
- Default: Base styles
- Hover: Darker background
- Active: Even darker background
- Disabled: `opacity-60 cursor-not-allowed`
- Focus: `focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2`

### Form Inputs

**Text Input**
```jsx
<input 
  className="h-9 rounded-md border border-[#d0d7de] bg-white px-3 text-sm outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
  placeholder="Enter text..."
/>
```

**Select**
```jsx
<select className="h-9 rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

**Textarea**
```jsx
<textarea className="min-h-24 rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
```

**Form Layout**
```jsx
<form className="grid gap-4">
  <div className="grid gap-2">
    <label className="text-sm font-medium">Label</label>
    <input className="..." />
    <p className="text-xs text-[#57606a]">Helper text</p>
  </div>
</form>
```

### Panels & Cards

**Basic Panel**
```jsx
<div className="rounded-md border border-[#d0d7de] bg-white p-4">
  {/* Content */}
</div>
```

**Panel with Header**
```jsx
<div className="rounded-md border border-[#d0d7de] bg-white overflow-hidden">
  <div className="border-b border-[#d0d7de] px-4 py-3">
    <h3 className="text-sm font-semibold">Title</h3>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

**List Panel**
```jsx
<div className="rounded-md border border-[#d0d7de] bg-white overflow-hidden">
  <div className="divide-y divide-[#d0d7de]">
    {items.map(item => (
      <div key={item.id} className="px-4 py-3 hover:bg-[#f6f8fa]">
        {/* Item content */}
      </div>
    ))}
  </div>
</div>
```

### Navigation

**Top Navigation**
```jsx
<header className="sticky top-0 z-30 border-b border-[#d0d7de] bg-white">
  <div className="flex h-16 items-center justify-between px-4 lg:px-6">
    <div className="flex items-center gap-4">
      {/* Logo and primary nav */}
    </div>
    <div className="flex items-center gap-2">
      {/* Actions and user menu */}
    </div>
  </div>
</header>
```

**Sidebar Navigation**
```jsx
<aside className="w-64 border-r border-[#d0d7de] bg-white">
  <nav className="p-4">
    <div className="grid gap-1">
      {/* Navigation items */}
    </div>
  </nav>
</aside>
```

**Tabs**
```jsx
<div className="border-b border-[#d0d7de]">
  <div className="flex gap-2">
    <button className="flex h-12 items-center gap-2 border-b-2 border-[#fd8c73] px-4 text-sm font-medium text-[#24292f]">
      Active Tab
    </button>
    <button className="flex h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-[#57606a] hover:border-[#d0d7de]">
      Inactive Tab
    </button>
  </div>
</div>
```

### Badges & Labels

**Badge**
```jsx
<span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-medium text-[#0969da]">
  Badge
</span>
```

**Status Badge**
```jsx
<span className="inline-flex items-center gap-1 rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-medium">
  <span className="h-2 w-2 rounded-full bg-[#1f883d]" />
  Active
</span>
```

### Icons

**Icon Sizes**
- Extra small: `size={14}`
- Small: `size={16}`
- Medium: `size={18}`
- Large: `size={20}`
- Extra large: `size={24}`

**Icon Usage**
```jsx
import { Icon } from "./Icon";
import { GitBranchIcon } from "@hugeicons/core-free-icons";

<Icon icon={GitBranchIcon} size={16} className="text-[#57606a]" />
```

### Messages & Alerts

**Info Message**
```jsx
<div className="rounded-md border border-[#0969da] bg-[#ddf4ff] px-4 py-3 text-sm text-[#0969da]">
  Information message
</div>
```

**Success Message**
```jsx
<div className="rounded-md border border-[#1f883d] bg-[#dafbe1] px-4 py-3 text-sm text-[#1f883d]">
  Success message
</div>
```

**Error Message**
```jsx
<div className="rounded-md border border-[#d1242f] bg-[#ffebe9] px-4 py-3 text-sm text-[#d1242f]">
  Error message
</div>
```

---

## Navigation Patterns

### URL Structure

```
/ → Landing page
/auth → Authentication (login/signup)
/dashboard → User dashboard
/[username] → User profile
/[username]/[repo] → Repository view
```

### Navigation Flow

```
Landing (/)
  ├─→ Auth (/auth)
  │     └─→ Dashboard (/dashboard)
  │           ├─→ User Profile (/[username])
  │           │     └─→ Repository (/[username]/[repo])
  │           └─→ Repository (/[username]/[repo])
  └─→ Dashboard (/dashboard) [if authenticated]
```

### Link Patterns

**Internal Navigation**
```jsx
import Link from "next/link";

<Link href="/dashboard" className="text-[#0969da] hover:underline">
  Dashboard
</Link>
```

**External Links**
```jsx
<a 
  href="https://github.com" 
  target="_blank" 
  rel="noopener noreferrer"
  className="text-[#0969da] hover:underline"
>
  GitHub
</a>
```

**Repository Links**
```jsx
<Link href={`/${username}/${repoName}`}>
  {username} / {repoName}
</Link>
```

### Breadcrumbs

```jsx
<nav className="flex items-center gap-2 text-sm">
  <Link href={`/${username}`} className="text-[#0969da] hover:underline">
    {username}
  </Link>
  <span className="text-[#57606a]">/</span>
  <Link href={`/${username}/${repo}`} className="text-[#0969da] hover:underline">
    {repo}
  </Link>
  {path && (
    <>
      <span className="text-[#57606a]">/</span>
      <span className="text-[#24292f]">{path}</span>
    </>
  )}
</nav>
```

---

## User Flow

### Authentication Flow

```
1. User visits landing page (/)
   ├─→ Not authenticated: Show landing page
   └─→ Authenticated: Redirect to /dashboard

2. User clicks "Get started" or "Sign in"
   └─→ Navigate to /auth

3. User fills login/signup form
   ├─→ Success: Store token, redirect to /dashboard
   └─→ Error: Show error message

4. User logs out
   └─→ Clear token, redirect to /
```

### Repository Creation Flow

```
1. User on dashboard (/dashboard)
2. User fills "Create repository" form
3. Submit form
   ├─→ Success: Create repo, navigate to /[username]/[repo]
   └─→ Error: Show error message
```

### Repository Navigation Flow

```
1. User clicks repository link
   └─→ Navigate to /[username]/[repo]

2. Repository page loads
   ├─→ Fetch repository data
   ├─→ Fetch branches
   ├─→ Fetch commits
   ├─→ Fetch file tree
   └─→ Display repository view

3. User switches tabs
   └─→ Update active tab, show relevant content

4. User navigates file tree
   ├─→ Click folder: Update path, fetch new tree
   └─→ Click file: Show file preview
```

### User Profile Flow

```
1. User clicks username or avatar
   └─→ Navigate to /[username]

2. Profile page loads
   ├─→ Show user info
   ├─→ List repositories
   └─→ Show stats

3. User clicks repository
   └─→ Navigate to /[username]/[repo]
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Responsive Patterns

**Hide/Show Elements**
```jsx
{/* Hide on mobile, show on desktop */}
<div className="hidden lg:block">Desktop only</div>

{/* Show on mobile, hide on desktop */}
<div className="lg:hidden">Mobile only</div>

{/* Different content for different sizes */}
<span className="hidden sm:inline">Full text</span>
<span className="sm:hidden">Short</span>
```

**Responsive Grid**
```jsx
{/* Stack on mobile, 2 columns on tablet, 3 on desktop */}
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Items */}
</div>
```

**Responsive Sidebar**
```jsx
{/* Hidden on mobile, visible on desktop */}
<aside className="hidden lg:block lg:w-64">
  {/* Sidebar content */}
</aside>
```

**Responsive Spacing**
```jsx
{/* Smaller padding on mobile, larger on desktop */}
<div className="px-4 py-6 lg:px-8 lg:py-10">
  {/* Content */}
</div>
```

### Mobile Considerations

1. **Touch Targets**: Minimum 32px (h-8) for all interactive elements
2. **Text Size**: Minimum 14px (text-sm) for body text
3. **Spacing**: Adequate spacing between interactive elements
4. **Navigation**: Simplified navigation on mobile
5. **Forms**: Stack form fields vertically
6. **Tables**: Horizontal scroll or card layout

---

## Accessibility

### Keyboard Navigation

**Focus Indicators**
```jsx
<button className="focus:ring-2 focus:ring-[#0969da] focus:ring-offset-2">
  Button
</button>
```

**Tab Order**
- Logical tab order (top to bottom, left to right)
- Skip links for main content
- No keyboard traps

### ARIA Labels

**Icon Buttons**
```jsx
<button aria-label="Close dialog">
  <Icon icon={Cancel01Icon} size={16} />
</button>
```

**Navigation**
```jsx
<nav aria-label="Main navigation">
  {/* Nav items */}
</nav>
```

**Landmarks**
```jsx
<header>...</header>
<main>...</main>
<aside aria-label="Sidebar">...</aside>
<footer>...</footer>
```

### Screen Readers

**Hidden Text**
```jsx
<span className="sr-only">Screen reader only text</span>
```

**Alt Text**
```jsx
<img src="..." alt="Descriptive alt text" />
```

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- Interactive elements: Clear visual indicators

---

## Code Patterns

### Component Structure

```jsx
"use client";

import { Icon } from "./Icon";
import { SomeIcon } from "@hugeicons/core-free-icons";

export function ComponentName({ prop1, prop2 }) {
  // State
  const [state, setState] = useState(initialValue);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Handlers
  const handleAction = () => {
    // Handler logic
  };

  // Render
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
}

// Sub-components
function SubComponent({ prop }) {
  return <div>{/* Sub-component JSX */}</div>;
}
```

### State Management Pattern

```jsx
// Custom hook for global state
export function useGitDaddy() {
  const [state, setState] = useState(initialState);

  const action = async (params) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await api.call(params);
      setState(prev => ({ ...prev, data: result, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error, loading: false }));
    }
  };

  return { ...state, action };
}
```

### API Call Pattern

```jsx
async function fetchData(token, params) {
  const response = await fetch(`${API_URL}/endpoint`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('API call failed');
  }

  return response.json();
}
```

### Error Handling Pattern

```jsx
try {
  const result = await action();
  setMessage(`Success: ${result.message}`);
} catch (error) {
  setMessage(`Error: ${error.message}`);
} finally {
  setLoading(false);
}
```

### Conditional Rendering Pattern

```jsx
{/* Loading state */}
{loading && <LoadingSpinner />}

{/* Error state */}
{error && <ErrorMessage error={error} />}

{/* Empty state */}
{!loading && !error && items.length === 0 && <EmptyState />}

{/* Success state */}
{!loading && !error && items.length > 0 && (
  <ItemList items={items} />
)}
```

### List Rendering Pattern

```jsx
<div className="divide-y divide-[#d0d7de]">
  {items.map((item) => (
    <div key={item.id} className="px-4 py-3">
      {/* Item content */}
    </div>
  ))}
</div>
```

---

## Best Practices

### Do's ✅

1. **Use semantic HTML**: `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`
2. **Provide alt text**: For all images and icons
3. **Use proper headings**: Maintain heading hierarchy
4. **Add ARIA labels**: For icon-only buttons
5. **Include focus states**: For all interactive elements
6. **Test keyboard navigation**: Ensure all features are keyboard accessible
7. **Use consistent spacing**: Follow the 4px grid system
8. **Maintain color contrast**: Meet WCAG AA standards
9. **Provide loading states**: Show feedback during async operations
10. **Handle errors gracefully**: Show clear error messages

### Don'ts ❌

1. **Don't use gradients**: Keep backgrounds solid
2. **Don't use heavy shadows**: Use subtle borders instead
3. **Don't skip heading levels**: Maintain proper hierarchy
4. **Don't use color alone**: Provide additional indicators
5. **Don't create keyboard traps**: Ensure all modals are escapable
6. **Don't use tiny text**: Minimum 14px for body text
7. **Don't use small touch targets**: Minimum 32px for mobile
8. **Don't ignore loading states**: Always show feedback
9. **Don't use generic error messages**: Be specific
10. **Don't forget mobile**: Test on actual devices

---

## Quick Reference

### Common Class Combinations

**Button**
```
inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]
```

**Input**
```
h-9 rounded-md border border-[#d0d7de] bg-white px-3 text-sm outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20
```

**Panel**
```
rounded-md border border-[#d0d7de] bg-white p-4
```

**Link**
```
text-[#0969da] hover:underline
```

**Badge**
```
rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-medium text-[#0969da]
```

---

This design guide should be used as the single source of truth for all UI development in GitDaddy. When in doubt, refer to this guide or look at existing components for patterns.
