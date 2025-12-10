const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_FOLDER_PATH = '/INMOVILIZADOS/Muestreos';

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  sharedLink?: string;
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('DROPBOX_REFRESH_TOKEN not configured');
  }

  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: DROPBOX_APP_KEY!,
      client_secret: DROPBOX_APP_SECRET!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Dropbox token: ${error}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return cachedAccessToken!;
}

export async function uploadFile(
  fileName: string,
  fileBuffer: Buffer,
  sucursal?: string
): Promise<DropboxFile> {
  const accessToken = await getAccessToken();
  
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderPath = sucursal 
    ? `${DROPBOX_FOLDER_PATH}/${sucursal}`
    : DROPBOX_FOLDER_PATH;
  const dropboxPath = `${folderPath}/${timestamp}_${sanitizedFileName}`;

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

export async function listFiles(sucursal?: string): Promise<DropboxFile[]> {
  const accessToken = await getAccessToken();
  
  const folderPath = sucursal 
    ? `${DROPBOX_FOLDER_PATH}/${sucursal}`
    : DROPBOX_FOLDER_PATH;

  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: folderPath,
      recursive: !sucursal,
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

  return files;
}

export async function getFileLink(path: string): Promise<string> {
  return createSharedLink(path);
}

export function generateAuthUrl(): string {
  const state = Math.random().toString(36).substring(7);
  const redirectUri = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/dropbox/callback`
    : 'http://localhost:5000/api/dropbox/callback';
    
  return `https://www.dropbox.com/oauth2/authorize?` +
    `client_id=${DROPBOX_APP_KEY}&` +
    `response_type=code&` +
    `token_access_type=offline&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const redirectUri = process.env.REPL_SLUG 
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/dropbox/callback`
    : 'http://localhost:5000/api/dropbox/callback';

  const response = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY!,
      client_secret: DROPBOX_APP_SECRET!,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return data.refresh_token;
}
