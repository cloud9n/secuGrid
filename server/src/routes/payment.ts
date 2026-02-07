import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

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

router.post('/initialize', authenticate, async (req: any, res) => {
    try {
        const { amount, credits } = req.body;
        const reference = `secugrid_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

        await prisma.transaction.create({
            data: {
                userId: req.userId,
                amount,
                credits,
                reference,
                status: 'PENDING'
            }
        });

        res.json({ reference });
    } catch (error) {
        console.error('Failed to initialize payment', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/verify', authenticate, async (req: any, res) => {
    try {
        const { reference } = req.body;

        // Call Paystack to verify
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`
            }
        });

        if (response.data.data.status === 'success') {
            const transaction = await prisma.transaction.findUnique({
                where: { reference }
            });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            if (transaction.status === 'SUCCESS') {
                return res.json({ message: 'Credits already awarded' });
            }

            // Update transaction and user credits
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { reference },
                    data: { status: 'SUCCESS' }
                }),
                prisma.user.update({
                    where: { id: req.userId },
                    data: { credits: { increment: transaction.credits } }
                })
            ]);

            const updatedUser = await prisma.user.findUnique({
                where: { id: req.userId }
            });

            res.json({ status: 'success', credits: updatedUser?.credits });
        } else {
            await prisma.transaction.update({
                where: { reference },
                data: { status: 'FAILED' }
            });
            res.status(400).json({ status: 'failed', error: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Payment verification error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
