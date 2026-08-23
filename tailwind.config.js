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

  /**
   * SAFELIST — READ THIS IF A COLOUR EVER GOES MISSING.
   *
   * Tailwind deletes any CSS rule in a `@layer components { }` block whose
   * class name it cannot FIND WRITTEN OUT in the files listed in `content`
   * above. It searches for plain text; it does not run our code.
   *
   * That is a problem for this app, because our badge colours are chosen at
   * run time from the data:
   *
   *     <span className={`badge badge--${tone}`}>       (src/components/Badge.jsx)
   *
   * Tailwind reads that line and sees the text "badge--". It has no way to
   * know that `tone` will one day be "warn", so it decided `.badge--warn`
   * was unused and deleted it. The badge then rendered with no background
   * and plain white text — the CSS was correct and present in
   * src/index.css, but it never reached the browser.
   *
   * This list tells Tailwind: keep every rule whose class starts with one
   * of these names, whether or not you can find it. `pattern` is a regular
   * expression, and `--` is just the two dashes in our class names.
   *
   * If you add a new modifier class to src/index.css (say `.badge--pink`)
   * it is covered automatically, because the pattern matches the prefix
   * rather than a list of exact names.
   *
   * Only classes that live INSIDE `@layer components { }` need to be here.
   * The map pin classes, for example, are deliberately written outside any
   * layer further down src/index.css, and Tailwind never touches those.
   * Listing a prefix that matches nothing makes `npm run build` print a
   * warning, so keep this list to what is really needed.
   */
  safelist: [
    { pattern: /^badge--/ },
    { pattern: /^dot--/ },
    { pattern: /^stat-value--/ },
    { pattern: /^progress--/ },
    { pattern: /^alert-strip--/ },
    { pattern: /^btn--/ },
    { pattern: /^nav-count--/ },
    { pattern: /^nav-item--/ },
  ],

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
