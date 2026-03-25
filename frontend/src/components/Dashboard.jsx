import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Upload, Plus, Trash2, FileText, Image as ImageIcon, Film, Download, Layout } from 'lucide-react';
import api from '../api';
import FilePreview from './FilePreview';

function Dashboard({ user }) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [items, setItems] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);

  const [previewFile, setPreviewFile] = useState(null);
  
  // File Open Choice State
  const [openWithModal, setOpenWithModal] = useState({ show: false, item: null, ext: '' });
  const [rememberOpenChoice, setRememberOpenChoice] = useState(false);
  const [prefsResetKey, setPrefsResetKey] = useState(0);

  useEffect(() => {
    fetchItems();
    fetchBreadcrumbs();
  }, [currentFolderId]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = currentFolderId ? `/materials?parentId=${currentFolderId}` : '/materials';
      const res = await api.get(url);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreadcrumbs = async () => {
    if (!currentFolderId) {
      setBreadcrumbs([]);
      return;
    }
    try {
      const res = await api.get(`/materials/path/${currentFolderId}`);
      setBreadcrumbs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.post('/materials/folder', { name: newFolderName, parentId: currentFolderId });
      setNewFolderName('');
      setShowFolderModal(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Error creating folder');
    }
  };

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < uploadFiles.length; i++) {
        formData.append('files', uploadFiles[i]);
    }
    if (currentFolderId) {
        formData.append('parentId', currentFolderId);
    }

    try {
      await api.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadFiles([]);
      setShowUploadModal(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Error uploading files');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/materials/${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting item');
    }
  };

  const openInDesktopApp = (item, ext) => {
    const isWord = ext === 'docx' || ext === 'doc';
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : window.location.origin.replace(/:\d+$/, ':5000');
    let fileUrl = item.fileUrl.startsWith('http') ? item.fileUrl : `${backendBase}${item.fileUrl}`;
    
    // Always proxy Cloudinary URLs for native office apps
    if (item.fileUrl.startsWith('http')) {
      const b64 = btoa(item.fileUrl);
      fileUrl = `${backendBase}/api/materials/proxy/${b64}/file.${ext}`;
    }
    const scheme = isWord ? 'ms-word' : (isExcel ? 'ms-excel' : 'ms-powerpoint');
    window.location.href = `${scheme}:ofv|u|${fileUrl}`;
  };

  const downloadItemFile = (item) => {
    const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : window.location.origin.replace(/:\d+$/, ':5000');
    const fileUrl = item.fileUrl.startsWith('http') ? item.fileUrl : `${backendBase}${item.fileUrl}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenWithChoice = (choice) => {
    const { item, ext } = openWithModal;
    if (rememberOpenChoice) {
      localStorage.setItem(`openPref_${ext}`, choice);
    }

    if (choice === 'desktop') {
      openInDesktopApp(item, ext);
    } else if (choice === 'browser') {
      setPreviewFile(item);
    } else if (choice === 'download') {
      downloadItemFile(item);
    }

    setOpenWithModal({ show: false, item: null, ext: '' });
    setRememberOpenChoice(false);
  };

  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item._id);
      return;
    }

    const ext = (item.name || '').split('.').pop().toLowerCase();

    const savedPref = localStorage.getItem(`openPref_${ext}`);
    if (savedPref === 'desktop') {
      openInDesktopApp(item, ext);
    } else if (savedPref === 'browser') {
      setPreviewFile(item);
    } else if (savedPref === 'download') {
      downloadItemFile(item);
    } else {
      setOpenWithModal({ show: true, item, ext });
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileText color="#64748b" size={48} />;
    if (mimeType.startsWith('image/')) return <ImageIcon color="#3b82f6" size={48} />;
    if (mimeType.startsWith('video/')) return <Film color="#a855f7" size={48} />;
    if (mimeType === 'application/pdf') return <FileText color="#ef4444" size={48} />;
    return <File color="#64748b" size={48} />;
  };

  return (
    <div className="dashboard-container">
      <div className="breadcrumbs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }} key={prefsResetKey}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setCurrentFolderId(null)} className="bc-link">Home</button>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={16} color="#94a3b8" style={{ margin: '0 4px' }} />
              <button 
                onClick={() => setCurrentFolderId(crumb.id)} 
                className={`bc-link ${idx === breadcrumbs.length - 1 ? 'bc-active' : ''}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {Object.keys(localStorage).some(k => k.startsWith('openPref_')) && (
          <button 
            onClick={() => {
              Object.keys(localStorage).forEach(k => { if (k.startsWith('openPref_')) localStorage.removeItem(k); });
              setPrefsResetKey(k => k + 1); // trigger re-render
              alert('File open preferences reset!');
            }}
            style={{ fontSize: '0.75rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0.5rem', flexShrink: 0 }}
          >
            Reset Open Defaults
          </button>
        )}
      </div>

      {/* Toolbar for Staff */}
      {user?.role === 'staff' && (
        <div className="toolbar">
          <button onClick={() => setShowFolderModal(true)} className="btn-secondary">
            <Plus size={18} style={{ marginRight: '8px' }} /> New Folder
          </button>
          <button onClick={() => setShowUploadModal(true)} className="btn-primary" style={{ marginLeft: '16px' }}>
            <Upload size={18} style={{ marginRight: '8px' }} /> Upload Files
          </button>
        </div>
      )}

      {/* Item Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: 'white', borderRadius: '8px' }}>This folder is empty.</div>
      ) : (
        <div className="item-grid">
          {items.map(item => (
            <div key={item._id} className="item-card group">
              <div 
                className="item-content" 
                onClick={() => handleItemClick(item)}
              >
                {item.type === 'folder' ? (
                  <Folder color="#eab308" size={48} fill="#fef08a" />
                ) : (
                  getFileIcon(item.mimeType)
                )}
                <span className="item-name" title={item.name}>{item.name}</span>
              </div>
              
              {user?.role === 'staff' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
                  className="delete-btn"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input 
                type="text" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
                placeholder="Folder Name"
                className="modal-input"
                autoFocus
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowFolderModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Upload Files</h3>
            <form onSubmit={handleUploadFiles}>
              <input 
                type="file" 
                multiple
                onChange={(e) => setUploadFiles(e.target.files)} 
                className="modal-input"
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-primary">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Open With Modal */}
      {openWithModal.show && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '450px', margin: '0 1rem' }}>
            <h3>How would you like to open this file?</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Choose an application to open <strong>{openWithModal.item.name}</strong>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => handleOpenWithChoice('browser')} 
                style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '0.375rem', color: '#3b82f6' }}><FileText size={24} /></div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>Browser Preview</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Open instantly in the built-in web viewer</div>
                </div>
              </button>

              {['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(openWithModal.ext) && (
                <button 
                  onClick={() => handleOpenWithChoice('desktop')} 
                  style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '0.375rem', color: '#16a34a' }}><Layout size={24} /></div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>Native Application</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Open in Microsoft Office (Word, Excel, PowerPoint)</div>
                  </div>
                </button>
              )}

              <button 
                onClick={() => handleOpenWithChoice('download')} 
                style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div style={{ background: '#f5f3ff', padding: '0.5rem', borderRadius: '0.375rem', color: '#8b5cf6' }}><Download size={24} /></div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>Download File</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Save it to your computer to open later</div>
                </div>
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569', cursor: 'pointer', marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                checked={rememberOpenChoice} 
                onChange={(e) => setRememberOpenChoice(e.target.checked)} 
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              Always use this choice for .{openWithModal.ext} files
            </label>

            <div className="modal-actions">
              <button 
                onClick={() => { setOpenWithModal({ show: false, item: null, ext: '' }); setRememberOpenChoice(false); }} 
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
