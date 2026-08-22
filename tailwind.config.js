/**
 * Tailwind CSS configuration.
 *
 * The `content` list tells Tailwind which files to scan for class names.
 * If you ever add a new folder of components and the styles mysteriously
 * stop working, this list is the first place to check.
 *
 * The `theme.extend` block registers our polar colour palette with Tailwind,
 * so you can write classes like `bg-navy-900`, `text-ice` or `border-line`.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#08111A',
          900: '#0C1A26',
          850: '#102331',
          800: '#152B3B',
          700: '#1C3A4E',
          600: '#2A4E64',
        },
        line: '#223D4C',
        ice: {
          DEFAULT: '#6FD6D6',
          dim: '#3C7A80',
        },
        signal: {
          orange: '#FF6A3D',
          amber: '#E8B84B',
          green: '#4FC98A',
          red: '#FF5A5A',
          blue: '#5AA9FF',
        },
        ink: {
          hi: '#EAF3F5',
          mid: '#A5BDC7',
          low: '#6A8593',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Arial Narrow', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
      },
    },
  },
  plugins: [],
}
