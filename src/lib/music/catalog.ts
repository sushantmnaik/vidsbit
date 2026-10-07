export interface OnlineTrack {
  id: string;
  title: string;
  creator: string;
  mood: string;
  genre: string;
  language: string;
  duration: number;
  license: string;
  url: string;
  sponsored?: boolean;
  category: string;
}

export const ONLINE_MUSIC_CATALOG: OnlineTrack[] = [
  {
    id: "cc0-1",
    title: "Enlightenment",
    creator: "Kevin MacLeod",
    mood: "Calm",
    genre: "Ambient",
    language: "Instrumental",
    duration: 232,
    license: "CC BY 3.0",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Enlightenment.mp3",
    category: "Background",
  },
  {
    id: "cc0-2",
    title: "Carefree",
    creator: "Kevin MacLeod",
    mood: "Bright",
    genre: "Acoustic",
    language: "Instrumental",
    duration: 204,
    license: "CC BY 3.0",
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3",
    category: "Tutorial",
  },
];

export function filterOnlineTracks(
  tracks: OnlineTrack[],
  query: {
    keyword: string;
    mood: string;
    genre: string;
    language: string;
    category: string;
    maxDuration?: number;
  },
): OnlineTrack[] {
  const keyword = query.keyword.trim().toLowerCase();
  return tracks.filter((track) => {
    if (keyword && !`${track.title} ${track.creator}`.toLowerCase().includes(keyword)) {
      return false;
    }
    if (query.mood !== "Any" && track.mood !== query.mood) {
      return false;
    }
    if (query.genre !== "Any" && track.genre !== query.genre) {
      return false;
    }
    if (query.language !== "Any" && track.language !== query.language) {
      return false;
    }
    if (query.category !== "Any" && track.category !== query.category) {
      return false;
    }
    if (query.maxDuration && track.duration > query.maxDuration) {
      return false;
    }
    return true;
  });
}
