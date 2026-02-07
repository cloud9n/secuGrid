import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''; // Should be set in .env
const stripe = new Stripe(STRIPE_SECRET_KEY);

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

router.post('/create-checkout-session', authenticate, async (req: any, res) => {
    try {
        const { amount, credits } = req.body;
        // user id is req.userId

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${credits} Credits`,
                            description: 'SecuGrid AI Audit Credits',
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
            cancel_url: `${req.headers.origin}/settings?canceled=true`,
            metadata: {
                userId: req.userId,
                credits: credits.toString(),
            },
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe session creation failed', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/verify-session', authenticate, async (req: any, res) => {
    try {
        const { sessionId } = req.body;

        // Retrieve the session from Stripe to verify status
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const userId = session.metadata?.userId;
            const credits = parseInt(session.metadata?.credits || '0');
            const transactionId = session.payment_intent as string || session.id;

            // Check if we already credited this transaction
            const existingTx = await prisma.transaction.findUnique({
                where: { reference: transactionId } // We'll leverage the 'reference' field for Stripe ID
            });

            if (existingTx && existingTx.status === 'SUCCESS') {
                return res.json({ message: 'Credits already awarded', credits: (await prisma.user.findUnique({ where: { id: userId } }))?.credits });
            }

            // If not, record the transaction and update user
            await prisma.$transaction([
                prisma.transaction.upsert({
                    where: { reference: transactionId },
                    update: { status: 'SUCCESS' },
                    create: {
                        userId: userId!,
                        amount: session.amount_total! / 100,
                        credits: credits,
                        reference: transactionId,
                        status: 'SUCCESS'
                    }
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { credits: { increment: credits } }
                })
            ]);

            const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
            res.json({ status: 'success', credits: updatedUser?.credits });

        } else {
            res.json({ status: 'pending' });
        }

    } catch (error) {
        console.error('Session verification failed', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

export default router;
