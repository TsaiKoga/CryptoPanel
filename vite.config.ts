import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';

// 插件：自动在 HTML 中注入 CSS 链接
function injectCSSPlugin() {
  return {
    name: 'inject-css',
    enforce: 'post',
    closeBundle() {
      const distDir = 'dist';
      if (!existsSync(distDir)) {
        console.warn('[inject-css] dist directory does not exist');
        return;
      }
      
      // 查找所有 CSS 文件
      const cssFiles: string[] = [];
      const assetsDir = path.join(distDir, 'assets');
      
      if (existsSync(assetsDir)) {
        const files = readdirSync(assetsDir, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.css')) {
            cssFiles.push(file.name);
            console.log(`[inject-css] Found CSS file: ${file.name}`);
          }
        }
      }
      
      // 如果使用固定文件名，检查是否存在
      if (cssFiles.length === 0 && existsSync(path.join(assetsDir, 'style.css'))) {
        cssFiles.push('style.css');
        console.log('[inject-css] Using style.css');
      }
      
      if (cssFiles.length === 0) {
        console.warn('[inject-css] No CSS files found in assets directory');
      }
      
      // 更新 HTML 文件
      const htmlFiles = ['popup.html', 'options.html'];
      for (const htmlFile of htmlFiles) {
        const htmlPath = path.join(distDir, htmlFile);
        if (existsSync(htmlPath)) {
          let htmlContent = readFileSync(htmlPath, 'utf-8');
          
          // 移除旧的 CSS 链接（如果有）
          htmlContent = htmlContent.replace(/<link[^>]*\.css[^>]*>/gi, '');
          
          // 在 </head> 之前注入 CSS 链接（使用相对路径）
          if (cssFiles.length > 0) {
            const cssLinks = cssFiles
              .map(css => `  <link rel="stylesheet" href="assets/${css}">`)
              .join('\n');
            
            if (htmlContent.includes('</head>')) {
              htmlContent = htmlContent.replace(
                '</head>',
                `${cssLinks}\n</head>`
              );
            } else {
              // 如果没有 </head>，在 <head> 后面添加
              htmlContent = htmlContent.replace(
                '<head>',
                `<head>\n${cssLinks}`
              );
            }
            
            console.log(`[inject-css] Injected CSS into ${htmlFile}`);
          }
          
          writeFileSync(htmlPath, htmlContent, 'utf-8');
        } else {
          console.warn(`[inject-css] HTML file not found: ${htmlPath}`);
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest.json to dist
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        copyFileSync('manifest.json', 'dist/manifest.json');
        
        // Copy HTML files
        if (existsSync('public/popup.html')) {
          copyFileSync('public/popup.html', 'dist/popup.html');
        }
        if (existsSync('public/options.html')) {
          copyFileSync('public/options.html', 'dist/options.html');
        }
        
        // Copy icons if they exist
        ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
          if (existsSync(`public/${icon}`)) {
            copyFileSync(`public/${icon}`, `dist/${icon}`);
          }
        });
      },
    },
    injectCSSPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.mjs',
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    cssMinify: false, // 暂时关闭压缩，方便调试
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup.tsx'),
        options: path.resolve(__dirname, 'src/options.tsx'),
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // CSS 文件使用固定名称，方便 HTML 引用
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/style.css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    emptyOutDir: true,
  },
  define: {
    'process.env': {},
  },
});

