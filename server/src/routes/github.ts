import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to authenticate JWT
const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

router.post('/connect', authenticate, async (req: any, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'GitHub token is required' });
        }

        // Verify token with GitHub
        const githubResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'SecuGrid'
            }
        });

        const githubUser = githubResponse.data.login;

        await prisma.user.update({
            where: { id: req.userId },
            data: {
                githubToken: token,
                githubConnected: true,
                githubUser: githubUser
            }
        });

        res.json({ githubUser });
    } catch (error) {
        console.error('GitHub connection error', error);
        res.status(401).json({ error: 'Invalid GitHub token' });
    }
});

router.get('/repos', authenticate, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });

        if (!user || !user.githubToken) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const reposResponse = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                Authorization: `Bearer ${user.githubToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'SecuGrid'
            }
        });

        const repos = reposResponse.data.map((repo: any) => ({
            id: String(repo.id),
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            language: repo.language || 'Unknown',
            isPrivate: repo.private
        }));

        res.json(repos);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            console.error('GitHub fetch repos error', status, error.response?.data || error.message);

            if (status === 401) {
                return res.status(401).json({ error: 'GitHub token is invalid or expired. Reconnect GitHub.' });
            }

            if (status === 403) {
                return res.status(502).json({ error: 'GitHub denied the request. Check token permissions or rate limits.' });
            }

            return res.status(502).json({ error: 'GitHub is unavailable. Please try again.' });
        }

        console.error('GitHub fetch repos error', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

export default router;
