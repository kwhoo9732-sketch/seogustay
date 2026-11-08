import { handleGuide } from '../../lib/solar.mjs';

export default {
  fetch(request) {
    return handleGuide(request, process.env);
  },
};
