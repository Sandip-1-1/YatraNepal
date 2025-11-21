# Design Guidelines: Nepal Public Transport Tracker

## Design Approach

**System**: Material Design principles adapted for transit applications
**References**: Google Maps (mapping UI), Transit App (real-time tracking), Uber (clean booking flow)
**Core Principles**: Mobile-first, information clarity, real-time visibility, accessibility for varying network conditions

## Typography

**Font Stack**: 
- Primary: Inter (via Google Fonts) - clean, legible for mobile
- Headings: 600-700 weight
- Body: 400-500 weight
- Data/Numbers: 500-600 weight (for ETAs, seat numbers)

**Hierarchy**:
- Page Headers: text-2xl to text-3xl
- Section Titles: text-lg to text-xl  
- Bus/Route Labels: text-base font-semibold
- ETA/Status: text-sm to text-base font-medium
- Secondary Info: text-sm
- Micro-labels: text-xs

## Layout System

**Spacing Units**: Tailwind 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Map margins: m-4
- Card gaps: gap-4

**Container Strategy**:
- Full-width map view with overlay controls
- Content max-w-7xl for desktop, full-width mobile
- Bottom sheets/cards overlay map on mobile

## Component Library

### Navigation
- **Top Bar**: Fixed position with route selector dropdown, notification bell icon, user profile
- **Bottom Navigation** (Mobile): 4 tabs - Map, Routes, Bookings, Profile
- Glass-morphism effect for overlays on map

### Map Interface
- **Full-screen Interactive Map**: Primary view using Leaflet.js
- **Bus Markers**: Custom icons showing bus direction, color-coded by route
- **User Location**: Pulsing blue dot
- **Stop Markers**: Small circular pins, expandable on tap
- **Traffic Overlay**: Color-coded route segments (green/yellow/red)
- **Route Lines**: Dashed lines connecting stops, color per route

### Real-time Data Cards
- **Bus Info Card**: Floating bottom sheet showing selected bus details
  - Bus number (large, prominent)
  - Current location text
  - ETA to next stop (bold, color-coded: green <5min, yellow 5-10min, orange >10min)
  - Seat availability indicator
  - "Track" and "Book" action buttons

### Route Selection
- **Route Dropdown**: Top bar selector with route name + color indicator
- **Route Detail Panel**: Slide-in panel with:
  - All stops listed vertically
  - Current bus positions inline
  - ETAs per stop
  - Toggle for notifications

### Booking Module
- **Seat Grid Layout**: Visual seat map
  - Available: outlined squares
  - Booked: filled gray
  - Selected: filled primary color
  - Touch-friendly sizing (min 44x44px)
- **Booking Summary Card**: Sticky bottom with route, seat, price, "Confirm" button
- **Confirmation Modal**: Full-screen overlay with booking details and QR code placeholder

### Notification Center
- **Notification List**: Grouped by route
- **Notification Item**: Route badge, message, timestamp, dismiss icon
- **Toggle Controls**: Per-route notification switches

### Status Indicators
- **Live Badge**: Small pulsing dot + "LIVE" text for real-time tracking
- **Traffic Pills**: Small rounded badges showing congestion (icon + text)
- **Seat Availability**: Progress bar or fraction (12/40 available)

### Buttons
- **Primary Actions**: Rounded-lg, medium size, solid fill
- **Secondary Actions**: Outlined style
- **Icon Buttons**: Circular, 40x40px minimum
- **Floating Action Button**: Bottom-right for quick "Book Now"

### Cards & Containers
- **Elevated Cards**: shadow-md, rounded-xl
- **Info Panels**: bg-white/90 backdrop-blur for overlay
- **List Items**: Divided with subtle borders, tap-active states

## Map-Specific Design

**Controls**:
- Zoom +/- buttons (top-right)
- Current location button (bottom-right, above FAB)
- Layer toggle for traffic overlay (top-left)

**Overlays**:
- Bottom sheet pulls up to 50% height for bus details
- Can swipe to expand to 80% for full route info
- Dismissible with down-swipe or backdrop tap

## Mobile Optimization

- Touch targets: minimum 44x44px
- Swipeable cards and panels
- Bottom-heavy layout (important actions within thumb reach)
- Collapsible sections to reduce scroll
- Skeleton screens for loading states

## Images

**Hero Section**: None - this is a utility app that loads directly to the map view
**Icons**: Heroicons for UI elements, custom SVG for bus/stop markers
**Illustrations**: Optional empty states (no active buses, no bookings yet) - simple line art style

## Data Visualization

- **ETA Display**: Large numerals with "min" label, icon showing walking/bus
- **Traffic Indicators**: Color-coded segments on map + legend
- **Seat Availability**: Visual grid + numerical count
- **Route Timeline**: Vertical line connecting stops with progress indicator

## Responsive Behavior

**Mobile (< 768px)**:
- Full-screen map
- Bottom navigation
- Bottom sheets for details
- Single-column layouts

**Tablet/Desktop (≥ 768px)**:
- Map takes 60-70% width
- Side panel (30-40%) for route/booking details
- Top navigation bar
- Multi-column booking grid