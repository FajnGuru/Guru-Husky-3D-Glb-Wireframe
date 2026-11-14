export function updateTriangleStats(partGroups) {
  let totalTris = 0;
  let totalVerts = 0;

  Object.entries(partGroups).forEach(([key, group]) => {
    let partTris = 0;
    if (group.visible) {
      group.traverse(obj => {
        if (obj.isMesh && !obj.userData.isOverlay) {
          const geo = obj.geometry;
          const tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
          const verts = geo.attributes.position.count;
          partTris += tris;
          totalTris += tris;
          totalVerts += verts;
        }
      });
    }
    const badge = document.getElementById(`stat-${key}`);
    if (badge) badge.textContent = `${Math.round(partTris).toLocaleString('cs-CZ')} △`;
  });

  document.getElementById('stat-tris').textContent = Math.round(totalTris).toLocaleString('cs-CZ');
  document.getElementById('stat-verts').textContent = Math.round(totalVerts).toLocaleString('cs-CZ');
  document.getElementById('total-tris-badge').textContent = `${Math.round(totalTris).toLocaleString('cs-CZ')} △`;
}
