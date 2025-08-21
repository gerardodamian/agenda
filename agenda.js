// Detectar si estamos en local o en producción
const BASE_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:3001" // Desarrollo local
        : "https://agenda-backend-j7py.onrender.com"; // Producción

// ================== UTILIDADES ==================
function formatearFecha(fechaISO) {
    const partes = fechaISO.split("-"); // yyyy-mm-dd
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // dd/mm/yyyy
}

// Formatear fecha para mostrar día de la semana
function formatearFechaCompleta(fechaISO) {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dias = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
    ];
    const meses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ];

    const diaSemana = dias[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();

    return `${diaSemana}, ${dia} de ${mes} de ${año}`;
}

// Validar formato de teléfono argentino
function validarTelefono(telefono) {
    const cleaned = telefono.replace(/\D/g, "");
    return cleaned.length >= 8 && cleaned.length <= 15;
}

// Formatear teléfono para mostrar
function formatearTelefono(telefono) {
    const cleaned = telefono.replace(/\D/g, "");
    if (cleaned.length === 10) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(
            3,
            6
        )}-${cleaned.substring(6)}`;
    }
    return telefono;
}

// Capitalizar primera letra de cada palabra
function capitalizarTexto(texto) {
    return texto
        .split(" ")
        .map(
            (palabra) =>
                palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
        )
        .join(" ");
}

// Debounce para búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================== NOTIFICACIONES ==================
class NotificationManager {
    static show(message, type = "info", duration = 3000) {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${this.getIcon(type)}
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add("notification-exit");
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Close button
        notification
            .querySelector(".notification-close")
            .addEventListener("click", () => {
                notification.classList.add("notification-exit");
                setTimeout(() => notification.remove(), 300);
            });

        return notification;
    }

    static getIcon(type) {
        const icons = {
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️",
        };
        return icons[type] || icons.info;
    }
}

// ================== ESTADO DE LA APLICACIÓN ==================
class AppState {
    constructor() {
        this.currentDate = null;
        this.turnos = {};
        this.searchResults = [];
        this.isLoading = false;
    }

    setCurrentDate(date) {
        this.currentDate = date;
        this.updateDateDisplay();
    }

    updateDateDisplay() {
        const dateDisplay = document.getElementById(
            "fecha-seleccionada-display"
        );
        if (dateDisplay && this.currentDate) {
            dateDisplay.textContent = formatearFechaCompleta(this.currentDate);
        }
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const loader = document.getElementById("loading-indicator");
        if (loader) {
            loader.style.display = isLoading ? "block" : "none";
        }
    }
}

const appState = new AppState();

document.addEventListener("DOMContentLoaded", () => {
    const fechaInput = document.getElementById("fecha");
    const horariosDiv = document.getElementById("horarios");
    const nombresConsultorios = { 1: "Analia", 2: "Gerardo" };

    // ================== CONFIGURACIÓN INICIAL ==================
    // Establecer fecha actual por defecto
    if (!fechaInput.value) {
        const today = new Date();
        const formattedDate = today.toISOString().split("T")[0];
        fechaInput.value = formattedDate;
        appState.setCurrentDate(formattedDate);
    }

    // Agregar indicador de carga
    const container = document.querySelector(".container");
    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loading-indicator";
    loadingIndicator.innerHTML =
        '<div class="spinner"></div><span>Cargando...</span>';
    loadingIndicator.style.display = "none";
    container.appendChild(loadingIndicator);

    // Agregar display de fecha seleccionada
    const fechaDisplay = document.createElement("div");
    fechaDisplay.id = "fecha-seleccionada-display";
    fechaDisplay.className = "fecha-display";
    fechaInput.parentNode.insertBefore(fechaDisplay, fechaInput.nextSibling);

    // ================== FUNCIÓN PARA ACTUALIZAR CONTADOR MENSUAL ==================
    async function actualizarContadorMensual(fechaSeleccionada) {
        const [anio, mes] = fechaSeleccionada.split("-");
        try {
            const res = await fetch(`${BASE_URL}/turnos-mes/${anio}/${mes}`);
            const data = await res.json();

            let contadorMensual = document.getElementById("contador-mensual");
            if (!contadorMensual) {
                contadorMensual = document.createElement("div");
                contadorMensual.id = "contador-mensual";
                contadorMensual.className = "contador-info contador-mensual";
                // Insertar después del contador de turnos
                const contadorTurnos =
                    document.getElementById("contador-turnos");
                if (contadorTurnos) {
                    contadorTurnos.parentNode.insertBefore(
                        contadorMensual,
                        contadorTurnos.nextSibling
                    );
                }
            }

            const fechaMes = new Date(anio, mes - 1);
            const nombreMes = fechaMes.toLocaleDateString("es-ES", {
                month: "long",
                year: "numeric",
            });

            contadorMensual.innerHTML = `
                <div class="contador-mensual-content">
                    <div class="contador-mensual-header">
                        <span class="contador-mensual-icono">📊</span>
                        <span class="contador-mensual-titulo">Resumen mensual</span>
                    </div>
                    <div class="contador-mensual-datos">
                        <span class="contador-mensual-mes">${nombreMes}</span>
                        <span class="contador-mensual-numero">${data.total} turnos</span>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error("Error obteniendo turnos del mes", err);
            NotificationManager.show(
                "Error al cargar contador mensual",
                "warning"
            );
        }
    }

    // ================== EVENT LISTENERS ==================
    fechaInput.addEventListener("change", async () => {
        const fechaSeleccionada = fechaInput.value;
        if (fechaSeleccionada) {
            appState.setCurrentDate(fechaSeleccionada);
            await mostrarHorarios(fechaSeleccionada);
            await actualizarContadorMensual(fechaSeleccionada);
        }
    });

    // ================== FUNCIONES PRINCIPALES ==================
    // Leer turnos desde el backend
    async function getTurnosGuardados(fecha) {
        try {
            appState.setLoading(true);
            const res = await fetch(`${BASE_URL}/turnos/${fecha}`);
            if (!res.ok) throw new Error("Error al obtener turnos");
            const turnos = await res.json();
            appState.turnos = turnos;
            return turnos;
        } catch (err) {
            console.error("Error:", err);
            NotificationManager.show("Error al cargar turnos", "error");
            return {};
        } finally {
            appState.setLoading(false);
        }
    }

    // Guardar turno en el backend
    async function guardarTurno(fecha, hora, consultorio, turnoData) {
        try {
            await fetch(`${BASE_URL}/turnos/${fecha}/${hora}/${consultorio}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(turnoData),
            });

            // Actualizar estado local
            const key = `${hora}-${consultorio}`;
            if (!appState.turnos[key]) appState.turnos[key] = {};
            appState.turnos[key] = { ...appState.turnos[key], ...turnoData };

            return true;
        } catch (err) {
            console.error("Error al guardar turno:", err);
            NotificationManager.show("Error al guardar turno", "error");
            return false;
        }
    }

    async function mostrarHorarios(fecha) {
        horariosDiv.innerHTML = "";
        const turnosGuardados = await getTurnosGuardados(fecha);

        // Calcular estadísticas
        const turnosOcupados = Object.values(turnosGuardados).filter(
            (t) => t.nombre || t.telefono
        ).length;

        const turnosConDeposito = Object.values(turnosGuardados).filter(
            (t) => t.deposito
        ).length;

        // Actualizar contadores
        document.getElementById(
            "contador-turnos"
        ).textContent = `Turnos agendados: ${turnosOcupados}/30`;

        // Agregar contador de depósitos
        let contadorDepositos = document.getElementById("contador-depositos");
        if (!contadorDepositos) {
            contadorDepositos = document.createElement("div");
            contadorDepositos.id = "contador-depositos";
            contadorDepositos.className = "contador-info";
            document
                .getElementById("contador-turnos")
                .parentNode.appendChild(contadorDepositos);
        }
        contadorDepositos.textContent = `Depósitos confirmados: ${turnosConDeposito}`;

        for (let hora = 8; hora <= 22; hora++) {
            for (let consultorio = 1; consultorio <= 2; consultorio++) {
                const clave = `${hora}-${consultorio}`;
                const turno = turnosGuardados[clave] || {
                    nombre: "",
                    telefono: "",
                    deposito: false,
                    montoDeposito: "",
                    comentario: "",
                };

                const div = document.createElement("div");
                div.className = "horario";
                div.dataset.hora = hora;
                div.dataset.consultorio = consultorio;

                const estaOcupado =
                    turno.nombre ||
                    turno.telefono ||
                    turno.deposito ||
                    turno.comentario;

                if (estaOcupado) {
                    div.classList.add("agendado");
                    div.title = `Paciente: ${
                        turno.nombre || "Sin nombre"
                    }\nTel: ${formatearTelefono(
                        turno.telefono || "Sin teléfono"
                    )}\nDepósito: ${turno.deposito ? "✅" : "❌"}`;
                }

                // Estado del horario
                const estadoHorario = getEstadoHorario(hora);
                if (estadoHorario) {
                    div.classList.add(estadoHorario);
                }

                div.innerHTML = `
                  <div class="horario-header">
                    <h3>${formatearHoraInicio(hora)} (${
                    nombresConsultorios[consultorio]
                })</h3>

                    <div class="horario-status">
                      <span class="paciente-resumen">${
                          turno.nombre
                              ? capitalizarTexto(turno.nombre)
                              : "Disponible"
                      }</span>
                      ${
                          turno.deposito
                              ? '<span class="deposito-badge">💰</span>'
                              : ""
                      }
                      ${
                          turno.comentario
                              ? '<span class="comment-badge">📝</span>'
                              : ""
                      }
                    </div>
                  </div>
                  <div class="horario-detalle" style="display: none;">
                    <div class="form-group">
                      <input type="text" placeholder="Nombre del paciente" value="${
                          turno.nombre
                      }" 
                             class="nombre input-field" maxlength="50" />
                    </div>
                    <div class="form-group">
                      <input type="tel" placeholder="Teléfono (ej: 11-2345-6789)" value="${
                          turno.telefono
                      }" 
                             class="telefono input-field" maxlength="20" />
                      <small class="input-hint">Formato recomendado: 11-2345-6789</small>
                    </div>
                    <div class="form-group">
                      <label class="checkbox-label">
                        <input type="checkbox" ${
                            turno.deposito ? "checked" : ""
                        } class="deposito" />
                        <span class="checkmark"></span>
                        ¿Depósito realizado?
                      </label>
                    </div>
                    <div class="monto-container" style="display: ${
                        turno.deposito ? "block" : "none"
                    };">
                      <input type="number" placeholder="Monto del depósito ($)" value="${
                          turno.montoDeposito || ""
                      }" 
                             class="monto-deposito input-field" min="0" step="0.01" />
                    </div>
                    <div class="form-group">
                      <textarea placeholder="Comentarios adicionales..." class="comentario input-field" 
                                maxlength="200">${turno.comentario}</textarea>
                      <small class="char-counter">0/200 caracteres</small>
                    </div>
                    <div class="botones-turno">
                      <button class="btn-guardar">💾 Guardar</button>
                      <button class="btn-limpiar">🗑️ Limpiar</button>
                    </div>
                  </div>
                `;

                setupHorarioEventListeners(
                    div,
                    fecha,
                    hora,
                    consultorio,
                    turno
                );
                horariosDiv.appendChild(div);
            }
        }
    }

    // ================== FUNCIONES AUXILIARES ==================
    function formatearHorario(hora) {
        return `${hora.toString().padStart(2, "0")}:00 - ${(hora + 1)
            .toString()
            .padStart(2, "0")}:00`;
    }

    function formatearHoraInicio(hora) {
        return `${hora.toString().padStart(2, "0")}:00`;
    }


    function getEstadoHorario(hora) {
        const ahora = new Date();
        const horaActual = ahora.getHours();

        if (hora < horaActual) return "horario-pasado";
        if (hora === horaActual) return "horario-actual";
        return null;
    }

    function setupHorarioEventListeners(
        div,
        fecha,
        hora,
        consultorio,
        turnoInicial
    ) {
        // Toggle detalle
        const header = div.querySelector(".horario-header");
        const detalle = div.querySelector(".horario-detalle");
        header.style.cursor = "pointer";

        header.addEventListener("click", () => {
            const isVisible = detalle.style.display === "block";
            detalle.style.display = isVisible ? "none" : "block";
            div.classList.toggle("expanded", !isVisible);
        });

        // Elementos del formulario
        const nombreInput = div.querySelector(".nombre");
        const telefonoInput = div.querySelector(".telefono");
        const depositoCheckbox = div.querySelector(".deposito");
        const montoContainer = div.querySelector(".monto-container");
        const montoInput = div.querySelector(".monto-deposito");
        const comentarioTextarea = div.querySelector(".comentario");
        const charCounter = div.querySelector(".char-counter");

        // Contador de caracteres
        comentarioTextarea.addEventListener("input", () => {
            const count = comentarioTextarea.value.length;
            charCounter.textContent = `${count}/200 caracteres`;
            charCounter.style.color = count > 180 ? "#ff4444" : "#666";
        });

        // Formateo automático de nombre
        nombreInput.addEventListener("blur", () => {
            if (nombreInput.value.trim()) {
                nombreInput.value = capitalizarTexto(nombreInput.value.trim());
            }
        });

        // Validación de teléfono
        telefonoInput.addEventListener("blur", () => {
            const telefono = telefonoInput.value.trim();
            if (telefono && !validarTelefono(telefono)) {
                telefonoInput.style.borderColor = "#ff4444";
                NotificationManager.show(
                    "Formato de teléfono inválido",
                    "warning",
                    2000
                );
            } else {
                telefonoInput.style.borderColor = "";
                if (telefono) {
                    telefonoInput.value = formatearTelefono(telefono);
                }
            }
        });

        // Depósito checkbox
        depositoCheckbox.addEventListener("change", () => {
            montoContainer.style.display = depositoCheckbox.checked
                ? "block"
                : "none";
            if (!depositoCheckbox.checked) {
                montoInput.value = "";
            }
        });

        // Botón guardar
        const btnGuardar = div.querySelector(".btn-guardar");
        btnGuardar.addEventListener("click", async () => {
            await guardarTurnoConValidacion(div, fecha, hora, consultorio);
        });

        // Botón limpiar
        const btnLimpiar = div.querySelector(".btn-limpiar");
        btnLimpiar.addEventListener("click", () => {
            if (
                confirm(
                    "¿Estás seguro de que quieres limpiar todos los datos de este turno?"
                )
            ) {
                limpiarTurno(div, fecha, hora, consultorio);
            }
        });

        // Botón WhatsApp
        const whatsappButton = document.createElement("button");
        whatsappButton.textContent = "📱 WhatsApp";
        whatsappButton.className = "btn-whatsapp";
        whatsappButton.addEventListener("click", () => {
            enviarWhatsApp(div, fecha, hora, consultorio);
        });

        div.querySelector(".botones-turno").appendChild(whatsappButton);

        // Guardado automático con debounce
        const saveDebounced = debounce(() => {
            guardarTurnoSilencioso(fecha, hora, consultorio, div);
        }, 1000);

        [nombreInput, telefonoInput, comentarioTextarea, montoInput].forEach(
            (input) => {
                input.addEventListener("input", saveDebounced);
            }
        );

        depositoCheckbox.addEventListener("change", saveDebounced);
    }

    // ================== FUNCIONES DE ACCIÓN ==================
    async function guardarTurnoConValidacion(div, fecha, hora, consultorio) {
        const turnoData = extraerDatosTurno(div);

        // Validaciones
        if (turnoData.telefono && !validarTelefono(turnoData.telefono)) {
            NotificationManager.show(
                "El teléfono no tiene un formato válido",
                "error"
            );
            return;
        }

        const btnGuardar = div.querySelector(".btn-guardar");
        const originalText = btnGuardar.textContent;

        btnGuardar.disabled = true;
        btnGuardar.textContent = "⏳ Guardando...";
        btnGuardar.style.backgroundColor = "#ccc";

        const guardado = await guardarTurno(
            fecha,
            hora,
            consultorio,
            turnoData
        );

        if (guardado) {
            btnGuardar.textContent = "✅ Guardado";
            btnGuardar.style.backgroundColor = "#4CAF50";
            actualizarVisualizacionTurno(div, turnoData);
            await actualizarContadorTurnos(fecha);
            NotificationManager.show(
                "Turno guardado correctamente",
                "success",
                2000
            );
        } else {
            btnGuardar.textContent = "❌ Error";
            btnGuardar.style.backgroundColor = "#f44336";
        }

        setTimeout(() => {
            btnGuardar.disabled = false;
            btnGuardar.textContent = originalText;
            btnGuardar.style.backgroundColor = "#2196F3";
        }, 2000);
    }

    async function limpiarTurno(div, fecha, hora, consultorio) {
        const turnoVacio = {
            nombre: "",
            telefono: "",
            deposito: false,
            montoDeposito: "",
            comentario: "",
        };

        const guardado = await guardarTurno(
            fecha,
            hora,
            consultorio,
            turnoVacio
        );

        if (guardado) {
            // Limpiar formulario
            div.querySelector(".nombre").value = "";
            div.querySelector(".telefono").value = "";
            div.querySelector(".deposito").checked = false;
            div.querySelector(".monto-deposito").value = "";
            div.querySelector(".comentario").value = "";
            div.querySelector(".monto-container").style.display = "none";
            div.querySelector(".char-counter").textContent = "0/200 caracteres";

            actualizarVisualizacionTurno(div, turnoVacio);
            await actualizarContadorTurnos(fecha);
            NotificationManager.show(
                "Turno limpiado correctamente",
                "success",
                2000
            );
        }
    }

    


    function extraerDatosTurno(div) {
        return {
            nombre: div.querySelector(".nombre").value.trim(),
            telefono: div.querySelector(".telefono").value.trim(),
            deposito: div.querySelector(".deposito").checked,
            montoDeposito: div.querySelector(".monto-deposito").value.trim(),
            comentario: div.querySelector(".comentario").value.trim(),
        };
    }

    function actualizarVisualizacionTurno(div, turnoData) {
        const resumen = div.querySelector(".paciente-resumen");
        resumen.textContent = turnoData.nombre
            ? capitalizarTexto(turnoData.nombre)
            : "Disponible";

        const estaOcupado =
            turnoData.nombre ||
            turnoData.telefono ||
            turnoData.deposito ||
            turnoData.comentario;

        if (
            turno.nombre ||
            turno.telefono ||
            turno.deposito ||
            turno.comentario
        ) {
            div.classList.add("agendado");
            div.setAttribute(
                "data-hint",
                `👤 ${turno.nombre || "Sin nombre"}\n📞 ${
                    turno.telefono || "Sin teléfono"
                }\n💵 Depósito: ${turno.deposito ? "✅" : "❌"}\n📝 ${
                    turno.comentario || "Sin comentario"
                }`
            );
        } else {
            div.classList.remove("agendado");
            div.removeAttribute("data-hint");
        }


        // Actualizar badges
        const statusDiv = div.querySelector(".horario-status");
        let depositoBadge = statusDiv.querySelector(".deposito-badge");
        let commentBadge = statusDiv.querySelector(".comment-badge");

        if (turnoData.deposito && !depositoBadge) {
            depositoBadge = document.createElement("span");
            depositoBadge.className = "deposito-badge";
            depositoBadge.textContent = "💰";
            statusDiv.appendChild(depositoBadge);
        } else if (!turnoData.deposito && depositoBadge) {
            depositoBadge.remove();
        }

        if (turnoData.comentario && !commentBadge) {
            commentBadge = document.createElement("span");
            commentBadge.className = "comment-badge";
            commentBadge.textContent = "📝";
            statusDiv.appendChild(commentBadge);
        } else if (!turnoData.comentario && commentBadge) {
            commentBadge.remove();
        }
    }

    async function guardarTurnoSilencioso(fecha, hora, consultorio, div) {
        const turnoData = extraerDatosTurno(div);
        await guardarTurno(fecha, hora, consultorio, turnoData);
        actualizarVisualizacionTurno(div, turnoData);
    }

    function enviarWhatsApp(div, fecha, hora, consultorio) {
        const turnoData = extraerDatosTurno(div);
        const nombre = turnoData.nombre || "Paciente";
        const telefono = turnoData.telefono.replace(/\D/g, "");
        const comentario = turnoData.comentario;
        const monto = turnoData.montoDeposito;
        const horaStr = `${hora.toString().padStart(2, "0")}:00`;

        const consultorioNombre = nombresConsultorios[consultorio];

        if (!telefono) {
            NotificationManager.show(
                "El número de teléfono está vacío o no es válido",
                "error"
            );
            return;
        }

        let depositoTexto = turnoData.deposito
            ? monto
                ? `✅ Depósito confirmado: $${monto}`
                : "✅ Depósito confirmado"
            : "❌ Aún no se realizó el depósito";

        const mensaje = `Hola ${nombre}, te recordamos tu turno:
