const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Material = require('../models/Material');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'study-materials',
    resource_type: 'auto', // Accept all file types: images, pdfs, docs, videos
  },
});

const upload = multer({ storage });

// Proxy external cloud files for native Office apps and CORS bypass
router.get('/proxy/:b64url/:filename', (req, res) => {
  let fileUrl;
  try {
    fileUrl = Buffer.from(req.params.b64url, 'base64').toString('utf-8');
  } catch (e) {
    return res.status(400).send('Invalid URL');
  }
  if (!fileUrl.startsWith('http')) return res.status(400).send('Invalid URL');
  
  const protocol = fileUrl.startsWith('https') ? require('https') : require('http');
  
  protocol.get(fileUrl, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).send('Error proxying file');
  });
});

// Get materials (Public)
router.get('/', async (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    const materials = await Material.find({ parentId }).sort({ type: -1, name: 1 });
    res.json(materials);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Get breadcrumb path for a folder (Public)
router.get('/path/:id', async (req, res) => {
  try {
    let currentId = req.params.id;
    const pathArr = [];
    while (currentId) {
      const folder = await Material.findOne({ _id: currentId });
      if (!folder) break;
      pathArr.unshift({ id: folder._id, name: folder.name });
      currentId = folder.parentId;
    }
    res.json(pathArr);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Create Folder (Staff Only)
router.post('/folder', auth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const folder = await Material.create({
      name,
      type: 'folder',
      parentId: parentId || null,
      createdBy: req.user.id,
      createdAt: new Date()
    });
    res.json(folder);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Upload Files (Staff Only)
router.post('/upload', auth, upload.array('files'), async (req, res) => {
  try {
    const parentId = req.body.parentId || null;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const newFile = await Material.create({
        name: file.originalname,
        type: 'file',
        parentId,
        fileUrl: file.path, // Cloudinary URL
        mimeType: file.mimetype,
        createdBy: req.user.id,
        createdAt: new Date()
      });
      uploadedFiles.push(newFile);
    }
    res.json(uploadedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete Item (Staff Only)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('DELETE request for id:', req.params.id);
    const item = await Material.findOne({ _id: req.params.id });
    console.log('Found item:', item);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.type === 'folder') {
      const children = await Material.find({ parentId: item._id });
      if (children.length > 0) {
        return res.status(400).json({ message: 'Folder is not empty. Please delete its contents first.' });
      }
    }

    // Always remove from DB first
    const result = await Material.deleteOne({ _id: req.params.id });
    console.log('numRemoved:', result.deletedCount);
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found or already deleted' });
    }

    // Try to delete the file from Cloudinary (non-blocking on error)
    if (item.type === 'file' && item.fileUrl && item.fileUrl.includes('cloudinary.com')) {
      try {
        // Extract resource_type and public_id
        const resTypeParts = item.fileUrl.match(/\/res\.cloudinary\.com\/[^\/]+\/(image|video|raw)\/upload\//);
        const resType = resTypeParts ? resTypeParts[1] : 'image';
        
        const pathMatch = item.fileUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        if (pathMatch && pathMatch[1]) {
          const publicId = decodeURIComponent(pathMatch[1]);
          await cloudinary.uploader.destroy(publicId, { resource_type: resType });
          console.log('File deleted from Cloudinary:', publicId);
        }
      } catch (fileErr) {
        console.warn('Could not delete file from Cloudinary (DB record still removed):', fileErr.message);
      }
    }

    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
  }
});

module.exports = router;
