import fs from 'fs';

async function download() {
  const res = await fetch('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_1_states_provinces.json');
  const data = await res.json();
  const uzb = {
    type: "FeatureCollection",
    features: data.features.filter(f => f.properties.admin === 'Uzbekistan')
  };
  fs.writeFileSync('public/uzb-filtered.json', JSON.stringify(uzb));
  console.log("Filtered to", uzb.features.length, "features.");
  if (uzb.features.length === 0) {
      console.log("Names:", [...new Set(data.features.map(f => f.properties.admin))].filter(n => n && n.includes('Uz')));
  } else {
      console.log("Names:", uzb.features.map(f => f.properties.name));
  }
}

download();
