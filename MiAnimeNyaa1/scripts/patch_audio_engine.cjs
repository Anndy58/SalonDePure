const fs = require('fs');
let content = fs.readFileSync('src/hooks/useAudioEngine.js', 'utf8');

content = content.replace(
  `export function useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle }) {`,
  `export function useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle, customUrl }) {`
);

content = content.replace(
  `const src = \`\${getApiUrl()}/api/radio?station=\${station}&v=\${Date.now()}\`;`,
  `const src = customUrl ? customUrl : \`\${getApiUrl()}/api/radio?station=\${station}&v=\${Date.now()}\`;`
);

content = content.replace(
  `nextAudio.src = \`\${getApiUrl()}/api/radio?station=\${station}&v=\${Date.now()}\`;`,
  `nextAudio.src = customUrl ? customUrl : \`\${getApiUrl()}/api/radio?station=\${station}&v=\${Date.now()}\`;`
);

fs.writeFileSync('src/hooks/useAudioEngine.js', content);
