import axios from 'axios';
import { config } from '../config.js';
import supabase from '../utils/supabaseClient.js';

// Your church YouTube channels
// Note: These are channel handles; we'll resolve them to channel IDs at runtime
const CHURCH_CHANNELS = [
  { handle: '@kayolemainworshipchannel', name: 'Kayole Main Altar' },
  { handle: '@WorshipTV7', name: 'Worship TV' },
  { handle: '@TrendingGospel', name: 'Trending Gospel' },
];

/**
 * Fetch latest videos from a YouTube channel
 */
export const fetchLatestVideos = async (channelId, maxResults = 10) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: config.youtube.apiKey,
        channelId: channelId,
        part: 'snippet',
        order: 'date',
        type: 'video',
        maxResults: maxResults,
      },
    });

    const items = response.data.items || [];
    const ids = items.map((i) => i.id?.videoId).filter(Boolean);

    // If no results, return []
    if (!ids.length) return [];

    // Check which are embeddable/public
    const vidResp = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: config.youtube.apiKey,
        id: ids.join(','),
        part: 'status,contentDetails',
        maxResults: maxResults,
      },
    });

    const embeddableSet = new Set(
      (vidResp.data.items || [])
        .filter((v) => v.status?.embeddable && v.status?.privacyStatus === 'public')
        .map((v) => v.id)
    );

    return items
      .filter((item) => embeddableSet.has(item.id.videoId))
      .map((item) => ({
        video_id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        published_at: item.snippet.publishedAt,
        channel_id: channelId,
      }));
  } catch (error) {
    console.error(`Error fetching videos for channel ${channelId}:`, error.message);
    return [];
  }
};

/**
 * Resolve a YouTube channel handle (e.g., @MyChannel) to a channel ID (UC...)
 * Tries the channels API with forHandle, then falls back to search API
 */
const resolveChannelId = async (handleOrId) => {
  try {
    // If already an ID (starts with UC), return as-is
    if (typeof handleOrId === 'string' && handleOrId.startsWith('UC')) {
      return handleOrId;
    }

    const handle = String(handleOrId || '').trim();
    if (!handle) return null;

    // Try channels endpoint with forHandle
    try {
      const resp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id',
          forHandle: handle.startsWith('@') ? handle : `@${handle}`,
          key: config.youtube.apiKey,
        },
      });
      if (resp.data?.items?.length) {
        return resp.data.items[0].id;
      }
    } catch (e) {
      // fall through to search approach
    }

    // Fallback: search for the channel by handle
    const searchResp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: handle,
        type: 'channel',
        maxResults: 1,
        key: config.youtube.apiKey,
      },
    });
    if (searchResp.data?.items?.length) {
      return searchResp.data.items[0]?.id?.channelId || null;
    }
  } catch (err) {
    console.error('Failed to resolve channel handle to ID:', handleOrId, err?.message || err);
  }
  return null;
};

/**
 * Cache video to Supabase (upsert to avoid duplicates)
 */
export const cacheVideoToSupabase = async (videoData) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .upsert(videoData, { onConflict: 'video_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error caching video to Supabase:', error.message);
    return null;
  }
};

/**
 * Check for new videos from all church channels and cache them
 */
export const checkForNewVideos = async () => {
  console.log('🔄 Starting YouTube sync...');
  let totalNewVideos = 0;

  for (const channel of CHURCH_CHANNELS) {
    console.log(`📺 Resolving channel: ${channel.name} (${channel.handle || channel.id || 'unknown'})`);
    const channelId = await resolveChannelId(channel.id || channel.handle);
    if (!channelId) {
      console.warn(`⚠️  Could not resolve channel ID for ${channel.name}. Skipping.`);
      continue;
    }

    console.log(`📺 Fetching videos from ${channel.name} [${channelId}]...`);
    const videos = await fetchLatestVideos(channelId, 10);

    for (const video of videos) {
      const cached = await cacheVideoToSupabase(video);
      if (cached) {
        totalNewVideos++;
        console.log(`✅ Cached: ${video.title}`);
      }
    }
  }

  console.log(`✨ YouTube sync complete. Total new/updated videos: ${totalNewVideos}`);
  return totalNewVideos;
};
