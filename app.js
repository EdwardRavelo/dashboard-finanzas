// =====================================================================
// 🔗 1. CONEXIÓN AL SERVIDOR
// =====================================================================
// REEMPLAZA ESTO POR TU URL REAL ("https://script.google.com/macros/s/.../exec")
const API_URL = "https://script.google.com/macros/s/AKfycbxAZF_PcCKfTwEqjZvOS4o2qWNlbXGjegrfJ8ZkyFBPd5dS0hWuPRAKaXz5aVrzLOs/exec";

// Variables globales para guardar los gráficos y poder destruirlos al cambiar de mes
let chartTorta, chartTop, chartEvo;

// =====================================================================
// 🚀 2. INICIO Y NAVEGACIÓN
// =====================================================================
// Disparo directo (Sin DOMContentLoaded)
cargarDatosDelServidor("");

// Escuchamos los cambios en el menú de meses
document.getElementById('selector-mes').addEventListener('change', function(evento) {
    cargarDatosDelServidor(evento.target.value);
});

// =====================================================================
// 📥 3. MÓDULO DE LECTURA DE DATOS (GET)
// =====================================================================
async function cargarDatosDelServidor(mesRequerido) {
    const selector = document.getElementById('selector-mes');
    selector.disabled = true; 
    
    // Feedback visual (reloj de arena)
    document.getElementById('val-credito').innerText = '⏳';
    document.getElementById('val-debito').innerText = '⏳';
    document.getElementById('val-total').innerText = '⏳';
    document.getElementById('val-credito-usd').innerText = 'Calculando...';
    document.getElementById('val-debito-usd').innerText = 'Calculando...';
    document.getElementById('val-total-usd').innerText = 'Calculando...';

    try {
        const urlFinal = mesRequerido ? `${API_URL}?mes=${mesRequerido}` : API_URL;
        const respuesta = await fetch(urlFinal);
        const datosReales = await respuesta.json();
        
        dibujarPantalla(datosReales);
    } catch (error) {
        console.error("Error al conectar con la base de datos:", error);
        alert("Ocurrió un error al cargar los datos del servidor.");
    } finally {
        selector.disabled = false; 
    }
}

