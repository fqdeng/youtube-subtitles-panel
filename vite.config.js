import {defineConfig} from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.js',
            userscript: {
                namespace: 'http://fqdeng.com',
                match: ['https://www.youtube.com/*', 'https://youtube.com/*'],
                require: ['https://cdn.jsdelivr.net/gh/fqdeng/youtube-subtitles-panel@master/jquery.min.fixed.js', 'https://cdn.jsdelivr.net/npm/jquery-ui@1.14.0/dist/jquery-ui.min.js'],
                downloadURL: 'https://raw.githubusercontent.com/fqdeng/youtube-subtitles-panel/master/main.user.js',
                updateURL: 'https://raw.githubusercontent.com/fqdeng/youtube-subtitles-panel/master/main.user.js',
                author: 'fqdeng',
                icon: 'https://www.google.com/s2/favicons?sz=64&domain=youtube.com',
                name: 'Youtube subtitles',
                version: '1.0.3'
            },
        }),
    ],
});
