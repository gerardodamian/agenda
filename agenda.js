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
                    <textarea placeholder="Comentarios..." class="comentario">${
                        turno.comentario
                    }</textarea>
                `;

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
                        comentario: comentarioInput.value,
                    });
                };

                nombreInput.addEventListener("input", save);
                telefonoInput.addEventListener("input", save);
                depositoInput.addEventListener("change", save);
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
                    resultados.push({
                        fecha,
                        hora,
                        consultorio,
                        nombre: turno.nombre,
                        telefono: turno.telefono,
                        comentario: turno.comentario || "",
                        deposito: turno.deposito ? "✔️" : "❌",
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
                        r.deposito === "✔️" ? "si" : "no"
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

            // Cambiar la fecha en el input
            document.getElementById("fecha").value = fecha;
            mostrarHorarios(fecha);

            // Esperar a que se rendericen los horarios y resaltar el turno
            setTimeout(() => {
                const clave = `${hora}-${consultorio}`;
                const turnosDivs = document.querySelectorAll(".horario");
                turnosDivs.forEach((div) => {
                    if (
                        div
                            .querySelector("h3")
                            ?.textContent.includes(`${hora}:00`) &&
                        div
                            .querySelector("h3")
                            ?.textContent.includes(
                                `Consultorio ${
                                    nombresConsultorios[consultorio] ||
                                    consultorio
                                }`
                            )
                    ) {
                        div.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                        div.classList.add("resaltado");

                        setTimeout(
                            () => div.classList.remove("resaltado"),
                            3000
                        );
                    }
                });
            }, 100); // esperar render
        });

    document.getElementById("btn-imprimir").addEventListener("click", () => {
        window.print();
    });
});
