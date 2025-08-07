function formatearFecha(fechaISO) {
    const partes = fechaISO.split("-"); // formato: yyyy-mm-dd
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // devuelve: dd/mm/yyyy
}

document.addEventListener("DOMContentLoaded", () => {
    const fechaInput = document.getElementById("fecha");
    const horariosDiv = document.getElementById("horarios");
    const API_BASE_URL = "http://localhost:3001"; // Cambia esto por tu URL de producción
    const nombresConsultorios = {
        1: "Analia",
        2: "Gerardo",
    };

    fechaInput.addEventListener("change", () => {
        const fechaSeleccionada = fechaInput.value;
        if (fechaSeleccionada) {
            mostrarHorarios(fechaSeleccionada);
        }
    });

    // Función para obtener turnos del servidor
    async function getTurnosGuardados(fecha) {
        try {
            const response = await fetch(`${API_BASE_URL}/turnos/${fecha}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Error al obtener turnos:", error);
            return {};
        }
    }

    // Función para guardar turno en el servidor
    async function guardarTurno(fecha, hora, consultorio, turnoData) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/turnos/${fecha}/${hora}/${consultorio}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(turnoData),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error al guardar turno:", error);
            alert("Error al guardar el turno. Verifique su conexión.");
        }
    }

    // Función para obtener todos los turnos (para búsqueda global)
    async function getTodosLosTurnos() {
        try {
            const response = await fetch(`${API_BASE_URL}/turnos/all`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Error al obtener todos los turnos:", error);
            return {};
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

                    if (turno.nombre || turno.telefono) {
                        div.title = `Paciente: ${
                            turno.nombre || "Sin nombre"
                        }\nTel: ${turno.telefono || "Sin teléfono"}`;
                    }
                }

                div.innerHTML = `
  <div class="horario-header">
    <h3>${hora}:00 - ${hora + 1}:00 (Consultorio ${
                    nombresConsultorios[consultorio] || consultorio
                })</h3>
    <p class="paciente-resumen">${turno.nombre || "Sin paciente"}</p>
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
      } class="deposito" />
      ¿Depósito realizado?
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
  </div>
`;

                // Toggle desplegable
                const header = div.querySelector(".horario-header");
                const detalle = div.querySelector(".horario-detalle");
                header.style.cursor = "pointer";
                header.addEventListener("click", () => {
                    detalle.style.display =
                        detalle.style.display === "none" ? "block" : "none";
                });

                const depositoCheckbox = div.querySelector(".deposito");
                const montoContainer = div.querySelector(".monto-container");
                const montoInput = div.querySelector(".monto-deposito");

                // Mostrar/ocultar campo de monto según checkbox
                depositoCheckbox.addEventListener("change", () => {
                    if (depositoCheckbox.checked) {
                        montoContainer.style.display = "block";
                        montoInput.focus();
                    } else {
                        montoContainer.style.display = "none";
                        montoInput.value = "";
                    }
                });

                const whatsappButton = document.createElement("button");
                whatsappButton.textContent = "Compartir por WhatsApp";
                whatsappButton.className = "btn-whatsapp";

                whatsappButton.addEventListener("click", () => {
                    const nombre =
                        div.querySelector(".nombre").value.trim() || "Paciente";
                    const telefono = div
                        .querySelector(".telefono")
                        .value.trim()
                        .replace(/\D/g, ""); // solo números
                    const comentario = div
                        .querySelector(".comentario")
                        .value.trim();
                    const monto = montoInput.value.trim();
                    const horaStr = `${hora}:00 - ${hora + 1}:00`;
                    const consultorioNombre =
                        consultorio === 1 ? "Analia" : "Gerardo";

                    let depositoTexto;
                    if (depositoCheckbox.checked) {
                        if (monto) {
                            depositoTexto = `✅ Depósito confirmado: $${monto}`;
                        } else {
                            depositoTexto = "✅ Depósito confirmado";
                        }
                    } else {
                        depositoTexto = "❌ Aún no se realizó el depósito";
                    }

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

                    const whatsappURL = `https://wa.me/549${telefono}?text=${encodeURIComponent(
                        mensaje
                    )}`;
                    window.open(whatsappURL, "_blank");
                });

                div.appendChild(whatsappButton);

                // Detectar cambios para guardar automáticamente
                const nombreInput = div.querySelector(".nombre");
                const telefonoInput = div.querySelector(".telefono");
                const depositoInput = div.querySelector(".deposito");
                const comentarioInput = div.querySelector(".comentario");

                const save = () => {
                    guardarTurno(fecha, hora, consultorio, {
                        nombre: nombreInput.value,
                        telefono: telefonoInput.value,
                        deposito: depositoInput.checked,
                        montoDeposito: montoInput.value,
                        comentario: comentarioInput.value,
                    });
                };

                nombreInput.addEventListener("input", save);
                telefonoInput.addEventListener("input", save);
                depositoInput.addEventListener("change", save);
                montoInput.addEventListener("input", save);
                comentarioInput.addEventListener("input", save);

                horariosDiv.appendChild(div);
            }
        }
    }

    document.getElementById("descargar").addEventListener("click", async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/turnos/export`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.text();
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "agenda_turnos.json";
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error al descargar:", error);
            alert("Error al descargar los datos. Verifique su conexión.");
        }
    });

    document.getElementById("buscador").addEventListener("input", async (e) => {
        const texto = e.target.value.trim().toLowerCase();
        const resultadosDiv = document.getElementById("resultados-globales");

        if (texto === "") {
            resultadosDiv.innerHTML = "";
            return;
        }

        const agenda = await getTodosLosTurnos();
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
                        if (turno.montoDeposito) {
                            depositoTexto = `✅ $${turno.montoDeposito}`;
                        } else {
                            depositoTexto = "✅";
                        }
                    } else {
                        depositoTexto = "❌";
                    }

                    resultados.push({
                        fecha: formatearFecha(fecha),
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

        // Mostrar resultados como tabla con atributos de datos para acceder luego
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
                <tr class="resultado-turno" data-fecha="${
                    r.fecha
                }" data-hora="${r.hora}" data-consultorio="${r.consultorio}">
                    <td>${r.fecha}</td>
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
                </tr>`
                )
                .join("")}
        </tbody>
    </table>
    `;
    });

    // Evento para hacer clic en los resultados y abrir la fecha + resaltar turno
    document
        .getElementById("resultados-globales")
        .addEventListener("click", (e) => {
            const fila = e.target.closest(".resultado-turno");
            if (!fila) return;

            const fecha = fila.dataset.fecha;
            const hora = parseInt(fila.dataset.hora, 10);
            const consultorio = parseInt(fila.dataset.consultorio, 10);

            // Convertir fecha de dd/mm/yyyy a yyyy-mm-dd para el input
            const partesData = fecha.split("/");
            const fechaISO = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;

            // Cambiar la fecha en el input
            document.getElementById("fecha").value = fechaISO;
            mostrarHorarios(fechaISO);

            // Esperar a que se rendericen los horarios y resaltar el turno
            setTimeout(() => {
                const turnosDivs = document.querySelectorAll(".horario");
                let encontrado = false;

                turnosDivs.forEach((div) => {
                    const nombre = div
                        .querySelector(".nombre")
                        ?.value.trim()
                        .toLowerCase();
                    const tel = div
                        .querySelector(".telefono")
                        ?.value.trim()
                        .toLowerCase();
                    const h3 = div.querySelector("h3")?.textContent || "";

                    const tieneHora = h3.includes(`${hora}:00`);
                    const tieneConsultorio = h3.includes(
                        `Consultorio ${
                            nombresConsultorios[consultorio] || consultorio
                        }`
                    );
                    const coincideContenido =
                        nombre ===
                            fila.cells[3].textContent.trim().toLowerCase() ||
                        tel === fila.cells[4].textContent.trim().toLowerCase();

                    if (tieneHora && tieneConsultorio && coincideContenido) {
                        encontrado = true;

                        // Mostrar detalle
                        const detalle = div.querySelector(".horario-detalle");
                        if (detalle) detalle.style.display = "block";

                        div.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                        div.classList.add("resaltado");

                        div.style.border = "6px solid #ff3300";
                        div.style.outline = "4px solid #ff6600";
                        div.style.outlineOffset = "3px";
                        div.style.backgroundColor = "#fff3e0";
                        div.style.transform = "scale(1.05)";
                        div.style.boxShadow = "0 0 20px rgba(255, 51, 0, 0.6)";
                        div.style.transition = "all 0.5s";
                        div.style.zIndex = "999";
                        div.style.position = "relative";

                        setTimeout(() => {
                            div.classList.remove("resaltado");
                            div.removeAttribute("style");
                        }, 5000);
                    }
                });

                if (!encontrado) {
                    console.warn("No se encontró ningún turno coincidente.");
                }
            }, 300);
        });

    document.getElementById("btn-imprimir").addEventListener("click", () => {
        window.print();
    });
});
