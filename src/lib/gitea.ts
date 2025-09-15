import { fetch } from '@tauri-apps/plugin-http';
import { 
  GiteaInstanceType, 
  GITEA_INSTANCES,
  GiteaUser, 
  GiteaRepository, 
  GiteaFile, 
  GiteaFileCommit,
  GiteaUploadFileParams,
  GiteaDeleteFileParams,
  GiteaFileResponse,
  GiteaApiError
} from './gitea.types';
import { RepoNames, SyncStateEnum } from './github.types';

// 获取API基础URL
function getApiBaseUrl(instanceType: GiteaInstanceType, customUrl?: string): string {
  if (instanceType === GiteaInstanceType.SELFHOSTED && customUrl) {
    return `${customUrl.replace(/\/$/, '')}/api/v1`;
  }
  return `${GITEA_INSTANCES[instanceType].baseUrl}/api/v1`;
}

// 创建请求头
function createHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `token ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// 处理API响应
async function handleApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData: GiteaApiError = JSON.parse(text);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response');
  }
}

// 获取用户信息
export async function getGiteaUserInfo(
  token: string, 
  instanceType: GiteaInstanceType, 
  customUrl?: string
): Promise<GiteaUser> {
  const baseUrl = getApiBaseUrl(instanceType, customUrl);
  const headers = createHeaders(token);
  
  const response = await fetch(`${baseUrl}/user`, {
    method: 'GET',
    headers
  });
  
  return handleApiResponse<GiteaUser>(response);
}

// 检查同步仓库状态
export async function checkGiteaSyncRepoState(
  token: string,
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ state: SyncStateEnum; repo?: GiteaRepository }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const response = await fetch(`${baseUrl}/user/repos?q=${RepoNames.sync}&limit=1`, {
      method: 'GET',
      headers
    });
    
    const repos = await handleApiResponse<GiteaRepository[]>(response);
    const syncRepo = repos.find(repo => repo.name === RepoNames.sync);
    
    if (syncRepo) {
      return { state: SyncStateEnum.success, repo: syncRepo };
    }
    
    return { state: SyncStateEnum.fail };
  } catch (error) {
    console.error('检查Gitea仓库状态失败:', error);
    return { state: SyncStateEnum.fail };
  }
}

// 创建同步仓库
export async function createGiteaSyncRepo(
  token: string,
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ success: boolean; repo?: GiteaRepository; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const response = await fetch(`${baseUrl}/user/repos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: RepoNames.sync,
        description: 'NoteGen 同步仓库',
        private: true,
        auto_init: true
      })
    });
    
    const repo = await handleApiResponse<GiteaRepository>(response);
    return { success: true, repo };
  } catch (error) {
    console.error('创建Gitea仓库失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 上传文件
export async function uploadGiteaFile(
  token: string,
  filePath: string,
  content: string,
  message: string,
  instanceType: GiteaInstanceType,
  customUrl?: string,
  sha?: string
): Promise<{ success: boolean; file?: GiteaFile; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const params: GiteaUploadFileParams = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 to base64
      branch: 'main'
    };
    
    const response = await fetch(
      `${baseUrl}/repos/{owner}/${RepoNames.sync}/contents/${encodeURIComponent(filePath)}`.replace('{owner}', 'user'),
      {
        method: sha ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(params)
      }
    );
    
    const result = await handleApiResponse<GiteaFileResponse>(response);
    return { success: true, file: result.content };
  } catch (error) {
    console.error('上传Gitea文件失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 获取文件列表
export async function getGiteaFiles(
  token: string,
  path: string = '',
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ success: boolean; files?: GiteaFile[]; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const encodedPath = path ? encodeURIComponent(path) : '';
    const response = await fetch(
      `${baseUrl}/repos/{owner}/${RepoNames.sync}/contents/${encodedPath}`.replace('{owner}', 'user'),
      {
        method: 'GET',
        headers
      }
    );
    
    const files = await handleApiResponse<GiteaFile[]>(response);
    return { success: true, files };
  } catch (error) {
    console.error('获取Gitea文件列表失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 获取特定commit的文件内容
export async function getGiteaFileContent(
  token: string,
  filePath: string,
  commitSha: string,
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const response = await fetch(
      `${baseUrl}/repos/{owner}/${RepoNames.sync}/contents/${encodeURIComponent(filePath)}?ref=${commitSha}`.replace('{owner}', 'user'),
      {
        method: 'GET',
        headers
      }
    );
    
    const file = await handleApiResponse<GiteaFile>(response);
    
    if (file.content) {
      // 解码base64内容
      const content = decodeURIComponent(escape(atob(file.content)));
      return { success: true, content };
    }
    
    return { success: false, error: '文件内容为空' };
  } catch (error) {
    console.error('获取Gitea文件内容失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 删除文件
export async function deleteGiteaFile(
  token: string,
  filePath: string,
  sha: string,
  message: string,
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const params: GiteaDeleteFileParams = {
      message,
      sha,
      branch: 'main'
    };
    
    const response = await fetch(
      `${baseUrl}/repos/{owner}/${RepoNames.sync}/contents/${encodeURIComponent(filePath)}`.replace('{owner}', 'user'),
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify(params)
      }
    );
    
    await handleApiResponse(response);
    return { success: true };
  } catch (error) {
    console.error('删除Gitea文件失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

// 获取文件提交历史
export async function getGiteaFileCommits(
  token: string,
  filePath: string,
  instanceType: GiteaInstanceType,
  customUrl?: string
): Promise<{ success: boolean; commits?: GiteaFileCommit[]; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl(instanceType, customUrl);
    const headers = createHeaders(token);
    
    const response = await fetch(
      `${baseUrl}/repos/{owner}/${RepoNames.sync}/commits?path=${encodeURIComponent(filePath)}&limit=50`.replace('{owner}', 'user'),
      {
        method: 'GET',
        headers
      }
    );
    
    const commits = await handleApiResponse<GiteaFileCommit[]>(response);
    return { success: true, commits };
  } catch (error) {
    console.error('获取Gitea文件提交历史失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
