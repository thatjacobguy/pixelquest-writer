// IndexedDB helper to persist FileSystemDirectoryHandle (which localStorage cannot store)

export async function saveFolderHandle(handle: FileSystemDirectoryHandle | null, username?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('pixelquest_db', 1);
    
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) {
        request.result.createObjectStore('handles');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      const key = username ? `local_folder_${username}` : 'local_folder';
      
      if (handle) {
        store.put(handle, key);
      } else {
        store.delete(key);
      }
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function getFolderHandle(username?: string): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pixelquest_db', 1);
    
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('handles')) {
        request.result.createObjectStore('handles');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const key = username ? `local_folder_${username}` : 'local_folder';
      const getReq = store.get(key);
      
      getReq.onsuccess = () => {
        db.close();
        resolve(getReq.result || null);
      };
      
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
    };
    
    request.onerror = () => resolve(null); // Fallback gracefully if blocked
  });
}

