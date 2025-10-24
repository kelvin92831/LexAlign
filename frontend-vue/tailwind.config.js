/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色系 - 柔和專業藍灰 (#5b7c99)
        primary: {
          50: '#f4f7fa',
          100: '#e8eef5',
          200: '#d6e1ed',
          300: '#b8cde0',
          400: '#94b3d0',
          500: '#7698bf',
          600: '#5b7c99',   // 主色
          700: '#4a6178',
          800: '#3e5163',
          900: '#364554',
        },
        // 中性灰階 - 大量使用
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // 輔助色 - 極少使用，柔和低調
        success: {
          50: '#f0f7f4',
          100: '#e1f0e9',
          500: '#6b9080',   // 柔和藍綠色
          600: '#5a7a6d',
        },
        warning: {
          50: '#fef9f3',
          100: '#fef3e7',
          500: '#d4a574',   // 柔和駝色
          600: '#b8906a',
        },
        danger: {
          50: '#fef5f5',
          100: '#fee8e8',
          500: '#d17b7b',   // 柔和紅棕色
          600: '#b86a6a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Microsoft JhengHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'lg': '0 4px 6px 0 rgba(0, 0, 0, 0.07)',
      },
    },
  },
  plugins: [],
}
