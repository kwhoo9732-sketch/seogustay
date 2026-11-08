import { handleGuide } from '../lib/solar.mjs';

// Vercel's Node.js runtime accepts the Web Standard fetch export directly.
export default {
  fetch(request) {
    return handleGuide(request, process.env);
  },
};
