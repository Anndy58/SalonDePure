const fs = require('fs');
let content = fs.readFileSync('src/components/AnimeCatalogView.jsx', 'utf8');

const arr = content.split('\n');
const start = arr.findIndex(l => l.includes('const AnimeCatalogView = React.memo(({'));
if(start !== -1) {
  let end = -1;
  for(let i = start; i < arr.length; i++) {
    if(arr[i].includes('const COLORS = colors;')) {
      end = i;
      break;
    }
  }
  if(end !== -1) {
    const replacement = [
      'const AnimeCatalogView = React.memo(({',
      '  onOpenAnime,',
      '  onSet,',
      '  onRemove,',
      '  colors,',
      '}) => {',
      '  const { library, watched, recommendations, anilistUser } = useStore();',
      '  const COLORS = colors;'
    ];
    arr.splice(start, end - start + 1, ...replacement);
    fs.writeFileSync('src/components/AnimeCatalogView.jsx', arr.join('\n'));
  }
}
