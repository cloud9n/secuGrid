import express from 'express';
import { PrismaClient } from '@prisma/client';
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

router.get('/profile', authenticate, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { apiKeys: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/preferences', authenticate, async (req: any, res) => {
    try {
        const { aiProvider, aiModel } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: req.userId },
            data: {
                ...(typeof aiProvider === 'string' ? { aiProvider } : {}),
                ...(typeof aiModel === 'string' ? { aiModel } : {})
            },
            include: { apiKeys: true }
        });

        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/api-keys', authenticate, async (req: any, res) => {
    try {
        const { key } = req.body;
        const apiKey = await prisma.apiKey.create({
            data: {
                key,
                userId: req.userId
            }
        });
        res.status(201).json(apiKey);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/api-keys/:id', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        await prisma.apiKey.delete({
            where: { id, userId: req.userId }
        });
        res.json({ message: 'API Key deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
