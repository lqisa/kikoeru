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

export type RootFolder = {
  name: string;
  path: string;
};

export type AdminConfig = {
  rootFolders: RootFolder[];
  rewindSeekTime?: number;
  forwardSeekTime?: number;
};

export type AdminConfigResponse = {
  config: AdminConfig;
};

export type SharedConfig = {
  rewindSeekTime: number;
  forwardSeekTime: number;
};

export type SharedConfigResponse = {
  sharedConfig: SharedConfig;
};

export type VersionResponse = {
  update_available: boolean;
  notifyUser: boolean;
  lockFileExists: boolean;
  lockReason: string;
};

export type RandomResponse = {
  id: number;
};

export type AuthMeResponse = {
  user: { name: string; group: string };
  auth: boolean;
};

export type UserInfo = {
  name: string;
  group: string;
};

export type UsersResponse = {
  users: UserInfo[];
};

export type ReviewSubmitResponse = {
  message: string;
};

export type BrowseDirItem = {
  name: string;
  path: string;
};

export type BrowseResponse = {
  currentPath: string;
  dirs: BrowseDirItem[];
};

export type BrowseFileItem = {
  name: string;
  path: string;
};

export type BrowseFilesResponse = {
  currentPath: string;
  dirs: BrowseFileItem[];
  files: BrowseFileItem[];
};

export type SetCoverRequest = {
  imagePath: string;
};

export type SetCoverResponse = {
  message: string;
};