import fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/uzbekistan-provinces.json', 'utf8'));
const coords = {};
data.objects.default.geometries.forEach(g => {
  coords[g.properties.name] = [g.properties['hc-middle-lon'], g.properties['hc-middle-lat']];
});
console.log(coords);
