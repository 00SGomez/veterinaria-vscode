/* ═══════════════════════════════════════════
   VetMap Bogotá — program.js
   Conecta con la API en el mismo servidor.
   ═══════════════════════════════════════════ */

// Detecta automáticamente el host donde corre la API.
// Si el archivo se abre directo (file://), usa localhost:8000 como fallback.
const API = "http://localhost:8000";

// ─── Mapa ────────────────────────────────────
const map = L.map("map").setView([4.6200, -74.1560], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
}).addTo(map);

let capaLocalidades = null;
let capaVeterinarias = null;
let marcadorBusqueda = null;
let circuloBusqueda = null;

// ─── Iconos personalizados ────────────────────
const iconVet = L.divIcon({
    className: "",
    html: `<div style="
        width:32px;height:32px;
        background:#a8ff3e;
        border:3px solid #0d0f14;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 12px rgba(168,255,62,0.5);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
});

const iconBusqueda = L.divIcon({
    className: "",
    html: `<div style="
        width:20px;height:20px;
        background:#3effa8;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 4px rgba(62,255,168,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// ─── Utilidades ──────────────────────────────
function showPanel(titulo, html) {
    document.getElementById("panel-title").textContent = titulo;
    document.getElementById("info-content").innerHTML = html;
    document.getElementById("info-panel").classList.remove("hidden");
}

function showLoading(titulo) {
    showPanel(titulo, `
        <div class="loading">
            <div class="spinner"></div>
            <span>Cargando datos…</span>
        </div>
    `);
}

function showToast(msg, duration = 2500) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    setTimeout(() => t.classList.add("hidden"), duration);
}

function formatCOP(n) {
    return "$ " + Number(n).toLocaleString("es-CO");
}

function badgeSeg(seg) {
    return `<span class="badge badge-seg-${seg}">${seg.toUpperCase()}</span>`;
}

function buildVetCard(v, showDist = false) {
    const distHtml = showDist && v.distancia_km != null
        ? `<span class="vet-dist">📍 ${v.distancia_km} km</span>`
        : "";

    const animalesBadges = (v.animales || [])
        .map(a => `<span class="badge badge-animal">${a}</span>`)
        .join("");

    return `
        <div class="vet-card" onclick="zoomVet(${v.lat}, ${v.lon}, '${v.nombre.replace(/'/g, "\\'")}')">
            <div class="vet-card-header">
                <span class="vet-name">${v.nombre}</span>
                ${distHtml}
            </div>
            <div class="vet-meta">
                ${badgeSeg(v.seguridad)}
                <span class="badge badge-price">${formatCOP(v.precio_promedio)}</span>
                <span class="badge badge-rating">⭐ ${v.calificacion}</span>
            </div>
            <div class="vet-meta">${animalesBadges}</div>
            <div class="vet-phone">📞 ${v.telefono} — ${v.localidad}</div>
        </div>
    `;
}

function zoomVet(lat, lon, nombre) {
    map.flyTo([lat, lon], 16, { duration: 0.8 });
    L.popup()
        .setLatLng([lat, lon])
        .setContent(`<div class="popup-name">🐾 ${nombre}</div><div class="popup-row">Coordenadas: <span>${lat}, ${lon}</span></div>`)
        .openOn(map);
}

// ─── Limpiar capas ────────────────────────────
function limpiarLocalidades() {
    if (capaLocalidades) { map.removeLayer(capaLocalidades); capaLocalidades = null; }
}
function limpiarVeterinarias() {
    if (capaVeterinarias) { map.removeLayer(capaVeterinarias); capaVeterinarias = null; }
}
function limpiarCirculo() {
    if (circuloBusqueda) { map.removeLayer(circuloBusqueda); circuloBusqueda = null; }
}

// ════════════════════════════════════════════
// BOTÓN: Ver veterinarias en mapa (todas)
// ════════════════════════════════════════════
document.getElementById("btn_Mapveterinaria").addEventListener("click", async () => {
    showLoading("Veterinarias en mapa");
    limpiarVeterinarias();
    limpiarCirculo();

    try {
        const res  = await fetch(`${API}/veterinarias`);
        const data = await res.json();
        const vets = data.veterinarias || [];

        capaVeterinarias = L.layerGroup();

        vets.forEach(v => {
            const marker = L.marker([v.lat, v.lon], { icon: iconVet });
            marker.bindPopup(`
                <div class="popup-name">🐾 ${v.nombre}</div>
                <div class="popup-row">Localidad: <span>${v.localidad}</span></div>
                <div class="popup-row">Seguridad: <span>${v.seguridad.toUpperCase()}</span></div>
                <div class="popup-row">Precio prom: <span>${formatCOP(v.precio_promedio)}</span></div>
                <div class="popup-row">Calificación: <span>⭐ ${v.calificacion}</span></div>
                <div class="popup-row">Tel: <span>${v.telefono}</span></div>
                <div class="popup-row">Animales: <span>${v.animales.join(", ")}</span></div>
            `);
            capaVeterinarias.addLayer(marker);
        });

        capaVeterinarias.addTo(map);

        const html = `
            <div class="search-summary">
                Mostrando <strong>${vets.length}</strong> veterinarias en toda Bogotá
            </div>
            <p class="section-title">Todas las veterinarias</p>
            <div class="vet-list">
                ${vets.map(v => buildVetCard(v)).join("")}
            </div>
        `;
        showPanel("📍 Mapa Veterinarias", html);
        showToast(`🐾 ${vets.length} veterinarias en el mapa`);

    } catch (err) {
        console.error(err);
        showPanel("Error", `<p style="color:var(--danger)">No se pudo conectar con la API.<br><small>${err.message}</small></p>`);
    }
});

// ════════════════════════════════════════════
// BUSCADOR POR RADIO
// ════════════════════════════════════════════
document.getElementById("btn-buscar-radio").addEventListener("click", async () => {
    const lat      = parseFloat(document.getElementById("input-lat").value);
    const lon      = parseFloat(document.getElementById("input-lon").value);
    const radio    = parseFloat(document.getElementById("input-radio").value) || 5;
    const animal   = document.getElementById("input-animal").value;
    const seguridad = document.getElementById("input-seguridad").value;

    if (isNaN(lat) || isNaN(lon)) {
        showToast("⚠️ Ingresa latitud y longitud válidas");
        return;
    }

    showLoading("Buscando veterinarias…");
    limpiarVeterinarias();
    limpiarCirculo();
    if (marcadorBusqueda) { map.removeLayer(marcadorBusqueda); }

    marcadorBusqueda = L.marker([lat, lon], { icon: iconBusqueda })
        .bindPopup("<b>Tu ubicación</b>")
        .addTo(map);

    // Círculo de radio
    circuloBusqueda = L.circle([lat, lon], {
        radius: radio * 1000,
        color: "#3effa8",
        weight: 1.5,
        fillColor: "#3effa8",
        fillOpacity: 0.04,
        dashArray: "6 4",
    }).addTo(map);

    try {
        let url = `${API}/veterinarias/buscar?lat=${lat}&lon=${lon}&radio_km=${radio}`;
        if (animal)    url += `&animal=${animal}`;
        if (seguridad) url += `&seguridad=${seguridad}`;

        const res  = await fetch(url);
        const data = await res.json();
        const vets = data.veterinarias || [];

        capaVeterinarias = L.layerGroup();

        vets.forEach(v => {
            const marker = L.marker([v.lat, v.lon], { icon: iconVet });
            marker.bindPopup(`
                <div class="popup-name">🐾 ${v.nombre}</div>
                <div class="popup-row">Distancia: <span style="color:var(--accent)">${v.distancia_km} km</span></div>
                <div class="popup-row">Localidad: <span>${v.localidad}</span></div>
                <div class="popup-row">Seguridad: <span>${v.seguridad.toUpperCase()}</span></div>
                <div class="popup-row">Precio prom: <span>${formatCOP(v.precio_promedio)}</span></div>
                <div class="popup-row">Calificación: <span>⭐ ${v.calificacion}</span></div>
                <div class="popup-row">Tel: <span>${v.telefono}</span></div>
                <div class="popup-row">Animales: <span>${v.animales.join(", ")}</span></div>
            `);
            capaVeterinarias.addLayer(marker);
        });

        capaVeterinarias.addTo(map);
        map.flyTo([lat, lon], 13, { duration: 0.8 });

        const localidadOrigen = data.punto_consulta?.localidad || "Desconocida";

        const filtrosHtml = [
            animal    ? `Animal: <strong>${animal}</strong>` : null,
            seguridad ? `Seguridad: <strong>${seguridad}</strong>` : null,
        ].filter(Boolean).join(" · ");

        const html = `
            <div class="search-summary">
                <strong>${vets.length}</strong> veterinarias en radio de <strong>${radio} km</strong><br>
                Tu localidad: <strong>${localidadOrigen}</strong>
                ${filtrosHtml ? `<br>${filtrosHtml}` : ""}
            </div>
            ${vets.length === 0
                ? `<p style="color:var(--text-dim);font-size:13px;padding:20px 0;text-align:center;">Sin resultados para los filtros dados.</p>`
                : `<p class="section-title">Ordenadas por distancia</p>
                   <div class="vet-list">${vets.map(v => buildVetCard(v, true)).join("")}</div>`
            }
        `;
        showPanel("🔍 Resultado Búsqueda", html);
        showToast(`✅ ${vets.length} veterinarias encontradas`);

    } catch (err) {
        console.error(err);
        showPanel("Error", `<p style="color:var(--danger)">No se pudo conectar con la API.<br><small>${err.message}</small></p>`);
    }
});

// ════════════════════════════════════════════
// DISTANCIAS
// ════════════════════════════════════════════
document.getElementById("info_distancia").addEventListener("click", async () => {
    showLoading("Distancias");
    try {
        const res  = await fetch(`${API}/veterinarias`);
        const data = await res.json();
        const vets = data.veterinarias || [];

        // Calcular distancias desde el centro de Bogotá (4.6532, -74.0836)
        const CL = { lat: 4.6532, lon: -74.0836 };
        function hav(lat1, lon1, lat2, lon2) {
            const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        const conDist = vets.map(v => ({ ...v, dist: hav(CL.lat, CL.lon, v.lat, v.lon).toFixed(2) }))
            .sort((a, b) => a.dist - b.dist);

        const rows = conDist.map(v => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
                <span>${v.nombre}</span>
                <span style="color:var(--accent);font-family:var(--font-head);font-weight:700;">${v.dist} km</span>
            </div>
        `).join("");

        showPanel("📏 Distancias desde centro", `
            <div class="info-block">
                <span class="big-number">Bogotá</span>
                <span class="info-desc">Distancias desde el centro (4.6532, -74.0836)</span>
            </div>
            ${rows}
        `);
    } catch (err) {
        showPanel("Error", `<p style="color:var(--danger)">${err.message}</p>`);
    }
});

// ════════════════════════════════════════════
// COSTOS
// ════════════════════════════════════════════
document.getElementById("info_costos").addEventListener("click", async () => {
    showLoading("Costos");
    try {
        const res  = await fetch(`${API}/veterinarias`);
        const data = await res.json();
        const vets = data.veterinarias || [];

        const precios = vets.map(v => v.precio_promedio);
        const promedio = Math.round(precios.reduce((a, b) => a + b, 0) / precios.length);
        const minVet   = vets.reduce((a, b) => a.precio_promedio < b.precio_promedio ? a : b);
        const maxVet   = vets.reduce((a, b) => a.precio_promedio > b.precio_promedio ? a : b);

        const ordenadas = [...vets].sort((a, b) => a.precio_promedio - b.precio_promedio);

        showPanel("💰 Costos de servicio", `
            <div class="stat-grid">
                <div class="stat-card">
                    <span class="stat-value">${formatCOP(promedio)}</span>
                    <span class="stat-label">Promedio ciudad</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${formatCOP(minVet.precio_promedio)}</span>
                    <span class="stat-label">Más económica</span>
                </div>
            </div>
            <div class="info-block" style="margin-bottom:10px;">
                <span style="font-size:12px;color:var(--text-dim);">Más económica:</span>
                <strong style="color:var(--accent2)">${minVet.nombre}</strong> — ${minVet.localidad}
            </div>
            <div class="info-block" style="margin-bottom:12px;">
                <span style="font-size:12px;color:var(--text-dim);">Más costosa:</span>
                <strong style="color:var(--warn)">${maxVet.nombre}</strong> — ${maxVet.localidad} (${formatCOP(maxVet.precio_promedio)})
            </div>
            <p class="section-title">Todas ordenadas por precio</p>
            <div class="vet-list">${ordenadas.map(v => buildVetCard(v)).join("")}</div>
        `);
    } catch (err) {
        showPanel("Error", `<p style="color:var(--danger)">${err.message}</p>`);
    }
});

// ════════════════════════════════════════════
// NÚMERO DE EMERGENCIA
// ════════════════════════════════════════════
document.getElementById("info_numemergencia").addEventListener("click", () => {
    showPanel("🚨 Números de Emergencia", `
        <div class="info-block">
            <span class="big-number">🐾 164</span>
            <span class="info-desc">Línea animal de Bogotá (IDPYBA) — maltrato y emergencias</span>
        </div>
        <div class="info-block">
            <span class="big-number">123</span>
            <span class="info-desc">Emergencias generales — Policía / Bomberos / SAMU</span>
        </div>
        <div class="info-block">
            <span class="big-number">195</span>
            <span class="info-desc">Línea de atención Alcaldía de Bogotá</span>
        </div>
        <div class="info-block">
            <span class="big-number">311</span>
            <span class="info-desc">Policía Nacional — línea amigable</span>
        </div>
        <hr class="divider">
        <p style="font-size:12px;color:var(--text-dim);line-height:1.6;">
            En caso de emergencia veterinaria nocturna, muchas clínicas tienen servicio 24h.
            Comunícate directamente con la veterinaria más cercana.
        </p>
    `);
});

// ════════════════════════════════════════════
// SEGURIDAD MASCOTAS
// ════════════════════════════════════════════
document.getElementById("info_seguridad").addEventListener("click", () => {
    showPanel("🐾 Seguridad de Mascotas", `
        <div class="security-section">
            <h3 class="security-title">🐶 Seguridad para Perros</h3>
            <div class="security-tips">
                <p><strong>▪ Vacunación:</strong> Mantén al día las vacunas contra rabia, parvovirus y demás enfermedades.</p>
                <p><strong>▪ Identificación:</strong> Usa collar con número de teléfono y considera microchip.</p>
                <p><strong>▪ Paseos seguros:</strong> Camina siempre con correa en zonas urbanas y evita horas de mucho calor.</p>
                <p><strong>▪ Higiene:</strong> Baña a tu perro regularmente y revisa su piel por pulgas y garrapatas.</p>
                <p><strong>▪ Área de movimiento:</strong> Proporciona un espacio seguro para que pueda ejercitarse diariamente.</p>
                <p><strong>▪ Revisiones veterinarias:</strong> Lleva a tu perro al veterinario al menos 1 vez por año.</p>
            </div>

            <h3 class="security-title">🐱 Seguridad para Gatos</h3>
            <div class="security-tips">
                <p><strong>▪ Vacunación:</strong> Protégelo contra rabia, panleucopenia y calicivirus felino.</p>
                <p><strong>▪ Espacio interior:</strong> Si es posible, mantén a tu gato dentro de casa para evitar accidentes.</p>
                <p><strong>▪ Enriquecimiento:</strong> Proporciona juguetes, árboles y estímulos para evitar estrés.</p>
                <p><strong>▪ Caja de arena:</strong> Mantén limpia la bandeja sanitaria; cambia la arena regularmente.</p>
                <p><strong>▪ Desparasitación:</strong> Desparasita internamente cada 3 meses y externamente cada mes.</p>
                <p><strong>▪ Control veterinario:</strong> Visita al veterinario regularmente, especialmente después de los 7 años.</p>
            </div>

            <h3 class="security-title">🦜 Seguridad para Aves</h3>
            <div class="security-tips">
                <p><strong>▪ Jaula adecuada:</strong> Proporciona una jaula amplia, bien ventilada y sin herrumbre.</p>
                <p><strong>▪ Temperatura:</strong> Mantén una temperatura entre 18-25°C; evita cambios bruscos.</p>
                <p><strong>▪ Alimentación:</strong> Ofrece semillas, frutas y verduras frescas; cambia el agua diariamente.</p>
                <p><strong>▪ Higiene:</strong> Limpia la jaula y accesorios regularmente para evitar infecciones.</p>
                <p><strong>▪ Seguridad:</strong> Aléjalas de otras mascotas depredadoras y objetos tóxicos.</p>
                <p><strong>▪ Revisión médica:</strong> Consulta con veterinario especializado en aves al menos 1 vez al año.</p>
            </div>

            <h3 class="security-title">🐇 Seguridad para Conejos</h3>
            <div class="security-tips">
                <p><strong>▪ Espacio:</strong> Proporciona un área amplia para que pueda saltar y moverse libremente.</p>
                <p><strong>▪ Alimentación:</strong> Dieta rica en fibra: heno timothy, verduras y pellets de calidad.</p>
                <p><strong>▪ Temperatura:</strong> Mantén entre 15-20°C; evita humedad y corrientes de aire.</p>
                <p><strong>▪ Higiene:</strong> Limpia su conejo regularmente; revisa sus dientes y uñas.</p>
                <p><strong>▪ Protección:</strong> Aléjalos de depredadores y plantas tóxicas.</p>
                <p><strong>▪ Control veterinario:</strong> Lleva a tu conejo al veterinario especializado regularmente.</p>
            </div>

            <h3 class="security-title">🦎 Seguridad para Reptiles</h3>
            <div class="security-tips">
                <p><strong>▪ Terrario:</strong> Crea un ambiente mimético con temperatura, humedad y luz UV adecuadas.</p>
                <p><strong>▪ Iluminación:</strong> Proporciona luz UVB para metabolismo del calcio.</p>
                <p><strong>▪ Sustrato:</strong> Usa un sustrato seguro y específico para su especie.</p>
                <p><strong>▪ Alimentación:</strong> Investiga la dieta específica de tu reptil (insectos, plantas, etc.).</p>
                <p><strong>▪ Higiene:</strong> Mantén el terrario limpio; cambia el agua regularmente.</p>
                <p><strong>▪ Veterinario especializado:</strong> Consulta con un experto en reptiles para chequeos periódicos.</p>
            </div>

            <hr class="divider">
            <p style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-top:16px;">
                <strong>📌 Consejo importante:</strong> Ante cualquier signo de enfermedad, comportamiento anormal o emergencia, contacta 
                inmediatamente a tu veterinaria de confianza. La prevención y atención oportuna son clave para la salud de tu mascota.
            </p>
        </div>
    `);
});

// ════════════════════════════════════════════
// LISTA DE VETERINARIAS
// ════════════════════════════════════════════
document.getElementById("est_lista").addEventListener("click", async () => {
    showLoading("Lista Veterinarias");
    try {
        const res  = await fetch(`${API}/veterinarias`);
        const data = await res.json();
        const vets = data.veterinarias || [];

        showPanel("📋 Lista Completa", `
            <div class="search-summary">
                <strong>${vets.length}</strong> veterinarias registradas en Bogotá
            </div>
            <div class="vet-list">
                ${vets.map(v => buildVetCard(v)).join("")}
            </div>
        `);
    } catch (err) {
        showPanel("Error", `<p style="color:var(--danger)">${err.message}</p>`);
    }
});

// ════════════════════════════════════════════
// ANÁLISIS / RESUMEN CIUDAD
// ════════════════════════════════════════════
document.getElementById("analizar").addEventListener("click", async () => {
    showLoading("Análisis ciudad");
    try {
        const res  = await fetch(`${API}/resumen`);
        const data = await res.json();

        const locRows = Object.entries(data.veterinarias_por_localidad)
            .sort((a, b) => b[1] - a[1])
            .map(([loc, count]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                     padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
                    <span onclick="buscarLocalidad('${loc}')" style="cursor:pointer;">${loc}</span>
                    <span style="color:var(--accent);font-family:var(--font-head);font-weight:700;">${count} vet${count > 1 ? "s" : ""}</span>
                </div>
            `).join("");

        const animalesBadges = (data.animales_atendidos || [])
            .map(a => `<span class="badge badge-animal">${a}</span>`)
            .join(" ");

        showPanel("📊 Resumen Ciudad", `
            <div class="stat-grid">
                <div class="stat-card">
                    <span class="stat-value">${data.total_veterinarias}</span>
                    <span class="stat-label">Total vets</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">⭐ ${data.calificacion_promedio_ciudad}</span>
                    <span class="stat-label">Calif. promedio</span>
                </div>
                <div class="stat-card" style="grid-column:span 2;">
                    <span class="stat-value">${formatCOP(data.precio_promedio_ciudad)}</span>
                    <span class="stat-label">Precio promedio ciudad</span>
                </div>
            </div>
            <p class="section-title">Animales atendidos</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">${animalesBadges}</div>
            <p class="section-title">Vets por localidad</p>
            ${locRows}
        `);
    } catch (err) {
        showPanel("Error", `<p style="color:var(--danger)">${err.message}</p>`);
    }
});

// ════════════════════════════════════════════
// FUNCIÓN AUXILIAR: stats por localidad al click
// ════════════════════════════════════════════
async function buscarLocalidad(nombre) {
    showLoading(`Estadísticas — ${nombre}`);
    try {
        const res  = await fetch(`${API}/estadisticas/${encodeURIComponent(nombre)}`);
        const data = await res.json();

        const animalesBadges = (data.tipos_animales_atendidos || [])
            .map(a => `<span class="badge badge-animal">${a}</span>`).join(" ");

        showPanel(`📍 ${nombre}`, `
            <div class="stat-grid">
                <div class="stat-card">
                    <span class="stat-value">${data.cantidad}</span>
                    <span class="stat-label">Veterinarias</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">⭐ ${data.calificacion_promedio}</span>
                    <span class="stat-label">Calificación</span>
                </div>
                <div class="stat-card" style="grid-column:span 2;">
                    <span class="stat-value">${formatCOP(data.precio_promedio_servicio)}</span>
                    <span class="stat-label">Precio promedio servicio</span>
                </div>
            </div>
            <div class="info-block" style="margin-bottom:12px;">
                <span style="font-size:12px;color:var(--text-dim);">Seguridad predominante</span><br>
                ${badgeSeg(data.seguridad_predominante)}
            </div>
            <p class="section-title">Animales atendidos</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">${animalesBadges}</div>
            <p class="section-title">Veterinarias en esta localidad</p>
            <div class="vet-list">
                ${(data.veterinarias || []).map(v => buildVetCard(v)).join("")}
            </div>
        `);
    } catch (err) {
        showPanel("Error", `<p style="color:var(--danger)">${err.message}</p>`);
    }
}

// ─── Cerrar panel ─────────────────────────────
document.getElementById("close-panel").addEventListener("click", () => {
    document.getElementById("info-panel").classList.add("hidden");
});

// ─── Click en el mapa para auto-completar coords ─
map.on("click", e => {
    document.getElementById("input-lat").value = e.latlng.lat.toFixed(5);
    document.getElementById("input-lon").value = e.latlng.lng.toFixed(5);
    showToast(`📌 Coordenadas: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
});