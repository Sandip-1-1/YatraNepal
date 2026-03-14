Here is the complete analysis of your YatraNepal project.
YatraNepal (NepalTransit) - Full Architecture Audit & Implementation Plan
Current Stack
LayerTechnologyServerNode 20 + Express 4 (ESM)DatabasePostgreSQL + Drizzle ORMValidationZod (via drizzle-zod)ClientReact 18 + Vite 5 + TypeScriptMapreact-leaflet (Leaflet.js + OpenStreetMap)Data fetchingTanStack Query v5 (polling)StylingTailwind CSS 3 + shadcn/uiRoutingwouter

Schema (7 tables)
routes -> stops, buses -> bookings, users, traffic, notifications — all UUID PKs with proper foreign key relations in shared/schema.ts.
BUGS FOUND (Critical -> Low)
CRITICAL
#BugLocationImpact1Race condition in booking — reads occupiedSeats, adds 1 in JS, writes back. Two concurrent bookings lose one increment.server/storage.ts:175-188Double-bookings, seat count drift2Race condition in seat conflict check — TOCTOU: both requests pass the check before either inserts.server/routes.ts:215-251Same seat sold twice3Global error handler re-throws after responding — throw err after res.status().json() causes "headers already sent" / crashes.server/app.ts:79Server crash on any error4Zero authentication — getCurrentUser() returns first DB user. All endpoints are public. Passport/session deps are installed but never used.server/storage.ts:80-92No multi-user support, no security5MapBounds re-fits every 5s — stops filtered array creates new reference each poll cycle, triggering fitBounds and snapping the user's panned view back.MapView.tsx:75-92Map un-pannable in practice6ETA is Math.random() — produces a new 3-5 min value every render (every 5s).BusInfoCard.tsx:24-31Meaningless, flickering ETA

HIGH
#BugLocationImpact7Notification spam — every bus arrival creates a notification (9 buses x 5 stops, every few seconds). No dedup or TTL.server/routes.ts:56-65DB fills with thousands of rows8occupiedSeats monotonically increases — never decremented on cancellation or date expiry. Segment-aware booking but global capacity check.routes.ts:196, storage.ts:175-188Buses show "full" after enough bookings regardless of date9staleTime: Infinity on query client — data cached forever. Routes, traffic, user never refetch.client/src/lib/queryClient.ts:50Stale data throughout10Single pg.Client (not Pool) — all queries serialized through one connection.server/db.tsBottleneck under concurrent requests11.env with DB password committed to git.env line 1Credential exposure1225+ Google Fonts loaded, only Inter used — adds 2-5s to page load.index.html link tagMassive perf penalty

MEDIUM
#BugLocationImpact13Bus icon L.divIcon recreated every render for every marker — DOM thrashing.MapView.tsx:181Render perf14Calendar disables today (compares Date with time, not date-only).SeatBookingDialog.tsx:164Can't book same-day15No error boundary — any render throw = white screen.Entire appApp crash on error16Shadow CSS variables all 0.00 opacity — no visible shadows.client/src/index.cssFlat UI despite design specs17simulateBusMovement runs in-process — with horizontal scaling, multiple instances fight over the same rows.routes.ts:313Erratic bus positions18Seed script not idempotent — running twice duplicates all data.server/seed.tsData corruption19Stops not validated for same-route as the bus being booked.routes.ts:201-207Cross-route booking possible20"Track Bus" button just closes the card.BusInfoCard.tsx:128-135Misleading UX21TOAST_REMOVE_DELAY = 1000000 (17 min).use-toast.ts:9Toasts linger in DOM22Dark mode fully defined in CSS but no toggle exists.CSS + configUnused feature23Dead imports: isSameDay, X, useLocation, unused shadcn components (~35 of 50).Multiple filesBundle bloat24Notification settings endpoint is a no-op stub.routes.ts:293-300Settings lost on refresh

ARCHITECTURAL FLAWS SUMMARY
Edited
MEMORY.md
Key gaps for your three requested features:
Live Map — exists (Leaflet) but re-renders poorly, no WebSocket push, icons not memoized, bounds reset on poll
ETA Logic — completely absent (current impl is Math.random())
Booking Module — partially exists but has race conditions, no cancellation, drifting seat counts, no auth
STEP-BY-STEP IMPLEMENTATION PLAN
Phase 0: Fix Critical Bugs First (Foundation)
StepTaskWhy0.1Fix global error handler — remove throw err in app.ts:79Server crashes on every caught error0.2Switch pg.Client to pg.Pool in db.tsPrerequisite for any concurrent operation0.3Make seat booking atomic — wrap conflict check + insert in a DB transaction, use SET occupied_seats = occupied_seats + 1 (SQL atomic increment)Prevents double-bookings0.4Memoize MapBounds — use useMemo on the stops array or a stable JSON.stringify key so fitBounds only fires on actual data changeMap becomes usable0.5Memoize bus icons — cache L.divIcon instances by colorStops DOM thrashing0.6Add .env to .gitignore, rotate the exposed DB passwordSecurity0.7Remove the 25+ unused Google Fonts from index.html — keep only InterPerformance

