/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: 'hsl(222.2 47.4% 11.2%)',
					foreground: 'hsl(210 40% 98%)'
				},
				destructive: {
					DEFAULT: 'hsl(0 84.2% 60.2%)',
					foreground: 'hsl(210 40% 98%)'
				},
				accent: {
					DEFAULT: 'hsl(210 40% 96.1%)',
					foreground: 'hsl(222.2 47.4% 11.2%)'
				},
				input: 'hsl(214.3 31.8% 91.4%)',
				ring: 'hsl(222.2 84% 4.9%)',
				background: 'hsl(0 0% 100%)',
				foreground: 'hsl(222.2 84% 4.9%)'
			}
		}
	},
	plugins: []
};
