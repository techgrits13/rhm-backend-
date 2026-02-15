import express from 'express';
import supabase from '../utils/supabaseClient.js';
import dotenv from 'dotenv';
import adminAuth from '../middleware/adminAuth.js'; // Ensure correct path for adminAuth

dotenv.config();

const router = express.Router();

// Middleware for Admin Authentication is now imported from ../middleware/adminAuth.js

// GET /api/breaking-news - Fetch news feed
router.get('/', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
        console.log('Fetching news... page:', page, 'limit:', limit);
        const { data, error, count } = await supabase
            .from('breaking_news')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Supabase error fetching news:', error);
            throw error;
        }

        console.log('Successfully fetched news count:', count);

        res.json({
            data,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalItems: count
        });
    } catch (error) {
        console.error('CRITICAL SERVER ERROR /api/breaking-news:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// POST /api/breaking-news - Admin create post
router.post('/', adminAuth, async (req, res) => {
    const { type, content, media_url, poll_options } = req.body;

    try {
        const { data, error } = await supabase
            .from('breaking_news')
            .insert([{ type, content, media_url, poll_options }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/breaking-news/:id - Admin delete post
router.delete('/:id', adminAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('breaking_news')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/breaking-news/:id/react - User react
router.post('/:id/react', async (req, res) => {
    const { id } = req.params;
    const { user_identifier, reaction } = req.body;

    if (!user_identifier || !reaction) {
        return res.status(400).json({ error: 'Missing user_identifier or reaction' });
    }

    try {
        // Upsert reaction
        const { data, error } = await supabase
            .from('news_reactions')
            .upsert(
                { news_id: id, user_identifier, reaction },
                { onConflict: 'news_id,user_identifier' }
            )
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/breaking-news/:id/vote - user poll vote
router.post('/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { option_index } = req.body; // Index of the option in the array

    try {
        // 1. Get current poll options
        const { data: news, error: fetchError } = await supabase
            .from('breaking_news')
            .select('poll_options')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!news || !news.poll_options) return res.status(404).json({ error: "Poll not found" });

        // 2. Increment vote
        const options = news.poll_options;
        if (options[option_index]) {
            options[option_index].votes = (options[option_index].votes || 0) + 1;
        } else {
            return res.status(400).json({ error: "Invalid option index" });
        }

        // 3. Update table
        const { data: updated, error: updateError } = await supabase
            .from('breaking_news')
            .update({ poll_options: options })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;
        res.json(updated[0]);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
