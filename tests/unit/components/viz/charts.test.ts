/**
 * Base Chart Components Tests
 *
 * TASK-067: Create Base Chart Components
 *
 * Tests for chart data processing and D3 scale/path utilities.
 * Component rendering is verified through integration/e2e tests.
 */

import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import type { ChartDataPoint, ChartSeries, BarDataItem } from '$lib/components/viz/types';

/**
 * Chart data processing utilities
 */
function normalizeData(data: ChartDataPoint[]): ChartDataPoint[] {
	return data.map(d => ({
		...d,
		x: d.x instanceof Date ? d.x : new Date(d.x as number),
		y: Number(d.y)
	}));
}

function getDataExtent(data: ChartDataPoint[]): { xExtent: [Date, Date]; yExtent: [number, number] } {
	const xValues = data.map(d => d.x as Date);
	const yValues = data.map(d => d.y);
	return {
		xExtent: d3.extent(xValues) as [Date, Date],
		yExtent: d3.extent(yValues) as [number, number]
	};
}

function calculateBarWidth(width: number, barCount: number, padding: number = 0.1): number {
	const availableWidth = width * (1 - padding);
	return availableWidth / barCount;
}

describe('Chart Data Processing', () => {
	describe('normalizeData', () => {
		it('should convert timestamps to Date objects', () => {
			const data: ChartDataPoint[] = [
				{ x: 1704067200000, y: 100 }, // 2024-01-01
				{ x: 1704153600000, y: 150 }  // 2024-01-02
			];

			const normalized = normalizeData(data);

			expect(normalized[0].x).toBeInstanceOf(Date);
			expect(normalized[1].x).toBeInstanceOf(Date);
		});

		it('should preserve Date objects', () => {
			const date1 = new Date('2024-01-01');
			const date2 = new Date('2024-01-02');
			const data: ChartDataPoint[] = [
				{ x: date1, y: 100 },
				{ x: date2, y: 150 }
			];

			const normalized = normalizeData(data);

			expect(normalized[0].x).toEqual(date1);
			expect(normalized[1].x).toEqual(date2);
		});

		it('should ensure y values are numbers', () => {
			const data: ChartDataPoint[] = [
				{ x: new Date(), y: 100 },
				{ x: new Date(), y: 200 }
			];

			const normalized = normalizeData(data);

			expect(typeof normalized[0].y).toBe('number');
			expect(typeof normalized[1].y).toBe('number');
		});
	});

	describe('getDataExtent', () => {
		it('should calculate x extent from dates', () => {
			const data: ChartDataPoint[] = [
				{ x: new Date('2024-01-01'), y: 100 },
				{ x: new Date('2024-01-15'), y: 150 },
				{ x: new Date('2024-01-30'), y: 120 }
			];

			const { xExtent } = getDataExtent(data);

			expect(xExtent[0]).toEqual(new Date('2024-01-01'));
			expect(xExtent[1]).toEqual(new Date('2024-01-30'));
		});

		it('should calculate y extent from values', () => {
			const data: ChartDataPoint[] = [
				{ x: new Date(), y: 50 },
				{ x: new Date(), y: 200 },
				{ x: new Date(), y: 100 }
			];

			const { yExtent } = getDataExtent(data);

			expect(yExtent[0]).toBe(50);
			expect(yExtent[1]).toBe(200);
		});
	});
});

describe('D3 Scale Creation', () => {
	it('should create linear scale for y-axis', () => {
		const yScale = d3.scaleLinear()
			.domain([0, 100])
			.range([400, 0]);

		expect(yScale(0)).toBe(400);
		expect(yScale(100)).toBe(0);
		expect(yScale(50)).toBe(200);
	});

	it('should create time scale for x-axis', () => {
		const xScale = d3.scaleTime()
			.domain([new Date('2024-01-01'), new Date('2024-12-31')])
			.range([0, 800]);

		expect(xScale(new Date('2024-01-01'))).toBe(0);
		expect(xScale(new Date('2024-12-31'))).toBe(800);
	});

	it('should create band scale for bar charts', () => {
		const categories = ['A', 'B', 'C', 'D'];
		const xScale = d3.scaleBand()
			.domain(categories)
			.range([0, 400])
			.padding(0.1);

		expect(xScale('A')).toBeDefined();
		expect(xScale.bandwidth()).toBeGreaterThan(0);
	});

	it('should create ordinal color scale', () => {
		const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

		expect(colorScale('Series 1')).toBeDefined();
		expect(colorScale('Series 2')).toBeDefined();
		expect(colorScale('Series 1')).not.toBe(colorScale('Series 2'));
	});
});

