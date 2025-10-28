/**
 * Upload Queue Component
 * Provides visual feedback for file uploads with timer-based color coding
 * 
 * Features:
 * - Real-time upload progress tracking
 * - Color-coded timer (green < 5min, yellow 5-10min, red > 10min)
 * - Multiple file support
 * - Auto-hide when complete
 */

class UploadQueue {
  constructor() {
    this.uploads = new Map(); // Map<uploadId, uploadData>
    this.container = null;
    this.isVisible = false;
    this.init();
  }

  init() {
    // Create container element
    this.container = document.createElement('div');
    this.container.id = 'upload-queue-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 9999;
      display: none;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Add a file to the upload queue
   * @param {string} uploadId - Unique identifier for this upload
   * @param {string} fileName - Name of the file being uploaded
   * @param {number} fileSize - Size of the file in bytes
   */
  addUpload(uploadId, fileName, fileSize) {
    const upload = {
      id: uploadId,
      fileName,
      fileSize,
      status: 'uploading', // uploading, processing, complete, failed
      startTime: Date.now(),
      elapsedSeconds: 0,
      timerInterval: null
    };

    this.uploads.set(uploadId, upload);
    
    // Start timer
    upload.timerInterval = setInterval(() => {
      upload.elapsedSeconds = Math.floor((Date.now() - upload.startTime) / 1000);
      this.updateUpload(uploadId);
    }, 1000);

    this.show();
    this.render();
  }

  /**
   * Update upload status
   * @param {string} uploadId
   * @param {string} status - 'uploading', 'processing', 'complete', 'failed'
   * @param {string} docId - Document ID when complete
   */
  updateStatus(uploadId, status, docId = null) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.status = status;
    if (docId) upload.docId = docId;

    if (status === 'complete' || status === 'failed') {
      clearInterval(upload.timerInterval);
      upload.timerInterval = null;
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        this.removeUpload(uploadId);
      }, 5000);
    }

    this.render();
  }

  /**
   * Update a single upload's display
   */
  updateUpload(uploadId) {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    const element = document.getElementById(`upload-${uploadId}`);
    if (!element) return;

    // Update timer display
    const timerEl = element.querySelector('.upload-timer');
    if (timerEl) {
      const minutes = Math.floor(upload.elapsedSeconds / 60);
      const seconds = upload.elapsedSeconds % 60;
      timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Update color based on elapsed time
      const color = this.getTimerColor(upload.elapsedSeconds);
      timerEl.style.color = color;
    }
  }

  /**
   * Get timer color based on elapsed seconds
   */
  getTimerColor(seconds) {
    if (seconds < 300) return '#10b981'; // Green < 5 min
    if (seconds < 600) return '#f59e0b'; // Yellow 5-10 min
    return '#ef4444'; // Red > 10 min
  }

  /**
   * Remove upload from queue
   */
  removeUpload(uploadId) {
    const upload = this.uploads.get(uploadId);
    if (upload && upload.timerInterval) {
      clearInterval(upload.timerInterval);
    }
    this.uploads.delete(uploadId);
    
    if (this.uploads.size === 0) {
      this.hide();
    } else {
      this.render();
    }
  }

  /**
   * Show the upload queue panel
   */
  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  /**
   * Hide the upload queue panel
   */
  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'uploading':
        return '<div class="spinner"></div>';
      case 'processing':
        return '<div class="spinner"></div>';
      case 'complete':
        return '<div style="color: #10b981; font-size: 16px;">✓</div>';
      case 'failed':
        return '<div style="color: #ef4444; font-size: 16px;">✗</div>';
      default:
        return '';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status) {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  }

  /**
   * Render the upload queue
   */
  render() {
    if (this.uploads.size === 0) {
      this.hide();
      return;
    }

    const uploadsArray = Array.from(this.uploads.values());

    this.container.innerHTML = `
      <style>
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #333;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .upload-item:hover {
          background: #111 !important;
        }
        
        .view-ontology-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 11px;
          cursor: pointer;
        }
        
        .view-ontology-link:hover {
          text-decoration: underline;
        }
      </style>
      
      <div style="padding: 16px; border-bottom: 1px solid #333;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="color: #e6e6e6; font-size: 13px; font-weight: 600;">Upload Queue</div>
          <div style="color: #9a9a9a; font-size: 11px;">${this.uploads.size} file${this.uploads.size !== 1 ? 's' : ''}</div>
        </div>
      </div>
      
      <div style="max-height: 320px; overflow-y: auto;">
        ${uploadsArray.map(upload => {
          const minutes = Math.floor(upload.elapsedSeconds / 60);
          const seconds = upload.elapsedSeconds % 60;
          const timerColor = this.getTimerColor(upload.elapsedSeconds);
          
          return `
            <div id="upload-${upload.id}" class="upload-item" style="padding: 12px 16px; border-bottom: 1px solid #1a1a1a; background: #0a0a0a;">
              <div style="display: flex; align-items: start; gap: 10px;">
                <div style="margin-top: 2px;">
                  ${this.getStatusIcon(upload.status)}
                </div>
                
                <div style="flex: 1; min-width: 0;">
                  <div style="color: #e6e6e6; font-size: 12px; font-weight: 500; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${upload.fileName}">
                    ${upload.fileName}
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div style="color: #9a9a9a; font-size: 10px;">
                      ${this.formatFileSize(upload.fileSize)}
                    </div>
                    <div style="color: #666;">•</div>
                    <div style="color: #9a9a9a; font-size: 10px;">
                      ${this.getStatusText(upload.status)}
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div class="upload-timer" style="color: ${timerColor}; font-size: 11px; font-family: monospace; font-weight: 600;">
                      ${minutes}:${seconds.toString().padStart(2, '0')}
                    </div>
                    
                    ${upload.status === 'complete' && upload.docId ? `
                      <a href="#" class="view-ontology-link" onclick="event.preventDefault(); window.viewDocument('${upload.docId}');">
                        View Ontology →
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// Create global instance
window.uploadQueue = new UploadQueue();

// Helper function to view document (will be called from link)
window.viewDocument = function(docId) {
  // Trigger document selection in surface viewer
  if (window.surfaceViewer && window.surfaceViewer.selectDocument) {
    window.surfaceViewer.selectDocument(docId);
  } else {
    // Fallback: reload page with document selected
    window.location.hash = `doc=${docId}`;
    window.location.reload();
  }
};
