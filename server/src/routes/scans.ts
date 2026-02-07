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

// Helper for API Key auth
const authenticateKey = async (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'X-API-KEY header missing' });

    try {
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey as string },
            include: { user: true }
        });

        if (!keyRecord) return res.status(401).json({ error: 'Invalid API Key' });

        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsed: new Date() }
        });

        req.userId = keyRecord.userId;
        req.user = keyRecord.user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Auth failed' });
    }
};

import { analyzeSourceCode, analyzeTarget, simulateAttack, getRemediationAdvice } from '../services/geminiService';

router.post('/analyze', authenticate, async (req: any, res) => {
    try {
        const { url } = req.body;
        const report = await analyzeTarget(url);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Analysis failed' });
    }
});

router.post('/simulate-attack', authenticate, async (req: any, res) => {
    try {
        const { url, type } = req.body;
        const report = await simulateAttack(url, type);
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Simulation failed' });
    }
});

router.post('/remediation', authenticate, async (req: any, res) => {
    try {
        const { title, description, query } = req.body;
        const advice = await getRemediationAdvice(title, description, query);
        res.json({ advice });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get advice' });
    }
});

router.post('/', authenticate, async (req: any, res) => {
    try {
        const { targetUrl, duration, endpointsScanned, threatsIdentified, securityScore, summary, vulnerabilities } = req.body;

        const scan = await prisma.scan.create({
            data: {
                userId: req.userId,
                targetUrl,
                duration,
                endpointsScanned,
                threatsIdentified,
                securityScore,
                summary,
                vulnerabilities: typeof vulnerabilities === 'string' ? vulnerabilities : JSON.stringify(vulnerabilities)
            }
        });

        // Deduct credit for scan
        await prisma.user.update({
            where: { id: req.userId },
            data: { credits: { decrement: 1 } }
        });

        res.status(201).json(scan);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/history', authenticate, async (req: any, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const scans = await prisma.scan.findMany({
            where: { userId: req.userId },
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        const parsedScans = scans.map(scan => ({
            ...scan,
            vulnerabilities: JSON.parse(scan.vulnerabilities)
        }));

        res.json(parsedScans);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/cli', authenticateKey, async (req: any, res) => {
    try {
        const { codeContent, targetUrl } = req.body;

        if (req.user.credits < 1) {
            return res.status(403).json({ error: 'Insufficient credits. Buy more to continue.' });
        }

        // Run actual AI analysis
        const report = await analyzeSourceCode(codeContent);

        // Save scan
        await prisma.scan.create({
            data: {
                userId: req.userId,
                targetUrl: targetUrl || 'cli-scan',
                duration: report.stats.duration,
                endpointsScanned: report.stats.endpointsScanned,
                threatsIdentified: report.stats.threatsIdentified,
                securityScore: report.stats.securityScore,
                summary: report.summary,
                vulnerabilities: JSON.stringify(report.vulnerabilities)
            }
        });

        // Deduct credit
        await prisma.user.update({
            where: { id: req.userId },
            data: { credits: { decrement: 1 } }
        });

        res.json(report);
    } catch (error) {
        console.error('CLI Scan Error:', error);
        res.status(500).json({ error: 'AI Analysis failed' });
    }
});

export default router;
