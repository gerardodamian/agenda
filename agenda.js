// Detectar si estamos en local o en producción
const BASE_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:3001" // Desarrollo local
        : "https://agenda-backend-j7py.onrender.com"; // Producción

function formatearFecha(fechaISO) {
    const partes = fechaISO.split("-"); // yyyy-mm-dd
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // dd/mm/yyyy
}

document.addEventListener("DOMContentLoaded", () => {
    const fechaInput = document.getElementById("fecha");
    const horariosDiv = document.getElementById("horarios");
    const nombresConsultorios = { 1: "Analia", 2: "Gerardo" };

    fechaInput.addEventListener("change", () => {
        const fechaSeleccionada = fechaInput.value;
        if (fechaSeleccionada) {
            mostrarHorarios(fechaSeleccionada);
        }
        // Mostrar contador mensual
        const [anio, mes] = fechaSeleccionada.split("-");
        fetch(`${BASE_URL}/turnos-mes/${anio}/${mes}`)
            .then((res) => res.json())
            .then((data) => {
                document.getElementById(
                    "contador-mensual"
                ).textContent = `Turnos ocupados en el mes: ${data.total}`;
            })
            .catch((err) =>
                console.error("Error obteniendo turnos del mes", err)
            );
    });

    // Leer turnos desde el backend
    async function getTurnosGuardados(fecha) {
        try {
            const res = await fetch(`${BASE_URL}/turnos/${fecha}`);
            if (!res.ok) throw new Error("Error al obtener turnos");
            return await res.json();
        } catch (err) {
            console.error("Error:", err);
            return {};
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
            return true;
        } catch (err) {
            console.error("Error al guardar turno:", err);
            return false;
        }
    }

    async function mostrarHorarios(fecha) {
        horariosDiv.innerHTML = "";
        const turnosGuardados = await getTurnosGuardados(fecha);

        let agendados = Object.values(turnosGuardados).filter(
            (t) => t.nombre || t.telefono
        ).length;
        document.getElementById(
            "contador-turnos"
        ).textContent = `Turnos agendados: ${agendados}/28`;

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

                if (
                    turno.nombre ||
                    turno.telefono ||
                    turno.deposito ||
                    turno.comentario
                ) {
                    div.classList.add("agendado");
                    div.title = `Paciente: ${
                        turno.nombre || "Sin nombre"
                    }\nTel: ${turno.telefono || "Sin teléfono"}`;
                }

                div.innerHTML = `
                  <div class="horario-header">
                    <h3>${hora}:00 - ${hora + 1}:00 (Consultorio ${
                    nombresConsultorios[consultorio]
                })</h3>
                    <p class="paciente-resumen">${
                        turno.nombre || "Sin paciente"
                    }</p>
                  </div>
                  <div class="horario-detalle" style="display: none;">
                    <input type="text" placeholder="Nombre del paciente" value="${
                        turno.nombre
                    }" class="nombre" />
                    <input type="tel" placeholder="Teléfono" value="${
                        turno.telefono
                    }" class="telefono" />
                    <label>
                      <input type="checkbox" ${
                          turno.deposito ? "checked" : ""
                      } class="deposito" /> ¿Depósito realizado?
                    </label>
                    <div class="monto-container" style="display: ${
                        turno.deposito ? "block" : "none"
                    };">
                      <input type="number" placeholder="Monto del depósito ($)" value="${
                          turno.montoDeposito || ""
                      }" class="monto-deposito" min="0" step="0.01" />
                    </div>
                    <textarea placeholder="Comentarios..." class="comentario">${
                        turno.comentario
                    }</textarea>
                    <div class="botones-turno">
                      <button class="btn-guardar">💾 Guardar</button>
                    </div>
                  </div>
                `;

                // Toggle detalle
                const header = div.querySelector(".horario-header");
                const detalle = div.querySelector(".horario-detalle");
                header.style.cursor = "pointer";
                header.addEventListener("click", () => {
                    detalle.style.display =
                        detalle.style.display === "none" ? "block" : "none";
                });

                // Depósito
                const depositoCheckbox = div.querySelector(".deposito");
                const montoContainer = div.querySelector(".monto-container");
                const montoInput = div.querySelector(".monto-deposito");
                depositoCheckbox.addEventListener("change", () => {
                    montoContainer.style.display = depositoCheckbox.checked
                        ? "block"
                        : "none";
                    if (!depositoCheckbox.checked) montoInput.value = "";
                });

                // Botón de guardar manual
                const btnGuardar = div.querySelector(".btn-guardar");
                btnGuardar.addEventListener("click", async () => {
                    const turnoData = {
                        nombre: div.querySelector(".nombre").value,
                        telefono: div.querySelector(".telefono").value,
                        deposito: depositoCheckbox.checked,
                        montoDeposito: montoInput.value,
                        comentario: div.querySelector(".comentario").value,
                    };

                    // Cambiar apariencia del botón mientras guarda
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

                        // Actualizar el estado visual del turno
                        const resumen = div.querySelector(".paciente-resumen");
                        resumen.textContent =
                            turnoData.nombre || "Sin paciente";

                        if (
                            turnoData.nombre ||
                            turnoData.telefono ||
                            turnoData.deposito ||
                            turnoData.comentario
                        ) {
                            div.classList.add("agendado");
                            div.title = `Paciente: ${
                                turnoData.nombre || "Sin nombre"
                            }\nTel: ${turnoData.telefono || "Sin teléfono"}`;
                        } else {
                            div.classList.remove("agendado");
                            div.title = "";
                        }

                        // Actualizar contador
                        await actualizarContadorTurnos(fecha);
                    } else {
                        btnGuardar.textContent = "❌ Error";
                        btnGuardar.style.backgroundColor = "#f44336";
                    }

                    // Restaurar botón después de 2 segundos
                    setTimeout(() => {
                        btnGuardar.disabled = false;
                        btnGuardar.textContent = "💾 Guardar";
                        btnGuardar.style.backgroundColor = "#2196F3";
                    }, 2000);
                });

                // Botón WhatsApp
                const whatsappButton = document.createElement("button");
                whatsappButton.textContent = "📱 Compartir por WhatsApp";
                whatsappButton.className = "btn-whatsapp";
                whatsappButton.addEventListener("click", () => {
                    const nombre =
                        div.querySelector(".nombre").value.trim() || "Paciente";
                    const telefono = div
                        .querySelector(".telefono")
                        .value.trim()
                        .replace(/\D/g, "");
                    const comentario = div
                        .querySelector(".comentario")
                        .value.trim();
                    const monto = montoInput.value.trim();
                    const horaStr = `${hora}:00 - ${hora + 1}:00`;
                    const consultorioNombre = nombresConsultorios[consultorio];

                    let depositoTexto = depositoCheckbox.checked
                        ? monto
                            ? `✅ Depósito confirmado: $${monto}`
                            : "✅ Depósito confirmado"
                        : "❌ Aún no se realizó el depósito";

                    if (!telefono) {
                        alert(
                            "El número de teléfono está vacío o no es válido."
                        );
                        return;
                    }

                    const mensaje = `Hola ${nombre}, te recordamos tu turno:
📅 Fecha: ${formatearFecha(fecha)}
⏰ Hora: ${horaStr}
🏥 Consultorio: ${consultorioNombre}
💵 ${depositoTexto}
📝 Comentario: ${comentario || "Ninguno"}

Gracias por tu visita.`;

                    window.open(
                        `https://wa.me/549${telefono}?text=${encodeURIComponent(
                            mensaje
                        )}`,
                        "_blank"
                    );
                });

                // Agregar botón de WhatsApp al contenedor de botones
                const botonesTurno = div.querySelector(".botones-turno");
                botonesTurno.appendChild(whatsappButton);

                // Guardado automático (mantener funcionalidad existente)
                const save = () => {
                    guardarTurno(fecha, hora, consultorio, {
                        nombre: div.querySelector(".nombre").value,
                        telefono: div.querySelector(".telefono").value,
                        deposito: depositoCheckbox.checked,
                        montoDeposito: montoInput.value,
                        comentario: div.querySelector(".comentario").value,
                    });
                };

                div.querySelector(".nombre").addEventListener("input", save);
                div.querySelector(".telefono").addEventListener("input", save);
                depositoCheckbox.addEventListener("change", save);
                montoInput.addEventListener("input", save);
                div.querySelector(".comentario").addEventListener(
                    "input",
                    save
                );

                horariosDiv.appendChild(div);
            }
        }
    }

    // Función para actualizar el contador de turnos
    async function actualizarContadorTurnos(fecha) {
        const turnosGuardados = await getTurnosGuardados(fecha);
        let agendados = Object.values(turnosGuardados).filter(
            (t) => t.nombre || t.telefono
        ).length;
        document.getElementById(
            "contador-turnos"
        ).textContent = `Turnos agendados: ${agendados}/28`;
    }

    document.getElementById("buscador").addEventListener("input", async (e) => {
        const texto = e.target.value.trim().toLowerCase();
        const resultadosDiv = document.getElementById("resultados-globales");

        if (texto === "") {
            resultadosDiv.innerHTML = "";
            return;
        }

        // Obtener TODOS los turnos del backend
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
                        fechaISO: fecha, // yyyy-mm-dd
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

        if (resultados.length === 0) {
            resultadosDiv.innerHTML = "<p>No se encontraron coincidencias.</p>";
            return;
        }

        resultadosDiv.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Consultorio</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Depósito</th>
                    <th>Comentario</th>
                </tr>
            </thead>
            <tbody>
                ${resultados
                    .map(
                        (r) => `
                    <tr class="resultado-turno" 
                        data-fecha="${r.fechaISO}" 
                        data-hora="${r.hora}" 
                        data-consultorio="${r.consultorio}">
                        <td>${r.fechaFormateada}</td>
                        <td>${r.hora}:00</td>
                        <td>${
                            nombresConsultorios[r.consultorio] || r.consultorio
                        }</td>
                        <td>${r.nombre}</td>
                        <td>${r.telefono}</td>
                        <td class="estado-deposito ${
                            r.deposito.includes("✅") ? "si" : "no"
                        }">${r.deposito}</td>
                        <td>${r.comentario}</td>
                    </tr>
                `
                    )
                    .join("")}
            </tbody>
        </table>
    `;
    });

    document
        .getElementById("resultados-globales")
        .addEventListener("click", async (e) => {
            const fila = e.target.closest(".resultado-turno");
            if (!fila) return;

            const fechaISO = fila.dataset.fecha; // yyyy-mm-dd
            const hora = parseInt(fila.dataset.hora, 10);
            const consultorio = parseInt(fila.dataset.consultorio, 10);

            // Cambiar la fecha en el input
            document.getElementById("fecha").value = fechaISO;
            await mostrarHorarios(fechaISO);

            // Esperar un poquito para que se rendericen las tarjetas
            setTimeout(() => {
                const clave = `${hora}-${consultorio}`;
                const turnosDivs = document.querySelectorAll(".horario");

                turnosDivs.forEach((div) => {
                    const h3 = div.querySelector("h3")?.textContent || "";
                    const coincideHora = h3.startsWith(`${hora}:00`);
                    const coincideConsultorio = h3.includes(
                        `Consultorio ${nombresConsultorios[consultorio]}`
                    );

                    if (coincideHora && coincideConsultorio) {
                        const detalle = div.querySelector(".horario-detalle");
                        if (detalle) detalle.style.display = "block";

                        div.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                        div.style.border = "4px solid orange";
                        div.style.backgroundColor = "#fff3e0";
                        setTimeout(() => {
                            div.style.border = "";
                            div.style.backgroundColor = "";
                        }, 3000);
                    }
                });
            }, 300);
        });
});
