import express from 'express';
import {
    registerPushToken,
    unregisterPushToken,
    sendPushNotification,
    sendNotificationToAll,
    cleanupInvalidTokens,
} from '../services/pushNotificationService.js';

const router = express.Router();

/**
 * POST /api/notifications/register
 * Register a new push token
 */
router.post('/register', async (req, res) => {
    try {
        const { expo_push_token, device_type, user_id } = req.body;

        if (!expo_push_token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const result = await registerPushToken(expo_push_token, device_type, user_id);

        if (result.success) {
            res.json({ message: 'Push token registered successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /register:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/unregister
 * Unregister a push token (disable notifications)
 */
router.post('/unregister', async (req, res) => {
    try {
        const { expo_push_token } = req.body;

        if (!expo_push_token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const result = await unregisterPushToken(expo_push_token);

        if (result.success) {
            res.json({ message: 'Push token unregistered successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /unregister:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/send
 * Send a push notification to a specific token (admin only)
 */
router.post('/send', async (req, res) => {
    try {
        const { expo_push_token, title, body, data } = req.body;

        if (!expo_push_token || !title || !body) {
            return res.status(400).json({ error: 'Token, title, and body are required' });
        }

        const result = await sendPushNotification(expo_push_token, title, body, data);

        if (result.success) {
            res.json({ message: 'Notification sent successfully', ticket: result.ticket });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /send:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/send-all
 * Send a push notification to all registered users (admin only)
 */
router.post('/send-all', async (req, res) => {
    try {
        const { title, body, data } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        const result = await sendNotificationToAll(title, body, data);

        if (result.success) {
            res.json({
                message: 'Notifications sent successfully',
                count: result.tickets?.length || 0,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /send-all:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/cleanup
 * Clean up invalid/expired tokens (admin only)
 */
router.post('/cleanup', async (req, res) => {
    try {
        const result = await cleanupInvalidTokens();

        if (result.success) {
            res.json({
                message: 'Token cleanup completed',
                cleaned: result.cleaned,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /cleanup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/test
 * Test endpoint to verify notifications are working
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Notifications API is working',
        endpoints: {
            register: 'POST /api/notifications/register',
            unregister: 'POST /api/notifications/unregister',
            send: 'POST /api/notifications/send',
            sendAll: 'POST /api/notifications/send-all',
            cleanup: 'POST /api/notifications/cleanup',
        },
    });
});

export default router;
