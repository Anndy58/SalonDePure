const fs = require('fs');
let content = fs.readFileSync('src/components/CoverCard.jsx', 'utf8');

const regex = /<div\s+className="h-full transition-all duration-500 relative"\s+style={{[\s\S]*?width: \`\$\{progressPercent\}%\`,[\s\S]*?}}\s*>/;

content = content.replace(regex, `<div
              className="h-full transition-all duration-500 relative rounded-r-md shadow-lg"
              style={{
                width: \`\${progressPercent}%\`,
                backgroundColor: 'var(--radio-color, #d4af37)',
                boxShadow: \`0 0 10px var(--radio-color, #d4af37)\`,
              }}
            >
              <span className="absolute right-1 text-[8px] text-white -top-3 leading-none drop-shadow-md font-bold">{Math.round(progressPercent)}%</span>`);

fs.writeFileSync('src/components/CoverCard.jsx', content);
