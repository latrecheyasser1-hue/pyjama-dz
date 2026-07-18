const fs = require('fs');
let code = fs.readFileSync('src/components/admin/StockTab.jsx', 'utf8');

code = code.replace(
  '  return (\n    <div className="animate-fade-up">\n      <div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: 24 }}>',
  '  return (\n    <>\n    <div className="animate-fade-up">\n      <div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: 24 }}>'
);

code = code.replace(
  '      </div>\n\n      {/* Form Modal */}',
  '      </div>\n      </div>\n\n      {/* Form Modal */}'
);

code = code.replace(
  '      )}\n\n      {/* View Selection: Categories Grid vs Product List */}',
  '      )}\n\n      <div className="animate-fade-up">\n      {/* View Selection: Categories Grid vs Product List */}'
);

code = code.replace(
  '        </div>\n        </>\n      )}\n\n      {/* Canvas Color Picker from Image Modal */}',
  '        </div>\n        </>\n      )}\n      </div>\n\n      {/* Canvas Color Picker from Image Modal */}'
);

code = code.replace(
  '      />\n    </div>\n  );\n}',
  '      />\n    </>\n  );\n}'
);

const imagesBlockRegex = /\{\/\* Multiple Images Upload \*\/\}.*?\{\/\* Multi-Color & Multi-Size Matrix \*\/\}/s;
code = code.replace(imagesBlockRegex, '{/* Multi-Color & Multi-Size Matrix */}');

const stateRegex = /\s*const \[images, setImages\] = useState\(\[''\]\);/g;
code = code.replace(stateRegex, '');

const handleAddImageUrlRegex = /\s*const handleAddImageUrl = \(\) => \{[^\}]*\};/s;
code = code.replace(handleAddImageUrlRegex, '');

const handleUpdateImageUrlRegex = /\s*const handleUpdateImageUrl = \(index, value\) => \{[^\}]*\};/s;
code = code.replace(handleUpdateImageUrlRegex, '');

const handleRemoveImageRegex = /\s*const handleRemoveImage = \(index\) => \{[^\}]*\};/s;
code = code.replace(handleRemoveImageRegex, '');

code = code.replace(/\s*setImages\(product\.images \|\| \[''\]\);/g, '');

code = code.replace(/\s*const validImages = images\.filter\(img => img\.trim\(\) !== ''\);/g, '');

const productDataImagesRegex = /images: validImages\.length > 0 \? validImages : \[colorVariants\[0\]\?\.image\]\.filter\(Boolean\),/g;
code = code.replace(productDataImagesRegex, 'images: [colorVariants[0]?.image].filter(Boolean),');

code = code.replace(/\s*setImages\(\[''\]\);/g, '');

fs.writeFileSync('src/components/admin/StockTab.jsx', code);
console.log('Done!');
