const fs = require('fs');
let content = fs.readFileSync('src/components/AnimeCatalogView.jsx', 'utf8');

const oldDef = `const AnimeCatalogView = React.memo(({
  onOpenAnime,
  library,
  onSet,
  onRemove,
  colors,
  watched,
  recommendations = [],
  anilistUser = null,
}) => {
  const COLORS = colors;`;

const newDef = `const AnimeCatalogView = React.memo(({
  onOpenAnime,
  onSet,
  onRemove,
  colors,
}) => {
  const { library, watched, recommendations, anilistUser } = useStore();
  const COLORS = colors;`;

content = content.replace(oldDef, newDef);
fs.writeFileSync('src/components/AnimeCatalogView.jsx', content);
