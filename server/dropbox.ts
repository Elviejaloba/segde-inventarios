const DROPBOX_FOLDER_PATH = '/Muestreos';

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  sharedLink?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

// Cache for file list to avoid repeated API calls
let cachedFileList: DropboxFile[] | null = null;
let fileListCacheTime: number = 0;
const FILE_LIST_CACHE_DURATION = 60000; // 1 minute cache

async function refreshAccessToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!refreshToken || !appKey || !appSecret) {
    throw new Error('DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, and DROPBOX_APP_SECRET are required for token refresh');
  }

  console.log('Refreshing Dropbox access token...');
  
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  
  console.log('Dropbox access token refreshed successfully');
  return cachedAccessToken as string;
}

async function getAccessToken(): Promise<string> {
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    if (!cachedAccessToken || Date.now() >= tokenExpiresAt) {
      return refreshAccessToken();
    }
    return cachedAccessToken;
  }
  
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('DROPBOX_ACCESS_TOKEN or DROPBOX_REFRESH_TOKEN not configured');
  }
  return accessToken;
}

export async function uploadFile(
  fileName: string,
  fileBuffer: Buffer,
  sucursal?: string
): Promise<DropboxFile> {
  const accessToken = await getAccessToken();
  
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sucursalPrefix = sucursal ? `[${sucursal}]_` : '';
  const dropboxPath = `${DROPBOX_FOLDER_PATH}/${sucursalPrefix}${timestamp}_${sanitizedFileName}`;

  const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: dropboxPath,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();

  const sharedLink = await createSharedLink(uploadResult.path_display);

  return {
    id: uploadResult.id,
    name: uploadResult.name,
    path: uploadResult.path_display,
    size: uploadResult.size,
    modified: uploadResult.server_modified,
    sharedLink,
  };
}

async function createSharedLink(path: string): Promise<string> {
  const accessToken = await getAccessToken();

  const existingResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, direct_only: true }),
  });

  if (existingResponse.ok) {
    const existingData = await existingResponse.json();
    if (existingData.links && existingData.links.length > 0) {
      return existingData.links[0].url.replace('?dl=0', '?raw=1');
    }
  }

  const createResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      settings: {
        requested_visibility: 'public',
        audience: 'public',
        access: 'viewer',
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error('Failed to create shared link:', error);
    return '';
  }

  const linkData = await createResponse.json();
  return linkData.url.replace('?dl=0', '?raw=1');
}

export async function listFiles(): Promise<DropboxFile[]> {
  // Return cached list if still valid
  if (cachedFileList && Date.now() - fileListCacheTime < FILE_LIST_CACHE_DURATION) {
    return cachedFileList;
  }

  const accessToken = await getAccessToken();

  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: DROPBOX_FOLDER_PATH,
      recursive: false,
      include_media_info: false,
      include_deleted: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (error.includes('path/not_found')) {
      return [];
    }
    throw new Error(`Failed to list files: ${error}`);
  }

  const data = await response.json();
  const files: DropboxFile[] = [];

  // Process files without blocking on shared links (faster initial load)
  for (const entry of data.entries) {
    if (entry['.tag'] === 'file') {
      files.push({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        size: entry.size,
        modified: entry.server_modified,
      });
    }
  }

  files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  // Cache the result
  cachedFileList = files;
  fileListCacheTime = Date.now();

  return files;
}

// Pre-initialize token on server start
export async function initializeDropbox(): Promise<void> {
  try {
    if (process.env.DROPBOX_REFRESH_TOKEN) {
      console.log('Pre-initializing Dropbox token...');
      await getAccessToken();
      console.log('Dropbox token ready');
    }
  } catch (error) {
    console.error('Failed to pre-initialize Dropbox:', error);
  }
}

// Invalidate cache when files are uploaded
export function invalidateFileCache(): void {
  cachedFileList = null;
  fileListCacheTime = 0;
}

export async function getFileLink(path: string): Promise<string> {
  return createSharedLink(path);
}
