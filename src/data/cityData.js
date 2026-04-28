// ============================================================
// Static City Datasets — Bhopal Smart City
// ============================================================

export const PARKING_SPOTS = [
  { id: 'p1',  name: 'DB Mall Parking',       lat: 23.2332, lng: 77.4345, capacity: 450, type: 'commercial',  area: 'MP Nagar' },
  { id: 'p2',  name: 'New Market Parking',     lat: 23.2614, lng: 77.4146, capacity: 200, type: 'commercial',  area: 'New Market' },
  { id: 'p3',  name: 'Habibganj Station',      lat: 23.2298, lng: 77.4382, capacity: 300, type: 'transit',     area: 'Habibganj' },
  { id: 'p4',  name: 'MP Nagar Zone-I',        lat: 23.2284, lng: 77.4330, capacity: 180, type: 'commercial',  area: 'MP Nagar' },
  { id: 'p5',  name: 'MP Nagar Zone-II',       lat: 23.2274, lng: 77.4395, capacity: 220, type: 'commercial',  area: 'MP Nagar' },
  { id: 'p6',  name: 'ISBT Bus Terminal',      lat: 23.2690, lng: 77.4125, capacity: 150, type: 'transit',     area: 'ISBT' },
  { id: 'p7',  name: 'Arera Colony Market',    lat: 23.2270, lng: 77.4250, capacity: 120, type: 'residential', area: 'Arera Colony' },
  { id: 'p8',  name: 'TT Nagar Stadium',       lat: 23.2419, lng: 77.4098, capacity: 500, type: 'public',      area: 'TT Nagar' },
  { id: 'p9',  name: 'Bhopal Junction',        lat: 23.2659, lng: 77.4126, capacity: 350, type: 'transit',     area: 'Old Bhopal' },
  { id: 'p10', name: 'Shahpura Market',        lat: 23.2107, lng: 77.4437, capacity: 100, type: 'commercial',  area: 'Shahpura' },
  { id: 'p11', name: 'Bittan Market',          lat: 23.2554, lng: 77.4021, capacity: 90,  type: 'commercial',  area: 'Bittan Market' },
  { id: 'p12', name: 'Board Office',           lat: 23.2427, lng: 77.4219, capacity: 160, type: 'government',  area: 'Shyamla Hills' },
  { id: 'p13', name: 'BHEL Complex',           lat: 23.2577, lng: 77.4654, capacity: 400, type: 'industrial',  area: 'Piplani' },
  { id: 'p14', name: 'Kolar Square',           lat: 23.1718, lng: 77.4168, capacity: 130, type: 'commercial',  area: 'Kolar' },
  { id: 'p15', name: 'Bairagarh Station',      lat: 23.2840, lng: 77.3863, capacity: 200, type: 'transit',     area: 'Bairagarh' },
]

// Occupancy patterns by parking type (index = hour 0–23, value = base occupancy 0–1)
export const OCCUPANCY_PATTERNS = {
  commercial:  [0.08, 0.06, 0.05, 0.05, 0.06, 0.12, 0.22, 0.45, 0.72, 0.88, 0.92, 0.95, 0.90, 0.85, 0.80, 0.85, 0.92, 0.95, 0.82, 0.65, 0.45, 0.28, 0.18, 0.12],
  transit:     [0.12, 0.08, 0.06, 0.06, 0.10, 0.28, 0.55, 0.82, 0.90, 0.68, 0.48, 0.38, 0.38, 0.42, 0.48, 0.52, 0.68, 0.85, 0.88, 0.65, 0.42, 0.28, 0.18, 0.14],
  residential: [0.72, 0.78, 0.82, 0.82, 0.75, 0.58, 0.38, 0.18, 0.12, 0.10, 0.10, 0.12, 0.18, 0.18, 0.15, 0.18, 0.28, 0.48, 0.58, 0.68, 0.75, 0.80, 0.80, 0.75],
  public:      [0.05, 0.04, 0.04, 0.04, 0.05, 0.08, 0.15, 0.28, 0.42, 0.58, 0.68, 0.72, 0.68, 0.62, 0.58, 0.52, 0.58, 0.68, 0.72, 0.48, 0.28, 0.15, 0.08, 0.05],
  government:  [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.18, 0.48, 0.82, 0.92, 0.92, 0.88, 0.72, 0.82, 0.88, 0.92, 0.78, 0.55, 0.28, 0.12, 0.08, 0.05, 0.04, 0.04],
  industrial:  [0.04, 0.04, 0.04, 0.04, 0.05, 0.12, 0.38, 0.68, 0.85, 0.90, 0.90, 0.88, 0.78, 0.82, 0.88, 0.88, 0.72, 0.42, 0.18, 0.08, 0.05, 0.04, 0.04, 0.04],
}

