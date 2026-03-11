export type StatKey = "kd" | "apm" | "winRate" | "headshot" | "clutch" | "mvp";

export type PlayerStats = Record<StatKey, number>;
export type PlayerTrends = Record<StatKey, number[]>;

export interface Player {
  id: string;
  codename: string;
  realName: string;
  role: string;
  country: string;
  age: number;
  bio: string;
  image: string;
  stats: PlayerStats;
  trends: PlayerTrends;
}

export const statConfig: Array<{
  key: StatKey;
  label: string;
  unit: string;
  max: number;
  step: number;
  weight: number;
}> = [
  { key: "kd", label: "K / D", unit: "", max: 2.5, step: 0.01, weight: 22 },
  { key: "apm", label: "APM", unit: "", max: 420, step: 1, weight: 18 },
  { key: "winRate", label: "Win Rate", unit: "%", max: 100, step: 1, weight: 20 },
  { key: "headshot", label: "Headshot", unit: "%", max: 100, step: 1, weight: 16 },
  { key: "clutch", label: "Clutch", unit: "%", max: 100, step: 1, weight: 12 },
  { key: "mvp", label: "MVP Impact", unit: "%", max: 100, step: 1, weight: 12 },
];

const normalizeStat = (key: StatKey, value: number) => {
  if (key === "kd") return Math.min(value / 2.5, 1);
  if (key === "apm") return Math.min(value / 420, 1);
  return Math.min(value / 100, 1);
};

export const calculateRating = (stats: PlayerStats) => {
  const weighted = statConfig.reduce((sum, stat) => sum + normalizeStat(stat.key, stats[stat.key]) * stat.weight, 0);
  return Math.round(weighted);
};

export const initialPlayers = (images: Record<string, string>): Player[] => [
  {
    id: "nyx",
    codename: "NYX",
    realName: "Aron Petrov",
    role: "Entry Fragger",
    country: "Serbia",
    age: 22,
    bio: "Opens rounds with surgical pace and raw confidence. High duel volume, low hesitation.",
    image: images.nyx,
    stats: { kd: 1.31, apm: 352, winRate: 69, headshot: 63, clutch: 58, mvp: 72 },
    trends: {
      kd: [1.02, 1.08, 1.11, 1.16, 1.2, 1.25, 1.31],
      apm: [298, 306, 314, 327, 338, 344, 352],
      winRate: [55, 58, 60, 63, 65, 67, 69],
      headshot: [50, 52, 55, 57, 59, 61, 63],
      clutch: [42, 45, 47, 50, 53, 55, 58],
      mvp: [48, 53, 57, 61, 64, 68, 72],
    },
  },
  {
    id: "rift",
    codename: "RIFT",
    realName: "Darren Lee",
    role: "IGL",
    country: "Singapore",
    age: 24,
    bio: "Directs tempo shifts and macro calls. Turns unstable maps into controlled territory.",
    image: images.rift,
    stats: { kd: 1.18, apm: 331, winRate: 73, headshot: 47, clutch: 67, mvp: 64 },
    trends: {
      kd: [0.98, 1.01, 1.06, 1.1, 1.13, 1.16, 1.18],
      apm: [275, 285, 292, 306, 315, 323, 331],
      winRate: [57, 60, 62, 66, 69, 71, 73],
      headshot: [39, 40, 42, 44, 45, 46, 47],
      clutch: [48, 52, 55, 58, 61, 64, 67],
      mvp: [45, 49, 53, 56, 59, 61, 64],
    },
  },
  {
    id: "volt",
    codename: "VOLT",
    realName: "Marco Vidal",
    role: "AWPer",
    country: "Spain",
    age: 21,
    bio: "Long-angle enforcer with elite first-blood conversion and sharp retake timings.",
    image: images.volt,
    stats: { kd: 1.35, apm: 304, winRate: 66, headshot: 59, clutch: 54, mvp: 70 },
    trends: {
      kd: [1.04, 1.09, 1.13, 1.18, 1.22, 1.29, 1.35],
      apm: [258, 266, 273, 281, 289, 297, 304],
      winRate: [52, 56, 58, 60, 62, 64, 66],
      headshot: [44, 47, 50, 52, 54, 57, 59],
      clutch: [39, 42, 45, 48, 50, 52, 54],
      mvp: [51, 55, 58, 61, 64, 67, 70],
    },
  },
  {
    id: "aero",
    codename: "AERO",
    realName: "Luka Novak",
    role: "Support",
    country: "Croatia",
    age: 23,
    bio: "Utility architect and anchor specialist. Keeps round structure stable under pressure.",
    image: images.aero,
    stats: { kd: 1.11, apm: 346, winRate: 71, headshot: 41, clutch: 63, mvp: 60 },
    trends: {
      kd: [0.94, 0.98, 1.01, 1.04, 1.07, 1.09, 1.11],
      apm: [294, 301, 311, 322, 329, 338, 346],
      winRate: [56, 59, 61, 64, 67, 69, 71],
      headshot: [32, 34, 35, 37, 38, 40, 41],
      clutch: [47, 51, 54, 56, 59, 61, 63],
      mvp: [40, 45, 49, 52, 55, 58, 60],
    },
  },
];
