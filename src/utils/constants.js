// Bhopal map constants
export const BHOPAL_CENTER = [23.2599, 77.4126]
export const BHOPAL_BOUNDS = [
  [22.9, 76.9],  // SW corner
  [23.7, 77.9],  // NE corner
]
export const MAP_MIN_ZOOM = 10
export const MAP_MAX_ZOOM = 18
export const MAP_DEFAULT_ZOOM = 12

// Report categories
export const REPORT_CATEGORIES = [
  { id: 'garbage',   label: 'Garbage',   color: '#84cc16', emoji: '🗑️' },
  { id: 'traffic',   label: 'Traffic',   color: '#f59e0b', emoji: '🚦' },
  { id: 'pollution', label: 'Pollution', color: '#8b5cf6', emoji: '💨' },
  { id: 'water',     label: 'Water',     color: '#3b82f6', emoji: '💧' },
  { id: 'road',      label: 'Road',      color: '#ef4444', emoji: '🛣️' },
  { id: 'other',     label: 'Other',     color: '#94a3b8', emoji: '📌' },
]

// Bhopal wards (simplified — used for zone selection)
export const BHOPAL_WARDS = [
  'Ward 1 - Shyamla Hills', 'Ward 2 - Arera Colony', 'Ward 3 - New Market',
  'Ward 4 - Habibganj', 'Ward 5 - Bhopal Junction', 'Ward 6 - Piplani',
  'Ward 7 - Govindpura', 'Ward 8 - Berasia Road', 'Ward 9 - Kolar Road',
  'Ward 10 - Bairagarh', 'Ward 11 - Misrod', 'Ward 12 - Ayodhya Bypass',
  'Ward 13 - Indrapuri', 'Ward 14 - TT Nagar', 'Ward 15 - Shahpura',
  'Ward 16 - Awadhpuri', 'Ward 17 - Oriental Institute of Science and Technology'
]

// Gamification point values
export const POINTS = {
  REPORT_SUBMITTED: 10,
  REPORT_VERIFIED: 25,
  ECO_ROUTE_SAVED: 15,
  CHAT_MESSAGE: 2,
  AI_TURN: 1,
  DAILY_ACTIVITY: 5,
}

// User levels
export const LEVELS = [
  { name: 'Beginner',     minPoints: 0,    icon: '🌱', color: 'text-slate-400' },
  { name: 'Contributor',  minPoints: 50,   icon: '⭐', color: 'text-blue-400' },
  { name: 'Active Citizen', minPoints: 150, icon: '🔥', color: 'text-orange-400' },
  { name: 'City Hero',    minPoints: 500,  icon: '🦸', color: 'text-purple-400' },
  { name: 'Legend',       minPoints: 1000, icon: '👑', color: 'text-amber-400' },
]

export function getUserLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return { ...LEVELS[i], index: i }
  }
  return { ...LEVELS[0], index: 0 }
}

export function getLevelProgress(points) {
  const current = getUserLevel(points)
  const nextLevel = LEVELS[current.index + 1]
  if (!nextLevel) return 100
  const range = nextLevel.minPoints - current.minPoints
  const progress = points - current.minPoints
  return Math.min(100, Math.round((progress / range) * 100))
}

// Badge definitions
export const BADGE_DEFINITIONS = {
  first_responder: {
    label: 'First Responder',
    description: 'Submitted your first city report',
    icon: '🚨',
    color: 'text-red-400',
  },
  eco_hero: {
    label: 'Eco Hero',
    description: 'Saved 5 eco-friendly routes',
    icon: '🌿',
    color: 'text-green-400',
  },
  chatterbox: {
    label: 'Chatterbox',
    description: 'Sent 20 community messages',
    icon: '💬',
    color: 'text-blue-400',
  },
  top_10: {
    label: 'Top 10',
    description: 'Reached the leaderboard top 10',
    icon: '🏆',
    color: 'text-amber-400',
  },
  verified_reporter: {
    label: 'Verified Reporter',
    description: 'Had 5 reports verified',
    icon: '✅',
    color: 'text-teal-400',
  },
}

// Nav items
export const NAV_ITEMS = [
  { path: '/',           label: 'Dashboard',  icon: 'LayoutDashboard' },
  { path: '/map',        label: 'City Map',   icon: 'Map' },
  { path: '/chat',       label: 'Community',  icon: 'MessageSquare' },
  { path: '/nexora',     label: 'Nexora AI',  icon: 'Bot' },
  { path: '/analytics',  label: 'Analytics',  icon: 'BarChart2' },
  { path: '/eco-route',  label: 'Eco Route',  icon: 'Leaf' },
  { path: '/leaderboard',label: 'Leaderboard',icon: 'Trophy' },
  { path: '/profile',    label: 'Profile',    icon: 'User' },
]

// Weather API
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=23.26&longitude=77.41&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,precipitation_sum&timezone=Asia/Kolkata&forecast_days=3'