Phase 1: WebSocket Infrastructure (Real-Time Foundation)
StepTaskDetails1.1Set up WebSocket server using the already-installed ws package on the existing HTTP serverAttach new WebSocketServer({ server: httpServer }) in routes.ts1.2Define message protocol{ type: "bus_update", data: Bus[] }, { type: "eta_update", data: { busId, stopId, etaMinutes }[] }, { type: "notification", data: Notification }1.3Broadcast bus positions from simulateBusMovement instead of relying on client pollingAfter updating DB, broadcast to all connected clients1.4Client WebSocket hook — create useWebSocket() hook that maintains connection and dispatches to React Query cacheReplace refetchInterval: 5000 with WS-pushed data via queryClient.setQueryData1.5Add heartbeat/reconnection — ping/pong every 30s, exponential backoff reconnect on clientResilience

Phase 2: Real ETA Logic System
StepTaskDetails2.1Compute ETA server-side using Haversine distance + current speedETA = distance_to_stop / current_speed. Already have calculateDistance() and bus.speed.2.2Add traffic-aware speed adjustmentIf a traffic point with congestionLevel: "heavy" is within 500m of the bus-to-stop path, multiply ETA by a factor (1.5x heavy, 1.2x medium).2.3Create GET /api/eta/:busId endpointReturns { busId, etas: [{ stopId, stopName, etaMinutes }] } for all upcoming stops2.4Broadcast ETA via WebSocketInclude ETA data in bus_update messages so the client has it without extra requests2.5Replace random ETA in BusInfoCardConsume the server-computed ETA from the WS data instead of Math.random()2.6Optional: historical averagingStore arrival_time at each stop, use rolling average to improve predictions over time. Add an eta_history table.

ETA formula:
For each upcoming stop on the bus's route:
  1. d = haversine(bus.lat, bus.lon, stop.lat, stop.lon)
  2. base_eta = d / bus.speed _ 60   (minutes)
  3. traffic_factor = max(factors for nearby traffic points)
  4. eta = base_eta _ traffic_factor + dwell_time_per_intermediate_stop

Phase 3: Live Map Improvements
StepTaskDetails3.1Smooth bus marker movement — use CSS transitions or leaflet-marker-motion to animate markers between positions instead of jumpingCurrently markers teleport every poll3.2Show route polylines always (not just when a route is selected)Fix MapView.tsx:122-127 — draw all route polylines with their colors3.3Add ETA labels to bus markersShow the ETA to next stop as a tooltip/label on each bus marker3.4Fix "Track Bus" button — make it center/follow the selected bus on the mapPan map to bus position and auto-follow on each WS update3.5Add bus direction indicator — rotate the bus icon SVG to face the direction of travelCalculate bearing from current position to next stop3.6Add loading skeleton for initial map data loadUse the existing but unused skeleton.tsx component3.7Add error boundary wrapping the map and the appGraceful degradation on errors

Phase 4: Booking Module Completion
StepTaskDetails4.1Implement authentication using the already-installed Passport + express-sessionLocal strategy with email/password, session stored in PG via connect-pg-simple4.2Add login/register pagesMinimal UI: email, password, name4.3Protect booking endpoints with auth middlewarereq.isAuthenticated() check4.4Add booking cancellation — PATCH /api/bookings/:id/cancelSet status: "cancelled", atomically decrement occupiedSeats4.5Fix capacity check to be segment-awareInstead of checking global occupiedSeats >= capacity, count active confirmed bookings whose segments overlap the requested segment4.6Add same-route validationVerify fromStop.routeId === toStop.routeId === bus.routeId4.7Fix calendar date comparisonUse startOfDay() from date-fns instead of raw new Date()4.8Add booking confirmation UI — loading state while mutation is in-flight, success/error feedbackCurrently closes dialog immediately4.9Add payment placeholder (optional)Even a mock confirmation step improves flow

Phase 5: Polish & Production Readiness
StepTaskDetails5.1Fix shadow CSS variables (restore opacity values)5.2Add dark mode toggle (deps already present)5.3Remove all dead imports and unused shadcn components5.4Add CORS, Helmet security headers, rate limiting5.5Add pagination to list endpoints5.6Make seed script idempotent (upsert or delete-before-insert)5.7Fix notification spam — rate-limit creation, add TTL/cleanup5.8Add React.StrictMode and error boundaries5.9Add Drizzle migrations (replace db:push)

Recommended Priority/Effort Matrix

Total estimated scope: ~11-13 days of focused development. Phase 0 should be done first as it fixes foundation-level bugs that all other phases depend on. Phases 1-3 can then be parallelized somewhat (WebSocket first since both ETA and live map depend on it).
Would you like me to start implementing any of these phases?
