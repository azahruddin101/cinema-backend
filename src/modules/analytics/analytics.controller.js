import analyticsService from './analytics.service.js';

/**
 * @desc    Get AI-powered analytics and predictions
 * @route   GET /api/analytics/predict
 * @access  Private/Admin
 */
export const getPredictionInsights = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both startDate and endDate in YYYY-MM-DD format.'
            });
        }

        const insights = await analyticsService.getPerformanceInsights(startDate, endDate);

        res.status(200).json({
            success: true,
            data: insights,
            metadata: {
                engine: "TensorFlow.js + GPT-4",
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};
