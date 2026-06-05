import type { PaginationInfo, WorkMetadata } from './work';

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
};

export type ApiError = {
  error: string;
};

export type WorksQueryParams = {
  page?: number;
  order?: string;
  sort?: 'asc' | 'desc';
  seed?: number;
};

export type SearchQueryParams = {
  keyword?: string;
  page?: number;
  order?: string;
  sort?: 'asc' | 'desc';
  seed?: number;
};

export type ReviewQueryParams = {
  page?: number;
  order?: string;
  sort?: 'asc' | 'desc';
  seed?: number;
  filter?: 'marked' | 'listening' | 'listened' | 'replay' | 'postponed';
};

export type CoverQueryParams = {
  type?: 'main' | 'sam' | '240x240' | '360x360';
};

export type AuthResponse = {
  token: string;
  user: {
    name: string;
    group: string;
  };
};

export type AuthRequest = {
  name: string;
  password: string;
};

export type HealthResponse = {
  status: string;
  version?: string;
};

export type WorksResponse = {
  works: WorkMetadata[];
  pagination: PaginationInfo;
};

export type WorkResponse = WorkMetadata;

export type UserReview = {
  work_id: number;
  rating?: number;
  review_text?: string;
  progress?: 'marked' | 'listening' | 'listened' | 'replay' | 'postponed' | null;
};

export type CircleResponse = { id: number; name: string };
export type TagResponse = { id: number; name: string };
export type VoiceActorResponse = { id: number; name: string };
