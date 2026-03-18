# TapasOS Enhancement Plan

## Phase 1 — Core OS DNA

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **Spotlight Search** (Cmd+K / Alt+K) | Done | 4 categories: Apps, Quick Actions, Terminal Commands, Content. Fuzzy match, highlight, keyboard nav, badges. Platform-aware shortcuts. |
| 2 | **Keyboard Shortcuts** | Partial | Cmd/Alt+W close, Cmd/Alt+M minimize, Cmd/Alt+K spotlight, / spotlight, Esc close. Still need: Cmd+Q, Cmd+Tab. |
| 3 | **Window Snapping** | Pending | Drag to left/right edge → 50% split. Top → maximize. Double-click titlebar → maximize/restore. |
| 4 | **Dock Magnification** | Pending | macOS hover magnification + bounce animation on app launch. |
| 5 | **Lock Screen** | Pending | Triggers after inactivity (not on load). Slide to unlock. Wallpaper blur + clock. Inactivity timeout configurable in Settings.app. |
| 6 | **Desktop Wallpapers** | Pending | Customizable + dynamic (shift with time of day). Right-click desktop → Change Wallpaper. |
| 7 | **Sound Effects** | Partial | Boot chime done (Web Audio API, E major 4-note). Still need: notification ping, window sounds, toggle in Settings. |

## Phase 2 — System Apps

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 8 | **Finder.app** | Pending | Virtual FS: ~/Desktop, ~/Documents, ~/Projects. YAML data as files. Sidebar nav. |
| 9 | **Settings.app** | Pending | Theme, wallpaper picker, dock position, sound toggle, font size, lock screen timeout, about this Mac. |
| 10 | **Notes.app** | Pending | Rich text notes in localStorage. Create/edit/delete. Sidebar + editor. |
| 11 | **Photos.app** | Pending | Gallery of project screenshots + award images. Lightbox. Grid layout. |
| 12 | **Calendar.app** | Pending | Availability, key dates, experience timeline as events. |
| 13 | **Control Center** | Pending | Menubar dropdown — quick toggles: theme, sound, wallpaper, cosmetic Wi-Fi/Bluetooth. |

## Phase 3 — Power User Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 14 | **Mission Control** | Pending | Hotkey/gesture → zoomed-out view of all windows. Click to focus. |
| 15 | **Notification Center** | Pending | Slide-in panel from right. History grouped by app. |
| 16 | **Desktop Widgets** | Pending | Clock, weather API, GitHub streak, mini calendar on desktop. |
| 17 | **Multi-Desktop** | Pending | Multiple workspaces. Swipe between. Move windows across desktops. |
| 18 | **Drag & Drop** | Pending | Files between Finder windows, text into Notes, images into Photos. |
| 19 | **App Store** | Pending | Easter egg — browse projects as "apps", "install" to dock. |

## Execution Order
1 → 5 → 4 → 6 → 3 → 2 → 7 → 13 → 9 → 8 → 10 → 14 → 15 → rest

## Design Decisions
- Lock screen: inactivity-triggered (NOT on page load), slide to unlock, timeout configurable in Settings.app
- Platform-aware shortcuts: Cmd on Mac, Alt on Windows/Linux (avoids Ctrl+W/K/M browser conflicts)
- `/` key opens Spotlight universally (no modifier needed)
- Settings.app is the central hub for all OS preferences (theme, wallpaper, sound, dock, lock timeout)
- All settings persist in localStorage
