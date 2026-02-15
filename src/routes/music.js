import express from 'express';
import supabase from '../utils/supabaseClient.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// GET /api/music - Fetch all music tracks
router.get('/', async (req, res) => {
    try {
        const { sort, order } = req.query;

        let query = supabase
            .from('music')
            .select('*');

        // Default sort by title A-Z
        if (sort === 'newest') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('title', { ascending: true });
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch music', details: err.message });
    }
});

// GET /api/music/:id - Fetch single track (e.g. for lyrics or details)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('music')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Track not found', details: err.message });
    }
});

// POST /api/music - Add new track (Admin only, usually called via Admin UI but good to have API)
router.post('/', adminAuth, async (req, res) => {
    try {
        const { title, artist, audio_url, cover_url, lyrics, duration } = req.body;

        if (!title || !audio_url) {
            return res.status(400).json({ error: 'Title and Audio URL are required' });
        }

        const { data, error } = await supabase
            .from('music')
            .insert([{
                title,
                artist: artist || 'Unknown Artist',
                audio_url,
                cover_url,
                lyrics,
                duration: duration || 0
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add track', details: err.message });
    }
});

// DELETE /api/music/:id - Delete track (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('music')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Track deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete track', details: err.message });
    }
});

export default router;
