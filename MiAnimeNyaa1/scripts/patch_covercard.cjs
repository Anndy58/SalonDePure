const fs = require('fs');

let content = fs.readFileSync('src/components/CoverCard.jsx', 'utf8');

// The original line is:
// <div className="h-full transition-all duration-500 relative"
// we need to replace it with:
// <div className="h-full transition-all duration-500 relative rounded-md shadow-lg"
// And also inject the span for the progress text.

content = content.replace(
  `<div
              className="h-full transition-all duration-500 relative"
              style={{
                width: \`\${progressPercent}%\`,
                backgroundColor: 'var(--radio-color, #d4af37)',
                boxShadow: \`0 0 10px var(--radio-color, #d4af37)\`,
              }}
            >`,
  `<div
              className="h-full transition-all duration-500 relative rounded-md shadow-lg"
              style={{
                width: \`\${progressPercent}%\`,
                backgroundColor: 'var(--radio-color, #d4af37)',
                boxShadow: \`0 0 10px var(--radio-color, #d4af37)\`,
              }}
            >
              <span className="absolute right-1 text-[8px] text-white top-0 leading-none drop-shadow-md">{Math.round(progressPercent)}%</span>`
);

fs.writeFileSync('src/components/CoverCard.jsx', content);
