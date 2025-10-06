import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { checkForNewVideos } from '../services/youtubeService.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Configure multer storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
// Ensure uploads directory exists
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

// Admin UI - Dashboard
router.get('/', async (req, res) => {
  try {
    const { data: images } = await supabase
      .from('admin_content')
      .select('*')
      .eq('type', 'radio_slideshow')
      .order('published_at', { ascending: false });

 

    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    res.render('admin', {
      images: images || [],
      settings: settings || { theme: 'default', radio_url: '', notification_enabled: true },
      message: req.query.message || '',
      error: req.query.error || '',
    });
  } catch (err) {
    res.status(500).send('Failed to load admin UI: ' + (err.message || err));
  }
});

// Upload slideshow image via file (multipart)
router.post('/upload-file', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const { title, content } = req.body;
    const publicPath = `/uploads/${req.file.filename}`;

    const { error } = await supabase
      .from('admin_content')
      .insert([{ type: 'radio_slideshow', title: title || 'Slide', content: content || '', media_url: publicPath }]);
    if (error) throw error;

    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide uploaded successfully'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Upload failed'));
  }
});

// Upload slideshow image via form
router.post('/upload', async (req, res) => {
  try {
    const { title, content, media_url } = req.body;
    if (!media_url) throw new Error('media_url is required');

    const { error } = await supabase
      .from('admin_content')
      .insert([{ type: 'radio_slideshow', title: title || 'Slide', content: content || '', media_url }]);

    if (error) throw error;
    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide added successfully'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Failed to add slide'));
  }
});

// Delete slideshow image
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) throw new Error('id is required');

    const { error } = await supabase
      .from('admin_content')
      .delete()
      .eq('id', id);
    if (error) throw error;

    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide deleted'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Delete failed'));
  }
});

// Update settings
router.post('/settings', async (req, res) => {
  try {
    const { radio_url, theme, notification_enabled } = req.body;

    // Find existing
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    const updateData = {
      radio_url: radio_url || null,
      theme: theme || 'default',
      notification_enabled: typeof notification_enabled !== 'undefined',
    };

    if (existing) {
      result = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('app_settings')
        .insert([updateData])
        .select()
        .single();
    }
    if (result.error) throw result.error;

    res.redirect('/admin-ui?message=' + encodeURIComponent('Settings updated'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Settings update failed'));
  }
});

// Trigger YouTube sync
router.post('/sync', async (req, res) => {
  try {
    const count = await checkForNewVideos();
    res.redirect('/admin-ui?message=' + encodeURIComponent(`YouTube sync done. ${count} videos processed`));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'YouTube sync failed'));
  }
});

export default router;
