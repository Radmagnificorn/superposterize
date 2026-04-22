import { initTabs }        from './tabs.js';
import { SPoster }          from './SPoster.js';
import { PixelNormalizer }  from './PixelNormalizer.js';
import { initParticles }    from './particles.js';

initTabs();
new SPoster().initialize();
new PixelNormalizer().initialize();
initParticles();
