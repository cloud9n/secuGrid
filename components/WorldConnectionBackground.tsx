import React, { useRef, useEffect } from 'react';

const WorldConnectionBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- Configuration ---
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        // --- World Map "Dots" ---
        // A simplified set of coordinates approximating continents (0-100 scale)
        // Roughly: North America, South America, Europe, Africa, Asia, Australia
        const mapPoints: [number, number][] = [
            // North America
            [15, 20], [20, 22], [25, 25], [10, 25], [18, 30], [22, 35], [28, 32],
            // South America
            [28, 55], [32, 60], [30, 70], [35, 65], [38, 50],
            // Europe
            [50, 25], [52, 22], [55, 20], [58, 28], [52, 30],
            // Africa
            [50, 45], [55, 50], [52, 60], [58, 65], [60, 55], [55, 40],
            // Asia
            [70, 25], [75, 22], [80, 28], [85, 35], [72, 35], [65, 30], [82, 45], [90, 30],
            // Australia
            [85, 75], [90, 72], [88, 80]
        ];

        // Scale points to canvas
        const getScaledPoint = (p: [number, number]) => ({
            x: (p[0] / 100) * width,
            y: (p[1] / 100) * height * 0.8 + (height * 0.1) // Center vertically a bit
        });

        // Create Nodes from Map Points + Random Filler
        interface Node { x: number; y: number; active: boolean; isHub: boolean }
        let nodes: Node[] = [];

        const initNodes = () => {
            nodes = [];
            // Map Hubs
            mapPoints.forEach(p => {
                const { x, y } = getScaledPoint(p);
                // Add some jitter
                nodes.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y + (Math.random() - 0.5) * 20,
                    active: Math.random() > 0.5,
                    isHub: true
                });
            });

            // Random filler nodes for atmosphere
            const numFiller = 20;
            for (let i = 0; i < numFiller; i++) {
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    active: Math.random() > 0.8,
                    isHub: false
                });
            }
        };

        initNodes();


        // "Signals" moving between nodes
        const signals: {
            startX: number;
            startY: number;
            endX: number;
            endY: number;
            progress: number;
            speed: number;
            isSecured: boolean
        }[] = [];


        // --- Render Loop ---
        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // 0. Draw World Map Outline (Optional explicit map, here we imply it via nodes)
            // For a better "map" feel, we could draw faint dots for all mapPoints first? 
            // Let's stick to the network graph implying the map.

            // 1. Draw Connections
            ctx.lineWidth = 0.5;

            nodes.forEach((node, i) => {
                nodes.forEach((otherNode, j) => {
                    if (i >= j) return;
                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Connect if close enough. Hubs connect further.
                    const maxDist = (node.isHub && otherNode.isHub) ? width * 0.15 : width * 0.08;

                    if (dist < maxDist) {
                        ctx.beginPath();
                        ctx.strokeStyle = node.isHub && otherNode.isHub ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)';
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(otherNode.x, otherNode.y);
                        ctx.stroke();

                        // Spawn signals
                        if (Math.random() < 0.002) {
                            signals.push({
                                startX: node.x,
                                startY: node.y,
                                endX: otherNode.x,
                                endY: otherNode.y,
                                progress: 0,
                                speed: Math.random() * 0.02 + 0.005,
                                isSecured: Math.random() > 0.2
                            });
                        }
                    }
                });

                // 2. Draw Nodes
                ctx.fillStyle = node.isHub
                    ? (node.active ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.3)')
                    : 'rgba(16, 185, 129, 0.1)';

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.isHub ? 2 : 1, 0, Math.PI * 2);
                ctx.fill();

                if (Math.random() < 0.01) node.active = !node.active;
            });

            // 3. Draw Moving Signals
            for (let i = signals.length - 1; i >= 0; i--) {
                const s = signals[i];
                s.progress += s.speed;

                if (s.progress >= 1) {
                    signals.splice(i, 1);
                    continue;
                }

                const currX = s.startX + (s.endX - s.startX) * s.progress;
                const currY = s.startY + (s.endY - s.startY) * s.progress;

                ctx.fillStyle = s.isSecured ? '#10b981' : '#ef4444';
                ctx.shadowBlur = s.isSecured ? 4 : 6;
                ctx.shadowColor = s.isSecured ? '#10b981' : '#ef4444';

                ctx.beginPath();
                ctx.arc(currX, currY, s.isSecured ? 1.5 : 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initNodes();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.5 }}
        />
    );
};

export default WorldConnectionBackground;
