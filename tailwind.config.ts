import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
  	extend: {
  		boxShadow: {
  			md: '0px 1px 4px 0px rgba(133, 146, 173, 0.2)',
  			lg: '0 1rem 3rem rgba(0, 0, 0, 0.175)',
  			'dark-md': 'rgba(145, 158, 171, 0.3) 0px 0px 2px 0px, rgba(145, 158, 171, 0.02) 0px 12px 24px -4px',
  			sm: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
  			'btn-shadow': 'box-shadow: rgba(0, 0, 0, .05) 0 9px 17.5px'
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			tw: '12px'
  		},
  		container: {
  			center: true,
  			padding: '30px'
  		},
  		gap: {
  			'30': '30px'
  		},
  		padding: {
  			'30': '30px'
  		},
  		margin: {
  			'30': '30px'
  		},
  		colors: {
  			cyan: {
  				'500': 'var(--color-primary)',
  				'600': 'var(--color-primary)',
  				'700': 'var(--color-primary)'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			info: 'var(--color-info)',
  			success: 'var(--color-success)',
  			warning: 'var(--color-warning)',
  			error: 'var(--color-error)',
  			lightprimary: 'var(--color-lightprimary)',
  			lightsecondary: 'var(--color-lightsecondary)',
  			lightsuccess: 'var( --color-lightsuccess)',
  			lighterror: 'var(--color-lighterror)',
  			lightinfo: 'var(--color-lightinfo)',
  			lightwarning: 'var(--color-lightwarning)',
  			border: 'hsl(var(--border))',
  			bordergray: 'var(--color-bordergray)',
  			lightgray: 'var( --color-lightgray)',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			dark: 'var(--color-dark)',
  			link: 'var(--color-link)',
  			darklink: 'var(--color-darklink)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
