import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { renderAsync } from 'docx-preview';

const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : window.location.origin.replace(/:\d+$/, ':5000');

function FilePreview({ file, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const docxRef = useRef(null);

  const url = file.fileUrl.startsWith('http') ? file.fileUrl : `${BASE}${file.fileUrl}`;
  const mime = (file.mimeType || '').toLowerCase();
  const ext = (file.name || '').split('.').pop().toLowerCase();

  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isPdf = mime === 'application/pdf';
  const isTxt = mime === 'text/plain' || ext === 'txt';
  const isDocx = mime.includes('wordprocessingml') || mime.includes('msword') || ext === 'docx' || ext === 'doc';
  const isXlsx = mime.includes('spreadsheetml') || mime.includes('excel') || mime.includes('csv') || ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  const isPptx = mime.includes('presentationml') || mime.includes('powerpoint') || ext === 'pptx' || ext === 'ppt';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setContent(null);
      
      try {
        if (isImage) {
          setContent(<img src={url} alt={file.name} style={imageStyle} />);
        } else if (isVideo) {
          setContent(<video controls src={url} style={videoStyle} />);
        } else if (isPdf) {
          setContent(<iframe src={url} title={file.name} style={iframeStyle} />);
        } else if (isTxt) {
          const text = await (await fetch(url)).text();
          if (!cancelled) setContent(<pre style={preStyle}>{text}</pre>);
        } else if (isDocx) {
          const ab = await (await fetch(url)).arrayBuffer();
          if (!cancelled) {
            setContent(<div ref={docxRef} style={docxContainerStyle} />);
            // Render docx-preview in the next tick after ref is assigned
            setTimeout(async () => {
              if (docxRef.current && !cancelled) {
                try {
                  await renderAsync(ab, docxRef.current, undefined, {
                    className: 'docx-viewer',
                    inWrapper: false,
                  });
                } catch (e) {
                  console.error('Docx render error:', e);
                  setContent(<DownloadCard file={file} url={url} note="Failed to render Word document preview." />);
                }
              }
            }, 0);
          }
        } else if (isXlsx) {
          const ab = await (await fetch(url)).arrayBuffer();
          const wb = XLSX.read(ab, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const html = XLSX.utils.sheet_to_html(wb.Sheets[sheetName], { editable: false });
          if (!cancelled) setContent(
            <div style={xlsxContainerStyle}>
              <div style={sheetLabelStyle}>Sheet: <b>{sheetName}</b></div>
              <div style={tableWrapperStyle} dangerouslySetInnerHTML={{ __html: injectTableStyles(html) }} />
            </div>
          );
        } else if (isPptx) {
          const ab = await (await fetch(url)).arrayBuffer();
          const slides = await extractPptxSlides(ab);
          if (!cancelled) setContent(<PptxViewer slides={slides} filename={file.name} url={url} />);
        } else {
          setContent(<DownloadCard file={file} url={url} note="No preview available for this file type." />);
        }
      } catch (err) {
        console.error('Preview error:', err);
        if (!cancelled) setContent(<DownloadCard file={file} url={url} note={`Preview failed: ${err.message}`} />);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="preview-overlay">
      <div className="preview-modal" ref={containerRef}>
        <div className="preview-header">
          <h3 className="truncate font-semibold text-lg" title={file.name}>{file.name}</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href={url} download={file.name} style={headerDownloadStyle} title="Download Original">
              <Download size={20} />
            </a>
            <button onClick={onClose}><X size={24} /></button>
          </div>
        </div>
        <div className="preview-content" style={previewContentStyle}>
          {loading && !content
            ? <div style={centeredStyle}><div className="spinner" />Loading preview…</div>
            : content}
        </div>
      </div>
    </div>
  );
}

/* ── PPTX Viewer Component ─────────────────────────────── */
function PptxViewer({ slides, filename, url }) {
  const [idx, setIdx] = useState(0);
  if (!slides || slides.length === 0) {
    return <DownloadCard file={{ name: filename }} url={url} note="No slides could be extracted." />;
  }
  const slide = slides[idx];
  return (
    <div style={pptxWrapperStyle}>
      <div style={slideAreaStyle}>
        <div style={slideCardStyle}>
          {slide.title && <h2 style={slideTitleStyle}>{slide.title}</h2>}
          <div style={slideBodyWrapperStyle}>
            {slide.body.map((line, i) => <p key={i} style={slideLineStyle}>{line}</p>)}
            {!slide.title && slide.body.length === 0 && <p style={emptySlideStyle}>Empty slide</p>}
          </div>
        </div>
      </div>
      <div style={pptxNavStyle}>
        <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx===0} style={{ ...navBtnStyle, opacity: idx===0 ? 0.4 : 1 }}><ChevronLeft size={20} /></button>
        <span style={{ fontSize:'0.9rem' }}>Slide {idx+1} / {slides.length}</span>
        <button onClick={() => setIdx(i => Math.min(slides.length-1, i+1))} disabled={idx===slides.length-1} style={{ ...navBtnStyle, opacity: idx===slides.length-1 ? 0.4 : 1 }}><ChevronRight size={20} /></button>
      </div>
    </div>
  );
}

/* ── PPTX Extraction ──────────────────────────────────── */
async function extractPptxSlides(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const slides = [];
  for (const slideFile of slideFiles) {
    const xmlStr = await zip.files[slideFile].async('string');
    const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
    const pElements = Array.from(doc.getElementsByTagNameNS('*', 'p'));
    const allLines = pElements.map(p => {
      const tElements = Array.from(p.getElementsByTagNameNS('*', 't'));
      return tElements.map(t => t.textContent).join('').trim();
    }).filter(Boolean);

    let title = '';
    let body = [];
    const spElements = Array.from(doc.getElementsByTagNameNS('*', 'sp'));
    const titleSp = spElements.find(sp => {
      const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
      return ph && (ph.getAttribute('type') === 'title' || ph.getAttribute('type') === 'ctrTitle');
    });

    if (titleSp) {
      title = Array.from(titleSp.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join('').trim();
      body = allLines.filter(line => line !== title);
    } else if (allLines.length > 0) {
      title = allLines[0];
      body = allLines.slice(1);
    }
    slides.push({ title, body: [...new Set(body)] });
  }
  return slides;
}

/* ── Styles ────────────────────────────────────────────── */
const previewContentStyle = { flex: 1, height: '100%', width: '100%', overflow: 'auto', background: '#e2e8f0', display: 'flex', flexDirection: 'column' };
const iframeStyle = { width: '100%', height: '100%', border: 'none' };
const imageStyle = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '2rem', margin: 'auto' };
const videoStyle = { maxWidth: '100%', maxHeight: '100%', padding: '2rem', margin: 'auto' };
const preStyle = { margin: 0, padding: '2rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.95rem', background: '#f8fafc', height: '100%' };
const docxContainerStyle = { background: 'white', padding: '2rem', maxWidth: '900px', margin: '1rem auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', minHeight: '100%' };
const xlsxContainerStyle = { padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const sheetLabelStyle = { color: '#64748b', fontSize: '0.85rem', marginBottom: '0.75rem' };
const tableWrapperStyle = { overflow: 'auto', flex: 1, background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px' };
const pptxWrapperStyle = { display:'flex', flexDirection:'column', height:'100%', background:'#f1f5f9' };
const slideAreaStyle = { flex:1, overflow:'auto', padding:'2rem', display:'flex', alignItems:'center', justifyContent:'center' };
const slideCardStyle = { width:'100%', height:'100%', maxWidth:'1100px', background:'white', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', borderRadius:12, padding:'4rem', boxSizing:'border-box', display:'flex', flexDirection:'column' };
const slideTitleStyle = { margin:'0 0 2rem 0', fontSize:'2.75rem', color:'#0f172a', borderBottom:'3px solid #6366f1', paddingBottom:'1.25rem', fontWeight:800, textAlign:'center' };
const slideBodyWrapperStyle = { flex:1, overflowY:'auto', padding:'1rem 0' };
const slideLineStyle = { margin:'1rem 0', fontSize:'1.4rem', color:'#334155', lineHeight:1.8, textAlign:'center' };
const emptySlideStyle = { color:'#94a3b8', fontStyle:'italic', textAlign:'center' };
const pptxNavStyle = { display:'flex', alignItems:'center', justifyContent:'center', gap:'2rem', padding:'1rem', background:'#0f172a', color:'white' };
const navBtnStyle = { background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', borderRadius:6, padding:'0.4rem 0.8rem', cursor:'pointer' };
const centeredStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' };
const headerDownloadStyle = { color: 'white', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const downloadBtnStyle = { display:'inline-flex', alignItems:'center', padding:'0.75rem 1.5rem', background:'#4f46e5', color:'white', borderRadius:8, textDecoration:'none', fontWeight:600 };

function DownloadCard({ file, url, note }) {
  return (
    <div style={centeredStyle}>
      <p style={{ color:'#64748b', marginBottom:'1.5rem' }}>{note}</p>
      <a href={url} download={file.name} style={downloadBtnStyle}><Download size={18} style={{ marginRight:8 }} /> Download {file.name}</a>
    </div>
  );
}

function injectTableStyles(html) {
  return `<style>
    table{border-collapse:collapse;width:100%;font-family:sans-serif;font-size:0.9rem}
    td,th{border:1px solid #cbd5e1;padding:8px 12px;text-align:left}
    th{background:#f8fafc;font-weight:600;position:sticky;top:0}
    tr:nth-child(even){background:#f8fafc}
    tr:hover{background:#f1f5f9}
  </style>` + html;
}

export default FilePreview;
