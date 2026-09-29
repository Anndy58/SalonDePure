const fs = require('fs');

let content = fs.readFileSync('src/components/AnimeCatalogView.jsx', 'utf8');

// 1. Añadir el import
content = content.replace(
  `import { Search, Info, List, Grid2X2 } from "lucide-react";`,
  `import { Search, Info, List, Grid2X2 } from "lucide-react";\nimport { useStore } from '../store/useStore';`
);

// 2. Modificar la definición de las props y el interior del componente
content = content.replace(
  `const AnimeCatalogView = React.memo(({
  onOpenAnime,
  library,
  onSet,
  onRemove,
  colors,
  watched,
  recommendations = [],
  anilistUser = null,
}) => {
  const COLORS = colors;`,
  `const AnimeCatalogView = React.memo(({
  onOpenAnime,
  onSet,
  onRemove,
  colors,
}) => {
  const { library, watched, recommendations, anilistUser } = useStore();
  const COLORS = colors;`
);

// 3. Ya que App.jsx ya no le pasará esas props, es seguro.
fs.writeFileSync('src/components/AnimeCatalogView.jsx', content);

// 4. Quitar las props del uso de AnimeCatalogView en App.jsx
let appContent = fs.readFileSync('src/App.jsx', 'utf8');
appContent = appContent.replace(
  `<AnimeCatalogView 
        onOpenAnime={handleOpenAnime} 
        library={library} 
        onSet={addOrUpdate} 
        onRemove={remove} 
        colors={COLORS} 
        watched={watched}
        recommendations={recommendations}
        anilistUser={anilistUser}
      />`,
  `<AnimeCatalogView 
        onOpenAnime={handleOpenAnime} 
        onSet={addOrUpdate} 
        onRemove={remove} 
        colors={COLORS} 
      />`
);
fs.writeFileSync('src/App.jsx', appContent);
