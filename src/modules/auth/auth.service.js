import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import { AppError } from '../../middleware/error.middleware.js';

class AuthService {
    /**
     * Generate access token.
     */
    generateAccessToken(userId, role) {
        return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        });
    }

    /**
     * Generate refresh token.
     */
    generateRefreshToken(userId) {
        return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });
    }

    /**
     * Register a new user.
     */
    async register({ name, email, password, role }) {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('User with this email already exists', 409);
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'viewer',
        });

        // Generate tokens
        const accessToken = this.generateAccessToken(user._id, user.role);
        const refreshToken = this.generateRefreshToken(user._id);

        // Store refresh token
        await User.findByIdAndUpdate(user._id, {
            $push: { refreshTokens: refreshToken },
        });

        return {
            user: user.toJSON(),
            accessToken,
            refreshToken,
        };
    }

    /**
     * Login a user.
     */
    async login({ email, password }) {
        // Find user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        if (!user.isActive) {
            throw new AppError('Account has been deactivated', 403);
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user._id, user.role);
        const refreshToken = this.generateRefreshToken(user._id);

        // Store refresh token
        await User.findByIdAndUpdate(user._id, {
            $push: { refreshTokens: refreshToken },
        });

        return {
            user: user.toJSON(),
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token.
     */
    async refreshAccessToken(refreshToken) {
        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400);
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            throw new AppError('Invalid or expired refresh token', 401);
        }

        // Check if refresh token exists in user's stored tokens
        const user = await User.findById(decoded.userId).select('+refreshTokens');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (!user.refreshTokens.includes(refreshToken)) {
            // Token reuse detected – clear all refresh tokens (security measure)
            await User.findByIdAndUpdate(user._id, { refreshTokens: [] });
            throw new AppError('Refresh token reuse detected. All sessions revoked.', 401);
        }

        // Rotate refresh token
        const newAccessToken = this.generateAccessToken(user._id, user.role);
        const newRefreshToken = this.generateRefreshToken(user._id);

        // Replace old refresh token with new one
        await User.findByIdAndUpdate(user._id, {
            $pull: { refreshTokens: refreshToken },
            $push: { refreshTokens: newRefreshToken },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    /**
     * Logout – remove refresh token.
     */
    async logout(userId, refreshToken) {
        if (refreshToken) {
            await User.findByIdAndUpdate(userId, {
                $pull: { refreshTokens: refreshToken },
            });
        } else {
            // Logout from all sessions
            await User.findByIdAndUpdate(userId, { refreshTokens: [] });
        }
    }

    /**
     * Get current user profile.
     */
    async getProfile(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }
}

export default new AuthService();