// =====================================================================
// 🎨 4. MÓDULO DE DIBUJO Y GRÁFICOS (Renderizado)
// =====================================================================
function dibujarPantalla(datos) {
    // 1. Selector de meses
    const selector = document.getElementById('selector-mes');
    if (selector.options.length <= 1) {
        selector.innerHTML = "";
        datos.mesesDisponibles.forEach(m => {
            let opcion = document.createElement('option');
            opcion.value = m; opcion.innerText = m;
            if(m === datos.mesSeleccionado) opcion.selected = true;
            selector.appendChild(opcion);
        });
    }

    // 2. Tarjetas KPI Superiores
    document.getElementById('val-credito').innerText = datos.kpis.credito;
    document.getElementById('val-debito').innerText = datos.kpis.debito;
    document.getElementById('val-total').innerText = datos.kpis.total;
    // Inyectamos los dólares
    document.getElementById('val-credito-usd').innerText = datos.kpis.creditoUSD;
    document.getElementById('val-debito-usd').innerText = datos.kpis.debitoUSD;
    document.getElementById('val-total-usd').innerText = datos.kpis.totalUSD;

    // --- CONFIGURACIÓN GLOBAL CHART.JS ---
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Outfit';

    // 3. Gráfico de Torta (Doughnut)
    const labelsTorta = datos.graficos.torta.slice(1).map(item => item[0]);
    const dataTorta = datos.graficos.torta.slice(1).map(item => item[1]);
    
    if(chartTorta) chartTorta.destroy(); 
    chartTorta = new Chart(document.getElementById('grafico-torta'), {
        type: 'doughnut',
        data: {
            labels: labelsTorta,
            datasets: [{
                data: dataTorta,
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'],
                borderWidth: 0, hoverOffset: 10
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right' } } }
    });

    // 4. Gráfico Top 10 (Barras)
    const labelsTop = datos.graficos.top.slice(1).map(item => item[0]);
    const dataTop = datos.graficos.top.slice(1).map(item => item[1]);

    if(chartTop) chartTop.destroy();
    chartTop = new Chart(document.getElementById('grafico-top'), {
        type: 'bar',
        data: {
            labels: labelsTop,
            datasets: [{
                label: 'Gastado', data: dataTop,
                backgroundColor: '#3b82f6', borderRadius: 6, barThickness: 20
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 5. Gráfico de Evolución (Área curveada)
    const labelsEvo = datos.graficos.evolucion.slice(1).map(item => item[0]);
    const dataEvo = datos.graficos.evolucion.slice(1).map(item => item[1]);

    if(chartEvo) chartEvo.destroy();
    const ctxEvo = document.getElementById('grafico-evolucion').getContext('2d');
    
    // Degradado para la curva
    let gradient = ctxEvo.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    chartEvo = new Chart(ctxEvo, {
        type: 'line',
        data: {
            labels: labelsEvo,
            datasets: [{
                label: 'Gasto Total', data: dataEvo,
                borderColor: '#10b981', backgroundColor: gradient,
                borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#10b981'
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { 
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 6. Tabla Dinámica de Cuotas Pendientes
    const cuerpoTabla = document.getElementById('cuerpo-cuotas');
    cuerpoTabla.innerHTML = ""; 

    if (datos.cuotas && datos.cuotas.length > 0) {
        datos.cuotas.forEach(item => {
            const fila = document.createElement('tr');
            
            const celdaComercio = document.createElement('td');
            celdaComercio.innerText = item.comercio;
            
            const celdaCuota = document.createElement('td');
            celdaCuota.innerText = item.cuota;
            celdaCuota.style.textAlign = 'center';
            
            const celdaMonto = document.createElement('td');
            celdaMonto.innerText = "$" + item.monto.toLocaleString('es-AR', {minimumFractionDigits: 0});
            celdaMonto.style.textAlign = 'right';
            celdaMonto.className = 'monto-tabla'; 
            
            fila.appendChild(celdaComercio);
            fila.appendChild(celdaCuota);
            fila.appendChild(celdaMonto);
            cuerpoTabla.appendChild(fila);
        });
    } else {
        const filaVacia = document.createElement('tr');
        const celdaVacia = document.createElement('td');
        celdaVacia.colSpan = 3; 
        celdaVacia.innerText = "Operaciones en 1 pago o sin cuotas pendientes.";
        celdaVacia.style.textAlign = "center";
        celdaVacia.style.color = "var(--text-muted)";
        filaVacia.appendChild(celdaVacia);
        cuerpoTabla.appendChild(filaVacia);
    }

    // 🚀 7. NUEVO: DIBUJAR EXTRACTO DEL MES (A prueba de fallos si no tenés el HTML)
    const cuerpoExtracto = document.getElementById('cuerpo-extracto');
    if (cuerpoExtracto) {
        cuerpoExtracto.innerHTML = ''; 

        if (!datos.extracto || datos.extracto.length === 0) {
            cuerpoExtracto.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">No hay movimientos este mes.</td></tr>';
        } else {
            datos.extracto.forEach(mov => {
                const colorMonto = mov.tipo === 'DEBITO' ? 'var(--neon-green)' : 'var(--text-main)';
                const textUSD = mov.montoUSD > 0 ? `u$s ${mov.montoUSD.toFixed(2)}` : '<span style="color: rgba(255,255,255,0.1)">-</span>';
                const textARS = mov.montoARS > 0 ? `$ ${mov.montoARS.toLocaleString('es-AR')}` : '<span style="color: rgba(255,255,255,0.1)">-</span>';
                
                cuerpoExtracto.innerHTML += `
                    <tr>
                        <td style="color: var(--text-muted); font-size: 13px;">${mov.fecha}</td>
                        <td style="font-weight: 600;">${mov.comercio}</td>
                        <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${mov.categoria}</span></td>
                        <td style="text-align: right; font-weight: 800; color: ${colorMonto};">${textARS}</td>
                        <td style="text-align: right; color: var(--text-muted); font-size: 14px;">${textUSD}</td>
                    </tr>
                `;
            });
        }
    }
}

// =====================================================================
// 📤 5. MÓDULO DE SUBIDA DE ARCHIVOS (POST)
// =====================================================================

// Cuando clickean "Subir Resumen", validamos el mes destino
document.getElementById('btn-subir').addEventListener('click', () => {
    // 🚀 NUEVO: Exigimos que haya seleccionado un mes
    const mesDestino = document.getElementById('mes-destino') ? document.getElementById('mes-destino').value : null;
    
    // Si el input existe pero está vacío, frenamos el proceso
    if (document.getElementById('mes-destino') && !mesDestino) {
        alert("⚠️ Por favor, selecciona a qué mes corresponde el resumen antes de subirlo.");
        return;
    }
    
    document.getElementById('input-archivo').click();
});

// Cuando el usuario elige el archivo de su computadora...
document.getElementById('input-archivo').addEventListener('change', function(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return; 

    // Capturamos el mes que eligió el usuario
    const mesDestino = document.getElementById('mes-destino') ? document.getElementById('mes-destino').value : "";

    const lector = new FileReader();
    
    lector.onload = async function(e) {
        const contenidoBase64 = e.target.result;
        
        const boton = document.getElementById('btn-subir');
        boton.innerText = "⏳ Procesando...";
        boton.disabled = true;

        try {
            // Empaquetamos todo, incluyendo la Ley Absoluta del mes
            const paquete = {
                accion: "subir_e_importar",
                nombre: archivo.name,
                mimeType: archivo.type,
                archivoBase64: contenidoBase64,
                mesDestino: mesDestino // 🚀 NUEVO: Mandamos el mes al servidor
            };

            const respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify(paquete)
            });

            const resultado = await respuesta.json();
            alert(resultado.mensaje);

            if (resultado.exito) {
                // Si todo salió bien, actualizamos la pantalla para ver los datos frescos
                const selectorMes = document.getElementById('selector-mes');
                if (selectorMes) {
                    cargarDatosDelServidor(selectorMes.value);
                }
            }
            
        } catch (error) {
            console.error("Error en la subida:", error);
            alert("Ocurrió un error al intentar enviar el archivo al servidor.");
        } finally {
            boton.innerText = "💳 Subir Resumen";
            boton.disabled = false;
            document.getElementById('input-archivo').value = ""; 
        }
    };
    
    lector.readAsDataURL(archivo);
});

// =====================================================================
// 🔍 6. MÓDULO DE CLASIFICACIÓN WEB
// =====================================================================

// Abrir el modal
document.getElementById('btn-clasificar').addEventListener('click', async () => {
    document.getElementById('modal-clasificar').style.display = 'flex';
    const contenedor = document.getElementById('contenido-modal');
    contenedor.innerHTML = '<p style="text-align: center; color: var(--text-muted);">⏳ Escaneando base de datos...</p>';

    try {
        const respuesta = await fetch(`${API_URL}?accion=pendientes`);
        const datos = await respuesta.json();

        if (datos.pendientes.length === 0) {
            contenedor.innerHTML = '<h3 style="text-align: center; color: var(--text-main);">🏆 ¡Todo al día! No hay gastos sin clasificar.</h3>';
            return;
        }

        let htmlTabla = `
            <table class="tabla-elegante" id="tabla-pendientes">
                <thead><tr><th>Nombre Original</th><th>Sugerencia (Editable)</th><th>Categoría</th></tr></thead>
                <tbody>
        `;

        let opcionesCat = `<option value="">-- Seleccionar --</option>`;
        datos.categorias.forEach(cat => opcionesCat += `<option value="${cat}">${cat}</option>`);

        datos.pendientes.forEach((item, index) => {
            htmlTabla += `
                <tr data-cruda="${item.cruda}">
                    <td style="color: var(--text-muted); font-size: 12px;">${item.cruda}</td>
                    <td><input type="text" class="input-sugerencia" value="${item.limpia}" style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(255,255,255,0.1); color: white; border: none; outline: none;"></td>
                    <td><select class="select-categoria">${opcionesCat}</select></td>
                </tr>
            `;
        });

        htmlTabla += `</tbody></table>`;
        htmlTabla += `<button id="btn-guardar-clasif" class="btn-accion" style="width: 100%; margin-top: 20px; margin-left: 0;">💾 Guardar Clasificaciones</button>`;
        
        contenedor.innerHTML = htmlTabla;

        document.getElementById('btn-guardar-clasif').addEventListener('click', guardarClasificaciones);

    } catch (error) {
        contenedor.innerHTML = '<p style="color: #ef4444;">Error conectando con el servidor.</p>';
    }
});

function cerrarModal() {
    document.getElementById('modal-clasificar').style.display = 'none';
}

async function guardarClasificaciones() {
    const filas = document.querySelectorAll('#tabla-pendientes tbody tr');
    const reglasParaGuardar = [];

    filas.forEach(fila => {
        const inputClave = fila.querySelector('.input-sugerencia').value.trim().toUpperCase();
        const selectCat = fila.querySelector('.select-categoria').value;
        
        if (selectCat !== "") {
            reglasParaGuardar.push({ clave: inputClave, cat: selectCat });
        }
    });

    if (reglasParaGuardar.length === 0) {
        alert("No seleccionaste ninguna categoría para guardar.");
        return;
    }

    const boton = document.getElementById('btn-guardar-clasif');
    boton.innerText = "⏳ Guardando en la nube...";
    boton.disabled = true;

    try {
        const paquete = {
            accion: "guardar_clasificaciones",
            reglas: reglasParaGuardar
        };

        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(paquete)
        });

        const resultado = await respuesta.json();
        alert(resultado.mensaje);

        if (resultado.exito) {
            cerrarModal();
            const mesActual = document.getElementById('selector-mes').value;
            cargarDatosDelServidor(mesActual);
        }
    } catch (error) {
        alert("Error al intentar guardar las clasificaciones.");
        boton.innerText = "💾 Guardar Clasificaciones";
        boton.disabled = false;
    }
}