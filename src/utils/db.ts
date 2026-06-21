// IndexedDB helper to persist FileSystemDirectoryHandle (which localStorage cannot store)

export async function saveFolderHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
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
      
      if (handle) {
        store.put(handle, 'local_folder');
      } else {
        store.delete('local_folder');
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

export async function getFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
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
      const getReq = store.get('local_folder');
      
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
