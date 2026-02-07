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

        // --- Simplified World Data (Percentage based) ---
        // This is a refined set of points to form a recognizable world shape
        const worldDots: [number, number][] = [
            // North America
            [12, 18], [15, 17], [18, 18], [22, 18], [25, 20], [28, 18], [10, 22], [14, 21], [18, 22], [22, 22], [26, 23], [30, 22], [11, 26], [15, 25], [19, 26], [23, 27], [27, 26], [31, 26], [13, 30], [17, 31], [21, 31], [25, 30], [29, 31], [16, 35], [20, 36], [24, 35], [18, 40], [22, 41],
            // South America
            [26, 50], [30, 48], [27, 54], [31, 53], [35, 52], [28, 58], [32, 57], [36, 56], [29, 62], [33, 61], [31, 66], [34, 65], [32, 70], [33, 75],
            // Europe
            [48, 20], [52, 19], [56, 18], [47, 24], [51, 23], [55, 22], [59, 21], [49, 28], [53, 27], [57, 26], [61, 25], [52, 32], [56, 31], [60, 30],
            // Africa
            [48, 40], [52, 39], [56, 38], [60, 39], [49, 45], [53, 44], [57, 43], [61, 44], [51, 50], [55, 49], [59, 48], [63, 49], [52, 55], [56, 54], [60, 53], [54, 60], [58, 59], [55, 65], [57, 70],
            // Asia
            [68, 18], [72, 17], [76, 16], [80, 15], [84, 16], [88, 17], [92, 18], [69, 22], [73, 21], [77, 20], [81, 19], [85, 20], [89, 21], [93, 22], [70, 26], [74, 25], [78, 24], [82, 23], [86, 24], [90, 25], [94, 26], [72, 30], [76, 31], [80, 29], [84, 30], [88, 31], [92, 30], [75, 35], [79, 36], [83, 35], [87, 36], [91, 35], [78, 41], [82, 42], [86, 41], [90, 42], [81, 47], [85, 48], [89, 47],
            // Australia
            [82, 68], [86, 67], [90, 68], [83, 73], [87, 72], [91, 73], [85, 78], [89, 77]
        ];

        interface Node { x: number; y: number; active: boolean; isHub: boolean }
        let nodes: Node[] = [];
        let signals: {
            startX: number;
            startY: number;
            endX: number;
            endY: number;
            progress: number;
            speed: number;
            isSecured: boolean
        }[] = [];

        const getScaledPos = (p: [number, number]) => ({
            x: (p[0] / 100) * width,
            y: (p[1] / 100) * height
        });

        const init = () => {
            nodes = worldDots.map(p => ({
                ...getScaledPos(p),
                active: Math.random() > 0.7,
                isHub: Math.random() > 0.8
            }));
            signals = [];
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Connections
            ctx.lineWidth = 0.5;
            nodes.forEach((node, i) => {
                if (!node.isHub) return;

                nodes.forEach((otherNode, j) => {
                    if (i === j || !otherNode.isHub) return;

                    const dx = node.x - otherNode.x;
                    const dy = node.y - otherNode.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Connect hubs that are reasonably close (cross-continental feel)
                    const maxDist = width * 0.25;
                    if (dist < maxDist) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.1 * (1 - dist / maxDist)})`;
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(otherNode.x, otherNode.y);
                        ctx.stroke();

                        // Occasional signal
                        if (Math.random() < 0.001) {
                            signals.push({
                                startX: node.x,
                                startY: node.y,
                                endX: otherNode.x,
                                endY: otherNode.y,
                                progress: 0,
                                speed: random(0.005, 0.015),
                                isSecured: Math.random() > 0.3
                            });
                        }
                    }
                });
            });

            // 2. Draw Dots (The World Map)
            nodes.forEach(node => {
                ctx.fillStyle = node.isHub
                    ? (node.active ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.4)')
                    : 'rgba(16, 185, 129, 0.15)';

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.isHub ? 2.5 : 1.5, 0, Math.PI * 2);
                ctx.fill();

                if (Math.random() < 0.005) node.active = !node.active;
            });

            // 3. Draw Signals
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
                ctx.shadowBlur = s.isSecured ? 5 : 10;
                ctx.shadowColor = s.isSecured ? '#10b981' : '#ef4444';

                ctx.beginPath();
                ctx.arc(currX, currY, s.isSecured ? 2 : 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            requestAnimationFrame(render);
        };

        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        init();
        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.7 }}
        />
    );
};

export default WorldConnectionBackground;
