"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
router.post('/', authenticate, async (req, res) => {
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
                vulnerabilities: JSON.stringify(vulnerabilities)
            }
        });
        // Deduct credit for scan
        await prisma.user.update({
            where: { id: req.userId },
            data: { credits: { decrement: 1 } }
        });
        res.status(201).json(scan);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/history', authenticate, async (req, res) => {
    try {
        const scans = await prisma.scan.findMany({
            where: { userId: req.userId },
            orderBy: { timestamp: 'desc' }
        });
        const parsedScans = scans.map(scan => ({
            ...scan,
            vulnerabilities: JSON.parse(scan.vulnerabilities)
        }));
        res.json(parsedScans);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=scans.js.map