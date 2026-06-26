import { renderToStaticMarkup } from 'react-dom/server';
import App from './App.js';

const html = renderToStaticMarkup(<App />);
console.log(`Rendered chart HTML length: ${html.length}`);
console.log('Market data source example SSR smoke passed.');
