import { describe, it, expect } from 'vitest';

describe('Testing Setup', () => {
	it('should pass a simple test', () => {
		expect(1 + 1).toBe(2);
	});

	it('should have access to DOM testing utilities', () => {
		const div = document.createElement('div');
		div.textContent = 'Hello World';
		expect(div).toHaveTextContent('Hello World');
	});
});
