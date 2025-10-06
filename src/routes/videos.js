import express from 'express';
import supabase from '../utils/supabaseClient.js';

const router = express.Router();

// GET /api/videos - Fetch all cached videos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      videos: data || [],
      message: data?.length > 0 ? 'Videos fetched successfully' : 'No videos available yet'
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
});

// GET /api/videos/:id - Fetch specific video by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      video: data
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video',
      message: error.message
    });
  }
});

export default router;
