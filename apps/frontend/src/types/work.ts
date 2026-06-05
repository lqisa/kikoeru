/**
 * Work/Media-related types
 */

export type RatingDetail = {
  review_point: number;
  count: number;
  ratio: number;
};

export type Circle = {
  id: number;
  name: string;
};

export type Tag = {
  id: number;
  name: string;
};

export type VoiceActor = {
  id: number;
  name: string;
};

export type WorkMetadata = {
  id: number;
  title: string;
  circle: Circle;
  release: string;
  rate_average_2dp: number;
  rate_count: number;
  rate_count_detail?: RatingDetail[];
  review_count: number;
  price: number;
  dl_count: number;
  nsfw: boolean;
  tags: Tag[];
  vas: VoiceActor[];
  userRating?: number;
  root_folder?: string;
  dir?: string;
  cover_url_fallback?: string;
  rank?: string;
  progress?: 'marked' | 'listening' | 'listened' | 'replay' | 'postponed' | null;
  userReviewText?: string;
  updated_at?: string;
  review_text?: string;
};

export type TreeItem = {
  type: 'file' | 'folder' | 'audio' | 'text' | 'image' | 'other';
  title: string;
  path?: string;
  hash?: string;
  children?: TreeItem[];
  workTitle?: string;
  workDir?: string;
  rootFolder?: string;
  mediaStreamUrl?: string;
  mediaDownloadUrl?: string;
};

export type SortOption = {
  label: string;
  value: string;
};

export type FilterOption = {
  label: string;
  value: 'marked' | 'listening' | 'listened' | 'replay' | 'postponed' | null;
};

export type PaginationInfo = {
  currentPage: number;
  pageSize: number;
  totalCount: number;
};
