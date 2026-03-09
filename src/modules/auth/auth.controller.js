import authService from './auth.service.js';

class AuthController {
    /**
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const { name, email, password, role } = req.body;
            const result = await authService.register({ name, email, password, role });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login({ email, password });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/refresh
     */
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshAccessToken(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/logout
     */
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await authService.logout(req.user._id, refreshToken);

            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     */
    async getMe(req, res, next) {
        try {
            const user = await authService.getProfile(req.user._id);

            res.status(200).json({
                success: true,
                user,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