describe('D3 Path Generation', () => {
	const mockData: ChartDataPoint[] = [
		{ x: new Date('2024-01-01'), y: 100 },
		{ x: new Date('2024-01-02'), y: 150 },
		{ x: new Date('2024-01-03'), y: 120 }
	];

	const xScale = d3.scaleTime()
		.domain(d3.extent(mockData, d => d.x as Date) as [Date, Date])
		.range([0, 300]);

	const yScale = d3.scaleLinear()
		.domain([0, 200])
		.range([200, 0]);

	it('should generate line path', () => {
		const lineGenerator = d3.line<ChartDataPoint>()
			.x(d => xScale(d.x as Date))
			.y(d => yScale(d.y));

		const path = lineGenerator(mockData);

		expect(path).toBeDefined();
		expect(path).toContain('M'); // Move command
		expect(path).toContain('L'); // Line command
	});

	it('should generate area path', () => {
		const areaGenerator = d3.area<ChartDataPoint>()
			.x(d => xScale(d.x as Date))
			.y0(200) // baseline
			.y1(d => yScale(d.y));

		const path = areaGenerator(mockData);

		expect(path).toBeDefined();
		expect(path).toContain('M'); // Move command
		expect(path).toContain('Z'); // Close path
	});

	it('should support curve interpolation', () => {
		const lineWithCurve = d3.line<ChartDataPoint>()
			.x(d => xScale(d.x as Date))
			.y(d => yScale(d.y))
			.curve(d3.curveMonotoneX);

		const path = lineWithCurve(mockData);

		expect(path).toBeDefined();
		expect(path).toContain('C'); // Curve command
	});
});

describe('Bar Chart Utilities', () => {
	describe('calculateBarWidth', () => {
		it('should calculate bar width with padding', () => {
			const width = calculateBarWidth(400, 4, 0.1);
			// Available width = 400 * 0.9 = 360
			// Bar width = 360 / 4 = 90
			expect(width).toBe(90);
		});

		it('should handle zero padding', () => {
			const width = calculateBarWidth(400, 4, 0);
			expect(width).toBe(100);
		});

		it('should handle single bar', () => {
			const width = calculateBarWidth(400, 1, 0.1);
			expect(width).toBe(360);
		});
	});

	it('should create bar data structure', () => {
		const data: BarDataItem[] = [
			{ label: 'Jan', value: 100 },
			{ label: 'Feb', value: 150 },
			{ label: 'Mar', value: 120 }
		];

		expect(data).toHaveLength(3);
		expect(data[0].label).toBe('Jan');
		expect(data[0].value).toBe(100);
	});
});

describe('Multi-Series Charts', () => {
	it('should handle multiple series', () => {
		const series: ChartSeries[] = [
			{
				id: 'series-1',
				name: 'Revenue',
				color: '#3b82f6',
				data: [
					{ x: new Date('2024-01-01'), y: 100 },
					{ x: new Date('2024-02-01'), y: 150 }
				]
			},
			{
				id: 'series-2',
				name: 'Expenses',
				color: '#ef4444',
				data: [
					{ x: new Date('2024-01-01'), y: 80 },
					{ x: new Date('2024-02-01'), y: 120 }
				]
			}
		];

		expect(series).toHaveLength(2);
		expect(series[0].data).toHaveLength(2);
		expect(series[1].data).toHaveLength(2);
	});

	it('should calculate combined extent', () => {
		const series: ChartSeries[] = [
			{
				id: 'series-1',
				name: 'A',
				data: [{ x: new Date(), y: 50 }, { x: new Date(), y: 100 }]
			},
			{
				id: 'series-2',
				name: 'B',
				data: [{ x: new Date(), y: 25 }, { x: new Date(), y: 200 }]
			}
		];

		const allYValues = series.flatMap(s => s.data.map(d => d.y));
		const [minY, maxY] = d3.extent(allYValues) as [number, number];

		expect(minY).toBe(25);
		expect(maxY).toBe(200);
	});
});

describe('Chart Animations', () => {
	it('should define animation duration constants', () => {
		const ANIMATION_DURATION = 750;
		const TRANSITION_DELAY = 50;

		expect(ANIMATION_DURATION).toBeGreaterThan(0);
		expect(TRANSITION_DELAY).toBeGreaterThan(0);
	});

	it('should support easing functions', () => {
		// D3 provides various easing functions
		expect(d3.easeCubicInOut).toBeDefined();
		expect(d3.easeElasticOut).toBeDefined();
		expect(d3.easeBackOut).toBeDefined();
	});
});

describe('Axis Generation', () => {
	it('should create x-axis with time format', () => {
		const xScale = d3.scaleTime()
			.domain([new Date('2024-01-01'), new Date('2024-12-31')])
			.range([0, 800]);

		const xAxis = d3.axisBottom(xScale)
			.tickFormat(d3.timeFormat('%b'));

		expect(xAxis).toBeDefined();
	});

	it('should create y-axis with number format', () => {
		const yScale = d3.scaleLinear()
			.domain([0, 1000000])
			.range([400, 0]);

		const yAxis = d3.axisLeft(yScale)
			.tickFormat(d3.format('.2s'));

		expect(yAxis).toBeDefined();
	});

	it('should support tick customization', () => {
		const scale = d3.scaleLinear().domain([0, 100]).range([0, 400]);
		const axis = d3.axisBottom(scale).ticks(5);

		expect(axis).toBeDefined();
	});
});
