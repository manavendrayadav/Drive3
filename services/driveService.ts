// Type definitions for Google API globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Cache for folder paths to reduce API calls during batch operations
const folderCache: Record<string, string> = {};

// Helper to wait for scripts to load asynchronously
const waitForScript = (globalKey: string, timeout = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
        if ((window as any)[globalKey]) {
            resolve();
            return;
        }
        
        const startTime = Date.now();
        const interval = setInterval(() => {
            if ((window as any)[globalKey]) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error(`Timeout: ${globalKey} script not loaded. Check your internet connection or ad blockers.`));
            }
        }, 100);
    });
};

export const initGapi = async () => {
  await waitForScript('gapi');
  
  return new Promise<void>((resolve, reject) => {
      window.gapi.load('client', async () => {
        try {
          // Initialize gapi.client with discovery docs only.
          // We will set the auth token later via setToken()
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          resolve();
        } catch (err: any) {
          console.error("GAPI Init Error", err);
          // Extract meaningful error message
          const msg = err.details || err.error || JSON.stringify(err);
          reject(new Error(`GAPI Init Failed: ${msg}`));
        }
      });
  });
};

export const initGis = async (clientId: string) => {
  await waitForScript('google');
  
  return new Promise<void>((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {}, // Must be a function, even if empty initially
      });
      gisInited = true;
      resolve();
    } catch (err: any) {
      reject(new Error(`GIS Init Failed: ${err.message || err}`));
    }
  });
};

export const requestAccessToken = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Token Client not initialized"));
    
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      
      // CRITICAL: The new GIS library does NOT set the token for gapi automatically.
      // We must manually pass the access token to gapi.client.
      if (resp.access_token) {
        window.gapi.client.setToken(resp);
        resolve();
      } else {
        reject(new Error("No access token received"));
      }
    };

    if (window.gapi && window.gapi.client) {
         // If a token already exists, we might want to skip? 
         // But for explicit connect, we force prompt usually.
    }

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Lists files in a specific folder.
 * @param folderId The ID of the folder to list (default: 'root')
 */
export const listDriveFiles = async (folderId = 'root'): Promise<any[]> => {
  if (!gapiInited) throw new Error("GAPI not initialized");

  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const response = await window.gapi.client.drive.files.list({
      'pageSize': 50, // Increased page size
      'fields': "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, iconLink, parents)",
      'q': q,
      'orderBy': 'folder, name' // Folders first, then name
    });
    return response.result.files;
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};

export const getFileContent = async (fileId: string, mimeType: string): Promise<string> => {
  if (!gapiInited) throw new Error("GAPI not initialized");
  
  try {
    if (mimeType.startsWith('application/vnd.google-apps.')) {
        if (mimeType.includes('document')) {
             const response = await window.gapi.client.drive.files.export({
                fileId: fileId,
                mimeType: 'text/plain'
             });
             return response.body;
        }
        return "[Google App File - Content Analysis Limited]";
    } else {
        if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('javascript')) {
             const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
             });
             return response.body;
        }
        return "[Binary File - Analysis based on Name/Type]";
    }
  } catch (err) {
    console.warn("Could not fetch file content", err);
    return "[Content Access Error]";
  }
};

// --- WRITE OPERATIONS ---

const findFolder = async (name: string, parentId: string): Promise<string | null> => {
   // Sanitize name for query
   const sanitizedName = name.replace(/'/g, "\\'");
   const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${sanitizedName}' and '${parentId}' in parents and trashed = false`;
   const response = await window.gapi.client.drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
   return response.result.files.length > 0 ? response.result.files[0].id : null;
};

const createFolder = async (name: string, parentId: string): Promise<string> => {
   const fileMetadata = {
     name,
     mimeType: 'application/vnd.google-apps.folder',
     parents: [parentId]
   };
   const response = await window.gapi.client.drive.files.create({
     resource: fileMetadata,
     fields: 'id'
   });
   return response.result.id;
};

/**
 * Ensures that a folder path exists (e.g., "Work/Projects/2024").
 * Creates missing folders as needed.
 * Returns the ID of the final folder.
 */
export const ensureFolderPath = async (path: string): Promise<string> => {
  // Normalize path
  const parts = path.split('/').map(p => p.trim()).filter(p => p !== '');
  if (parts.length === 0) return 'root';

  let currentParentId = 'root';
  let currentPathStr = '';

  for (const part of parts) {
    currentPathStr = currentPathStr ? `${currentPathStr}/${part}` : part;
    
    // Check Cache first
    if (folderCache[currentPathStr]) {
      currentParentId = folderCache[currentPathStr];
      continue;
    }

    // Check Drive
    let folderId = await findFolder(part, currentParentId);
    if (!folderId) {
      folderId = await createFolder(part, currentParentId);
    }

    // Update Cache
    folderCache[currentPathStr] = folderId;
    currentParentId = folderId;
  }
  
  return currentParentId;
};

/**
 * Renames and Moves a file.
 */
export const applyFileUpdate = async (
  fileId: string, 
  newName: string, 
  currentParents: string[] | undefined, 
  targetFolderId?: string
): Promise<void> => {
  
  const body: any = { name: newName };
  const params: any = { fileId, resource: body };

  if (targetFolderId && targetFolderId !== 'root') {
    // If we have a target folder and it's not root (or if it is, handle specific root id logic if needed, but 'root' alias works)
    
    // Check if it's already in the target folder
    const isAlreadyHere = currentParents && currentParents.includes(targetFolderId);
    
    if (!isAlreadyHere) {
        params.addParents = targetFolderId;
        if (currentParents && currentParents.length > 0) {
            params.removeParents = currentParents.join(',');
        }
    }
  }

  await window.gapi.client.drive.files.update(params);
};