export const WASTE_BINS = [
  { id: 'w1',  name: 'New Market Bin A',       lat: 23.2620, lng: 77.4155, capacity: 100 },
  { id: 'w2',  name: 'Arera Colony Bin',       lat: 23.2275, lng: 77.4240, capacity: 80 },
  { id: 'w3',  name: 'MP Nagar Bin',           lat: 23.2290, lng: 77.4350, capacity: 120 },
  { id: 'w4',  name: 'TT Nagar Bin',           lat: 23.2425, lng: 77.4105, capacity: 90 },
  { id: 'w5',  name: 'Shahpura Bin',           lat: 23.2115, lng: 77.4430, capacity: 70 },
  { id: 'w6',  name: 'Habibganj Bin',          lat: 23.2305, lng: 77.4370, capacity: 100 },
  { id: 'w7',  name: 'Bittan Market Bin',      lat: 23.2560, lng: 77.4030, capacity: 60 },
  { id: 'w8',  name: 'Kolar Bin A',            lat: 23.1725, lng: 77.4175, capacity: 80 },
  { id: 'w9',  name: 'BHEL Bin',               lat: 23.2585, lng: 77.4640, capacity: 110 },
  { id: 'w10', name: 'Old Bhopal Bin',         lat: 23.2650, lng: 77.4135, capacity: 90 },
  { id: 'w11', name: 'Bairagarh Bin',          lat: 23.2835, lng: 77.3870, capacity: 75 },
  { id: 'w12', name: 'Indrapuri Bin',          lat: 23.2480, lng: 77.3950, capacity: 85 },
  { id: 'w13', name: 'Govindpura Bin',         lat: 23.2660, lng: 77.4560, capacity: 95 },
  { id: 'w14', name: 'Piplani Bin',            lat: 23.2520, lng: 77.4680, capacity: 70 },
  { id: 'w15', name: 'Shyamla Hills Bin',      lat: 23.2435, lng: 77.4215, capacity: 65 },
  { id: 'w16', name: 'ISBT Bin',               lat: 23.2685, lng: 77.4130, capacity: 100 },
  { id: 'w17', name: 'Board Office Bin',       lat: 23.2430, lng: 77.4225, capacity: 55 },
  { id: 'w18', name: 'Ayodhya Bypass Bin',     lat: 23.2150, lng: 77.4550, capacity: 80 },
]

export const ENERGY_ZONES = [
  { id: 'ez1', name: 'MP Nagar Commercial',  baseLoad: 85,  polygon: [[23.222, 77.425], [23.238, 77.425], [23.238, 77.445], [23.222, 77.445]] },
  { id: 'ez2', name: 'Old Bhopal',           baseLoad: 55,  polygon: [[23.258, 77.400], [23.275, 77.400], [23.275, 77.420], [23.258, 77.420]] },
  { id: 'ez3', name: 'BHEL Industrial',      baseLoad: 120, polygon: [[23.248, 77.455], [23.268, 77.455], [23.268, 77.478], [23.248, 77.478]] },
  { id: 'ez4', name: 'Kolar Residential',    baseLoad: 40,  polygon: [[23.162, 77.408], [23.182, 77.408], [23.182, 77.428], [23.162, 77.428]] },
  { id: 'ez5', name: 'Arera Colony',         baseLoad: 50,  polygon: [[23.218, 77.415], [23.235, 77.415], [23.235, 77.430], [23.218, 77.430]] },
  { id: 'ez6', name: 'TT Nagar Govt Zone',   baseLoad: 65,  polygon: [[23.235, 77.400], [23.250, 77.400], [23.250, 77.418], [23.235, 77.418]] },
]

// OSRM route endpoints for real road geometry
export const TRAFFIC_ROUTE_ENDPOINTS = [
  { id: 'r1', name: 'Hoshangabad Rd',      start: [77.4126, 23.2599], end: [77.4300, 23.2400] },
  { id: 'r2', name: 'Link Rd 1',           start: [77.4126, 23.2599], end: [77.3950, 23.2750] },
  { id: 'r3', name: 'VIP Rd',              start: [77.4126, 23.2599], end: [77.3900, 23.2450] },
  { id: 'r4', name: 'Kolar Rd',            start: [77.4200, 23.2500], end: [77.4000, 23.2350] },
  { id: 'r5', name: 'Berasia Rd',          start: [77.4126, 23.2599], end: [77.4050, 23.2850] },
  { id: 'r6', name: 'Raisen Rd',           start: [77.4345, 23.2332], end: [77.4600, 23.2500] },
]
