const { z } = require('zod');
console.log('Zod version:', require('zod/package.json').version);
try { console.log('z.cuid type:', typeof z.cuid); } catch(e) { console.log('z.cuid error:', e.message); }
try { console.log('z.string().cuid type:', typeof z.string().cuid); } catch(e) { console.log('z.string().cuid error:', e.message); }
