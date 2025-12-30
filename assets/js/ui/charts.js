/**
 * Charts - Canvas-based charts (no libraries)
 */
const Charts = {
    /**
     * Draw a line chart
     */
    drawLine(canvas, data, options = {}) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        if (!data || data.length === 0) return;

        // Find min/max
        const values = data.map(d => d.value);
        const maxValue = Math.max(...values);
        const minValue = 0;

        // Calculate step
        const step = chartWidth / (data.length - 1 || 1);
        const valueHeight = (maxValue - minValue) || 1;

        // Draw grid lines
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = '#FF5A1F';
        ctx.lineWidth = 3;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + index * step;
            const y = height - padding - ((point.value - minValue) / valueHeight) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw points
        ctx.fillStyle = '#FF5A1F';
        data.forEach((point, index) => {
            const x = padding + index * step;
            const y = height - padding - ((point.value - minValue) / valueHeight) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        data.forEach((point, index) => {
            const x = padding + index * step;
            ctx.fillText(point.label, x, height - 20);
        });

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = minValue + (valueHeight / 4) * i;
            const y = height - padding - (chartHeight / 4) * i;
            ctx.fillText(Math.round(value), padding - 10, y + 4);
        }
    },

    /**
     * Draw a bar chart
     */
    drawBar(canvas, data, options = {}) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        if (!data || data.length === 0) return;

        const values = data.map(d => d.value);
        const maxValue = Math.max(...values, 1);

        // Colors for bars
        const colors = ['#FF5A1F', '#10B981', '#2563EB', '#F59E0B', '#8B5CF6'];

        const barWidth = chartWidth / data.length * 0.7;
        const barGap = chartWidth / data.length;

        // Draw bars
        data.forEach((bar, index) => {
            const x = padding + index * barGap + (barGap - barWidth) / 2;
            const barHeight = (bar.value / maxValue) * chartHeight;
            const y = height - padding - barHeight;

            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);

            // Label
            ctx.fillStyle = '#6B7280';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(bar.label, x + barWidth / 2, height - 20);

            // Value on top of bar
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(Math.round(bar.value), x + barWidth / 2, y - 5);
        });

        // Y-axis labels
        ctx.textAlign = 'right';
        ctx.font = '12px Inter';
        ctx.fillStyle = '#6B7280';
        for (let i = 0; i <= 4; i++) {
            const value = Math.round((maxValue / 4) * i);
            const y = height - padding - (chartHeight / 4) * i;
            ctx.fillText(value, padding - 10, y + 4);
        }
    }
};

export default Charts;