📅 Fecha: ${formatearFecha(fecha)}
⏰ Hora: ${horaStr}
🏥 Consultorio: ${consultorioNombre}
💵 ${depositoTexto}
📝 Comentario: ${comentario || "Ninguno"}

Gracias por tu visita.`;

        window.open(
            `https://wa.me/549${telefono}?text=${encodeURIComponent(mensaje)}`,
            "_blank"
        );
    }

    async function actualizarContadorTurnos(fecha) {
        const turnosGuardados = await getTurnosGuardados(fecha);
        let agendados = Object.values(turnosGuardados).filter(
            (t) => t.nombre || t.telefono
        ).length;
        document.getElementById(
            "contador-turnos"
        ).textContent = `Turnos agendados: ${agendados}/30`;

        let conDeposito = Object.values(turnosGuardados).filter(
            (t) => t.deposito
        ).length;
        document.getElementById(
            "contador-depositos"
        ).textContent = `Depósitos confirmados: ${conDeposito}`;
    }

    // ================== BÚSQUEDA MEJORADA ==================
    const debouncedSearch = debounce(async (texto) => {
        if (texto === "") {
            document.getElementById("resultados-globales").innerHTML = "";
            return;
        }

        appState.setLoading(true);

        try {
            const res = await fetch(`${BASE_URL}/turnos`);
            const agenda = await res.json();
            let resultados = [];

            for (const fecha in agenda) {
                const turnosPorHora = agenda[fecha];
                for (const clave in turnosPorHora) {
                    const [hora, consultorio] = clave.split("-");
                    const turno = turnosPorHora[clave];
                    const nombre = (turno.nombre || "").toLowerCase();
                    const telefono = (turno.telefono || "").toLowerCase();

                    if (nombre.includes(texto) || telefono.includes(texto)) {
                        let depositoTexto;
                        if (turno.deposito) {
                            depositoTexto = turno.montoDeposito
                                ? `✅ $${turno.montoDeposito}`
                                : "✅";
                        } else {
                            depositoTexto = "❌";
                        }

                        resultados.push({
                            fechaISO: fecha,
                            fechaFormateada: formatearFecha(fecha),
                            hora,
                            consultorio,
                            nombre: turno.nombre,
                            telefono: turno.telefono,
                            comentario: turno.comentario || "",
                            deposito: depositoTexto,
                        });
                    }
                }
            }

            mostrarResultadosBusqueda(resultados);
        } catch (error) {
            NotificationManager.show("Error en la búsqueda", "error");
        } finally {
            appState.setLoading(false);
        }
    }, 300);

    function mostrarResultadosBusqueda(resultados) {
        const resultadosDiv = document.getElementById("resultados-globales");

        if (resultados.length === 0) {
            resultadosDiv.innerHTML =
                "<p class='no-results'>❌ No se encontraron coincidencias.</p>";
            return;
        }

        // Ordenar por fecha más reciente
        resultados.sort((a, b) => new Date(b.fechaISO) - new Date(a.fechaISO));

        resultadosDiv.innerHTML = `
            <div class="resultados-header">
                <h3>📋 Resultados de búsqueda (${resultados.length})</h3>
            </div>
            <div class="resultados-grid">
                ${resultados
                    .map(
                        (r) => `
                    <div class="resultado-card" 
                         data-fecha="${r.fechaISO}" 
                         data-hora="${r.hora}" 
                         data-consultorio="${r.consultorio}">
                        <div class="resultado-fecha">${r.fechaFormateada}</div>
                        <div class="resultado-hora">${r.hora}:00</div>
                        <div class="resultado-consultorio">${
                            nombresConsultorios[r.consultorio]
                        }</div>
                        <div class="resultado-nombre">${r.nombre}</div>
                        <div class="resultado-telefono">${formatearTelefono(
                            r.telefono
                        )}</div>
                        <div class="resultado-deposito ${
                            r.deposito.includes("✅") ? "si" : "no"
                        }">${r.deposito}</div>
                        ${
                            r.comentario
                                ? `<div class="resultado-comentario">${r.comentario}</div>`
                                : ""
                        }
                    </div>
                `
                    )
                    .join("")}
            </div>
        `;
    }

    document.getElementById("buscador").addEventListener("input", (e) => {
        const texto = e.target.value.trim().toLowerCase();
        debouncedSearch(texto);
    });

    // ================== NAVEGACIÓN DE RESULTADOS ==================
    document
        .getElementById("resultados-globales")
        .addEventListener("click", async (e) => {
            const card = e.target.closest(".resultado-card");
            if (!card) return;

            const fechaISO = card.dataset.fecha;
            const hora = parseInt(card.dataset.hora, 10);
            const consultorio = parseInt(card.dataset.consultorio, 10);

            document.getElementById("fecha").value = fechaISO;
            appState.setCurrentDate(fechaISO);
            await mostrarHorarios(fechaISO);

            setTimeout(() => {
                const targetDiv = document.querySelector(
                    `.horario[data-hora="${hora}"][data-consultorio="${consultorio}"]`
                );

                if (targetDiv) {
                    const detalle = targetDiv.querySelector(".horario-detalle");
                    if (detalle) detalle.style.display = "block";
                    targetDiv.classList.add("expanded");

                    targetDiv.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });

                    // Efecto de resaltado
                    targetDiv.style.transform = "scale(1.05)";
                    targetDiv.style.boxShadow =
                        "0 0 20px rgba(255, 67, 67, 0.8)";
                    targetDiv.style.zIndex = "999";

                    setTimeout(() => {
                        targetDiv.style.transform = "";
                        targetDiv.style.boxShadow = "";
                        targetDiv.style.zIndex = "";
                    }, 2000);
                }
            }, 300);
        });

    // ================== ATAJOS DE TECLADO ==================
    document.addEventListener("keydown", (e) => {
        // Ctrl + F para enfocar búsqueda
        if (e.ctrlKey && e.key === "f") {
            e.preventDefault();
            document.getElementById("buscador").focus();
        }

        // Esc para cerrar detalles abiertos
        if (e.key === "Escape") {
            document
                .querySelectorAll('.horario-detalle[style*="block"]')
                .forEach((detalle) => {
                    detalle.style.display = "none";
                    detalle.closest(".horario").classList.remove("expanded");
                });
        }
    });

    // ================== NAVEGACIÓN POR FECHAS ==================
    const navButtons = document.createElement("div");
    navButtons.className = "fecha-navigation";
    navButtons.innerHTML = `
        <button class="nav-btn" id="fecha-anterior">← Día Anterior</button>
        <button class="nav-btn" id="fecha-hoy">📅 Hoy</button>
        <button class="nav-btn" id="fecha-siguiente">Día Siguiente →</button>
    `;
    fechaInput.parentNode.insertBefore(navButtons, fechaDisplay.nextSibling);

    document.getElementById("fecha-anterior").addEventListener("click", () => {
        cambiarFecha(-1);
    });

    document.getElementById("fecha-siguiente").addEventListener("click", () => {
        cambiarFecha(1);
    });

    document.getElementById("fecha-hoy").addEventListener("click", () => {
        const hoy = new Date().toISOString().split("T")[0];
        fechaInput.value = hoy;
        appState.setCurrentDate(hoy);
        mostrarHorarios(hoy);
        actualizarContadorMensual(hoy);
    });

    async function cambiarFecha(dias) {
        const fechaActual = new Date(fechaInput.value + "T00:00:00");
        fechaActual.setDate(fechaActual.getDate() + dias);
        const nuevaFecha = fechaActual.toISOString().split("T")[0];
        fechaInput.value = nuevaFecha;
        appState.setCurrentDate(nuevaFecha);
        await mostrarHorarios(nuevaFecha);
        await actualizarContadorMensual(nuevaFecha);
    }

    // ================== FILTROS Y ESTADÍSTICAS ==================
    const filtrosContainer = document.createElement("div");
    filtrosContainer.className = "filtros-container";
    filtrosContainer.innerHTML = `
        <div class="filtros-row">
            <div class="filtro-grupo">
                <label>Mostrar:</label>
                <select id="filtro-estado">
                    <option value="todos">Todos los horarios</option>
                    <option value="disponibles">Solo disponibles</option>
                    <option value="ocupados">Solo ocupados</option>
                    <option value="con-deposito">Con depósito</option>
                    <option value="sin-deposito">Sin depósito</option>
                </select>
            </div>
            <div class="filtro-grupo">
                <label>Consultorio:</label>
                <select id="filtro-consultorio">
                    <option value="todos">Ambos consultorios</option>
                    <option value="1">Solo Analia</option>
                    <option value="2">Solo Gerardo</option>
                </select>
            </div>
            <button id="btn-estadisticas" class="btn-estadisticas">📊 Ver Estadísticas</button>
        </div>
    `;

    horariosDiv.parentNode.insertBefore(filtrosContainer, horariosDiv);

    // Event listeners para filtros
    document
        .getElementById("filtro-estado")
        .addEventListener("change", aplicarFiltros);
    document
        .getElementById("filtro-consultorio")
        .addEventListener("change", aplicarFiltros);
    document
        .getElementById("btn-estadisticas")
        .addEventListener("click", mostrarEstadisticas);

    function aplicarFiltros() {
        const filtroEstado = document.getElementById("filtro-estado").value;
        const filtroConsultorio =
            document.getElementById("filtro-consultorio").value;

        document.querySelectorAll(".horario").forEach((horario) => {
            let mostrar = true;

            const estaOcupado = horario.classList.contains("agendado");
            const consultorio = horario.dataset.consultorio;
            const tieneDeposito =
                horario.querySelector(".deposito-badge") !== null;

            // Filtro por estado
            switch (filtroEstado) {
                case "disponibles":
                    mostrar = mostrar && !estaOcupado;
                    break;
                case "ocupados":
                    mostrar = mostrar && estaOcupado;
                    break;
                case "con-deposito":
                    mostrar = mostrar && tieneDeposito;
                    break;
                case "sin-deposito":
                    mostrar = mostrar && estaOcupado && !tieneDeposito;
                    break;
            }

            // Filtro por consultorio
            if (filtroConsultorio !== "todos") {
                mostrar = mostrar && consultorio === filtroConsultorio;
            }

            horario.style.display = mostrar ? "block" : "none";
        });
    }

    function mostrarEstadisticas() {
        const horarios = document.querySelectorAll(".horario");
        const total = horarios.length;
        const ocupados = document.querySelectorAll(".horario.agendado").length;
        const disponibles = total - ocupados;
        const conDeposito = document.querySelectorAll(".deposito-badge").length;
        const sinDeposito = ocupados - conDeposito;

        const porConsultorio = {
            1: { ocupados: 0, total: 0 },
            2: { ocupados: 0, total: 0 },
        };

        horarios.forEach((horario) => {
            const consultorio = horario.dataset.consultorio;
            porConsultorio[consultorio].total++;
            if (horario.classList.contains("agendado")) {
                porConsultorio[consultorio].ocupados++;
            }
        });

        const modal = document.createElement("div");
        modal.className = "modal-estadisticas";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📊 Estadísticas del día</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${ocupados}</div>
                        <div class="stat-label">Turnos Ocupados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${disponibles}</div>
                        <div class="stat-label">Disponibles</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${conDeposito}</div>
                        <div class="stat-label">Con Depósito</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${sinDeposito}</div>
                        <div class="stat-label">Sin Depósito</div>
                    </div>
                </div>
                <div class="consultorio-stats">
                    <div class="consultorio-stat">
                        <h3>Consultorio Analia</h3>
                        <p>${porConsultorio[1].ocupados}/${
            porConsultorio[1].total
        } ocupados 
                        (${(
                            (porConsultorio[1].ocupados /
                                porConsultorio[1].total) *
                            100
                        ).toFixed(1)}%)</p>
                    </div>
                    <div class="consultorio-stat">
                        <h3>Consultorio Gerardo</h3>
                        <p>${porConsultorio[2].ocupados}/${
            porConsultorio[2].total
        } ocupados 
                        (${(
                            (porConsultorio[2].ocupados /
                                porConsultorio[2].total) *
                            100
                        ).toFixed(1)}%)</p>
                    </div>
                </div>
                <div class="ocupacion-chart">
                    <div class="chart-bar">
                        <div class="chart-fill" style="width: ${
                            (ocupados / total) * 100
                        }%"></div>
                    </div>
                    <p>Ocupación general: ${((ocupados / total) * 100).toFixed(
                        1
                    )}%</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".modal-close").addEventListener("click", () => {
            modal.remove();
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ================== AUTO-SAVE INDICATOR ==================
    const autoSaveIndicator = document.createElement("div");
    autoSaveIndicator.id = "auto-save-indicator";
    autoSaveIndicator.innerHTML = "💾 Auto-guardado activado";
    autoSaveIndicator.style.display = "none";
    document.body.appendChild(autoSaveIndicator);

    // ================== CONFIGURACIÓN INICIAL ==================
    // Trigger inicial si hay fecha
    if (fechaInput.value) {
        const fechaInicial = fechaInput.value;
        appState.setCurrentDate(fechaInicial);
        mostrarHorarios(fechaInicial);
        actualizarContadorMensual(fechaInicial);
    }
});
