function formatearFecha(fechaISO) {
    const partes = fechaISO.split("-"); // formato: yyyy-mm-dd
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // devuelve: dd/mm/yyyy
}

document.addEventListener("DOMContentLoaded", () => {
    const fechaInput = document.getElementById("fecha");
    const horariosDiv = document.getElementById("horarios");
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

    function getTurnosGuardados() {
        const datos = localStorage.getItem("agendaTurnos");
        return datos ? JSON.parse(datos) : {};
    }

    function guardarTurno(fecha, hora, consultorio, turnoData) {
        const agenda = getTurnosGuardados();
        if (!agenda[fecha]) agenda[fecha] = {};
        agenda[fecha][`${hora}-${consultorio}`] = turnoData;
        localStorage.setItem("agendaTurnos", JSON.stringify(agenda));
    }

    function mostrarHorarios(fecha) {
        horariosDiv.innerHTML = "";
        const turnosGuardados = getTurnosGuardados()[fecha] || {};

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
                    <h3>${hora}:00 - ${hora + 1}:00 (Consultorio ${
                    nombresConsultorios[consultorio] || consultorio
                })</h3>
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
                `;

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

    document.getElementById("descargar").addEventListener("click", () => {
        const data = localStorage.getItem("agendaTurnos");
        if (data) {
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "agenda_turnos.json";
            a.click();

            URL.revokeObjectURL(url);
        } else {
            alert("No hay datos para descargar.");
        }
    });

    document.getElementById("buscador").addEventListener("input", (e) => {
        const texto = e.target.value.trim().toLowerCase();
        const resultadosDiv = document.getElementById("resultados-globales");

        if (texto === "") {
            resultadosDiv.innerHTML = "";
            return;
        }

        const agenda = getTurnosGuardados();
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
                console.log(
                    `DEBUG: Buscando turno - Hora: ${hora}, Consultorio: ${consultorio}`
                );

                const turnosDivs = document.querySelectorAll(".horario");
                console.log(
                    `DEBUG: Se encontraron ${turnosDivs.length} elementos .horario`
                );

                let encontrado = false;

                turnosDivs.forEach((div, index) => {
                    const h3Element = div.querySelector("h3");
                    const h3Text = h3Element?.textContent || "";

                    console.log(`DEBUG: Elemento ${index}: "${h3Text}"`);

                    const tieneHora = h3Text.includes(`${hora}:00`);
                    const tieneConsultorio = h3Text.includes(
                        `Consultorio ${
                            nombresConsultorios[consultorio] || consultorio
                        }`
                    );

                    console.log(
                        `DEBUG: Hora match: ${tieneHora}, Consultorio match: ${tieneConsultorio}`
                    );

                    if (tieneHora && tieneConsultorio) {
                        console.log(
                            "DEBUG: ¡MATCH ENCONTRADO! Aplicando resaltado..."
                        );
                        encontrado = true;

                        div.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });

                        div.classList.add("resaltado");
                        console.log(
                            `DEBUG: Clases después de agregar: ${div.className}`
                        );

                        // Verificar que se agregó
                        // Verificar inmediatamente si se aplicó
                        console.log("DEBUG: Verificando inmediatamente...");
                        const elementoResaltado =
                            document.querySelector(".horario.resaltado");
                        console.log(
                            "DEBUG: Elemento resaltado encontrado:",
                            elementoResaltado
                        );

                        // Aplicar estilos directos con borde doble
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
                            // Quitar estilos directos también
                            div.style.border = "";
                            div.style.outline = "";
                            div.style.outlineOffset = "";
                            div.style.backgroundColor = "";
                            div.style.transform = "";
                            div.style.boxShadow = "";
                            div.style.transition = "";
                            div.style.zIndex = "";
                            div.style.position = "";
                            console.log(
                                "DEBUG: Resaltado removido después de 5 segundos"
                            );
                        }, 5000);
                    }
                });

                if (!encontrado) {
                    console.log("DEBUG: NO se encontró ningún match");
                }
            }, 300); // Aumentar tiempo de espera
        });

    document.getElementById("btn-imprimir").addEventListener("click", () => {
        window.print();
    });
});
