// Gitea 实例类型枚举
export enum GiteaInstanceType {
  OFFICIAL = 'official',    // Gitea.com 官方实例
  SELFHOSTED = 'selfhosted' // 自建实例
}

// Gitea 实例配置
export interface GiteaInstanceConfig {
  name: string;
  baseUrl: string;
  description: string;
}

// 预定义的 Gitea 实例配置
export const GITEA_INSTANCES: Record<GiteaInstanceType, GiteaInstanceConfig> = {
  [GiteaInstanceType.OFFICIAL]: {
    name: 'Gitea.com',
    baseUrl: 'https://gitea.com',
    description: '官方 Gitea 托管服务'
  },
  [GiteaInstanceType.SELFHOSTED]: {
    name: '自建实例',
    baseUrl: '',
    description: '用户自定义的 Gitea 实例'
  }
};

// Gitea API 响应类型定义
export interface GiteaUser {
  id: number;
  login: string;
  full_name: string;
  email: string;
  avatar_url: string;
  username: string;
}

export interface GiteaRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  fork: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GiteaFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
  content?: string; // base64 编码的文件内容
  encoding?: string;
  target?: string; // 对于符号链接
}

export interface GiteaCommit {
  sha: string;
  url: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
  }>;
}

export interface GiteaFileCommit {
  sha: string;
  commit: GiteaCommit;
}

// API 请求参数类型
export interface GiteaUploadFileParams {
  message: string;
  content: string; // base64 编码
  branch?: string;
  sha?: string; // 用于更新现有文件
  author?: {
    name: string;
    email: string;
  };
  committer?: {
    name: string;
    email: string;
  };
}

export interface GiteaDeleteFileParams {
  message: string;
  sha: string;
  branch?: string;
  author?: {
    name: string;
    email: string;
  };
  committer?: {
    name: string;
    email: string;
  };
}

// API 响应类型
export interface GiteaApiResponse<T = any> {
  data?: T;
  message?: string;
  status: number;
}

export interface GiteaFileResponse {
  content: GiteaFile;
  commit: GiteaCommit;
}

// 错误类型
export interface GiteaApiError {
  message: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
  documentation_url?: string;
}
