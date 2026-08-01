// js/ui.js

const UI = {
    calcularEdad(fechaNacimiento) {
        if (!fechaNacimiento) return null;

        const fecha = new Date(fechaNacimiento);
        if (Number.isNaN(fecha.getTime())) return null;

        const hoy = new Date();
        let edad = hoy.getFullYear() - fecha.getFullYear();
        const mesDiferencia = hoy.getMonth() - fecha.getMonth();
        if (mesDiferencia < 0 || (mesDiferencia === 0 && hoy.getDate() < fecha.getDate())) {
            edad -= 1;
        }

        return edad;
    },

    formatearEdad(edad) {
        return edad !== null && edad !== undefined ? `${edad} años` : 'No especificada';
    },

    actualizarEdadDesdeNacimiento(fechaNacimientoInputId = 'profFechaNacimiento', salidaId = 'profEdadTexto') {
        const input = document.getElementById(fechaNacimientoInputId);
        const output = document.getElementById(salidaId);
        if (!input || !output) return;

        const edad = this.calcularEdad(input.value);
        output.textContent = edad !== null ? `Edad: ${edad} años` : 'Edad: -- años';
    },

    obtenerNombreCompleto(usuario = {}) {
        const partes = [
            usuario.nombre || usuario.nombre_perfil || '',
            usuario.apellido_paterno || usuario.apellidoPaterno || '',
            usuario.apellido_materno || usuario.apellidoMaterno || ''
        ].filter(Boolean);

        return partes.join(' ').trim();
    },

    obtenerNombreVisible(usuario = {}) {
        const nombreCompleto = this.obtenerNombreCompleto(usuario);
        if (nombreCompleto) return nombreCompleto;

        const email = (usuario.email || '').trim();
        if (email.includes('@')) {
            return email.split('@')[0];
        }

        return 'Usuario';
    },

    crearEstadoConfiguracion(contenedor, mensaje) {
        if (!contenedor) return;
        contenedor.innerHTML = `<p style="color: var(--text-muted); font-size: 0.95rem;">${mensaje}</p>`;
    },

    // Para mostrar mensajes de error o éxito al usuario
    mostrarAlerta(mensaje, tipo = 'error') {
        alert(mensaje); // Puedes cambiar esto por un modal o un toast más elegante después
    },

    // Para actualizar el texto del nombre en el dashboard
    actualizarNombreUsuario(nombreCompleto) {
        const txtNombre = document.getElementById('nombreUsuario');
        if (txtNombre && nombreCompleto) {
            txtNombre.textContent = nombreCompleto.split(' ')[0];
        }
    },

    // Para cargar el perfil del usuario en el formulario
    cargarPerfil(usuario) {
        if (!usuario) return;
        
        const setValue = (id, value) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = value || '';
            }
        };

        setValue('profNombre', usuario.nombre || usuario.nombre_perfil || '');
        setValue('profApellidoPaterno', usuario.apellido_paterno || usuario.apellidoPaterno || '');
        setValue('profApellidoMaterno', usuario.apellido_materno || usuario.apellidoMaterno || '');
        setValue('profApodo', usuario.apodo || '');
        setValue('profPais', usuario.pais || usuario.país || '');
        setValue('profFechaNacimiento', usuario.fecha_nacimiento || usuario.fechaNacimiento || '');
        setValue('profGenero', usuario.genero || '');
        setValue('profWhatsapp', usuario.whatsapp || '');
        setValue('profInstagram', usuario.instagram || '');

        // Cargar selects de privacidad
        const selWa = document.getElementById('profMostrarWhatsapp');
        const selIg = document.getElementById('profMostrarInstagram');
        const selEm = document.getElementById('profMostrarEmail');
        const emailDisplay = document.getElementById('profEmailDisplay');
        const profEmailInput = document.getElementById('profEmail');
        if (selWa) selWa.value = usuario.mostrar_whatsapp || 'nadie';
        if (selIg) selIg.value = usuario.mostrar_instagram || 'nadie';
        if (selEm) selEm.value = usuario.mostrar_email || 'nadie';
        if (emailDisplay) emailDisplay.textContent = usuario.email || '';
        if (profEmailInput) profEmailInput.value = ''; // vacío — solo llenar para cambiar
        setValue('profBio', usuario.bio || '');
        setValue('profIntereses', usuario.intereses || '');
        setValue('profBusca', usuario.busca || 'pareja');
        this.actualizarEdadDesdeNacimiento();
    },

    // Para limpiar campos de formularios
    limpiarFormulario(idFormulario) {
        const form = document.getElementById(idFormulario);
        if (form) form.reset();
    },

    // Para renderizar los mensajes en el chat
    renderizarMensajes(mensajes, usuarioPropioId) {
        const mensajesList = document.getElementById('mensajesList');
        if (!mensajesList) return;
        
        mensajesList.innerHTML = '';
        mensajes.forEach(msg => {
            const div = document.createElement('div');
            div.className = String(msg.remitente_id) === String(usuarioPropioId) ? 'mensaje-propio' : 'mensaje-recibido';
            div.innerHTML = `<b>${String(msg.remitente_id) === String(usuarioPropioId) ? 'Tu' : 'Usuario'}:</b> ${msg.contenido}`;
            mensajesList.appendChild(div);
        });
    },

    construirCardUsuario(usuario) {
        let fotosHTML = '';
        if (usuario.foto1 || usuario.foto2) {
            fotosHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                    ${usuario.foto1 ? `<img src="${usuario.foto1}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;">` : `<div style="width: 100%; height: 120px; background: #f0f0f0; border-radius: 6px;"></div>`}
                    ${usuario.foto2 ? `<img src="${usuario.foto2}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;">` : `<div style="width: 100%; height: 120px; background: #f0f0f0; border-radius: 6px;"></div>`}
                </div>
            `;
        }

        const edadTexto = UI.formatearEdad(UI.calcularEdad(usuario.fecha_nacimiento || usuario.fechaNacimiento));

        return `
            ${fotosHTML}
            <h4 class="js-user-name" style="cursor: pointer; color: var(--accent);">${UI.obtenerNombreVisible(usuario)}</h4>
            <p style="color: var(--text-muted); margin: 5px 0;"><strong>Edad:</strong> ${edadTexto} ${usuario.genero ? `(${usuario.genero})` : ''}</p>
            <p style="color: var(--text-muted); margin: 5px 0;"><strong>Apodo:</strong> ${usuario.apodo || 'Sin apodo'}</p>
            <p style="color: var(--text-muted); margin: 5px 0;"><strong>Bio:</strong> ${usuario.bio || 'Sin descripción'}</p>
            <p style="color: var(--text-muted); margin: 5px 0;"><strong>Intereses:</strong> ${usuario.intereses || 'No especificados'}</p>
        `;
    },

    // Para renderizar la lista de usuarios en la pestaña Buscar usuario
    async renderizarUsuarios(usuarios, emailPropio, relaciones = {}, parejaInfo = {}) {
        const listaUsuarios = document.getElementById('listaUsuarios');
        if (!listaUsuarios) return;
        
        if (!usuarios || usuarios.length === 0) {
            listaUsuarios.innerHTML = '<p>No hay usuarios disponibles</p>';
            return;
        }

        const generoOpuesto = parejaInfo.miGenero === 'masculino' ? 'femenino' : (parejaInfo.miGenero === 'femenino' ? 'masculino' : null);
        const emailPropioNorm = (emailPropio || '').trim().toLowerCase();

        listaUsuarios.innerHTML = '';
        let cantidadRenderizada = 0;
        usuarios.forEach(usuario => {
            const emailUsuarioNorm = (usuario.email || '').trim().toLowerCase();
            if (emailUsuarioNorm !== emailPropioNorm) {
                const div = document.createElement('div');
                div.className = 'profile-card';
                div.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; transition: transform 0.2s;';

                const usuarioId = String(usuario.id);
                const esAmigo = relaciones.amigos?.has(usuarioId);
                const solicitudRecibida = relaciones.solicitudesRecibidasPorId?.has(usuarioId);
                const solicitudEnviada = relaciones.solicitudesEnviadas?.has(usuarioId);

                let accionesHTML = `<button class="btn-primary js-user-chat-btn" data-user-id="${usuario.id}" style="width: 100%; margin-top: 10px;">Enviar Mensaje</button>`;

                if (!esAmigo) {
                    if (solicitudRecibida) {
                        accionesHTML = `<button class="btn-primary js-open-requests-btn" style="width: 100%; margin-top: 10px;">Responder solicitud</button>`;
                    } else if (solicitudEnviada) {
                        accionesHTML = `<button class="btn-primary" style="width: 100%; margin-top: 10px; opacity: 0.7;" disabled>Solicitud enviada</button>`;
                    } else {
                        accionesHTML = `<button class="btn-primary js-add-friend-btn" data-user-id="${usuario.id}" style="width: 100%; margin-top: 10px;">Agregar amigo</button>`;
                    }
                }

                // Botón de pareja: solo si es amigo, género opuesto y sin pareja activa/enviada
                if (generoOpuesto && usuario.genero === generoOpuesto && !parejaInfo.tienePareja && esAmigo) {
                    const yaEnviada = parejaInfo.idsConSolicitudEnviada?.has(usuarioId);
                    const btnPareja = yaEnviada
                        ? `<button style="width:100%; margin-top:8px; padding:8px; background:white; border:1px solid #ccc; border-radius:8px; color:#999; cursor:default;" disabled>⏳ Solicitud de pareja enviada</button>`
                        : `<button class="js-solicitar-pareja-btn" data-user-id="${usuario.id}" style="width:100%; margin-top:8px; padding:8px; background:white; border:1px solid var(--accent); color:var(--accent); border-radius:8px; cursor:pointer; font-weight:600;">💑 Solicitar pareja</button>`;
                    accionesHTML += btnPareja;
                }
                
                div.innerHTML = `${UI.construirCardUsuario(usuario)}${accionesHTML}`;
                
                const nombreElement = div.querySelector('.js-user-name');
                nombreElement.onclick = (e) => {
                    e.stopPropagation();
                    UI.mostrarPerfilUsuario(usuario);
                };
                
                listaUsuarios.appendChild(div);
                cantidadRenderizada += 1;
            }
        });

        if (cantidadRenderizada === 0) {
            listaUsuarios.innerHTML = '<p>No hay otros miembros disponibles para mostrar.</p>';
        }
    },

    renderizarAmigos(amigos, usuariosPorEmail, parejaInfo = {}) {
        const listaAmigos = document.getElementById('listaAmigos');
        if (!listaAmigos) return;

        if (!amigos || amigos.length === 0) {
            listaAmigos.innerHTML = '<p>No tienes amigos agregados todavía</p>';
            return;
        }

        const generoOpuesto = parejaInfo.miGenero === 'masculino' ? 'femenino' : (parejaInfo.miGenero === 'femenino' ? 'masculino' : null);

        listaAmigos.innerHTML = '';
        amigos.forEach((item) => {
            const usuario = usuariosPorEmail.get(String(item.usuarioId)) || { nombre: 'Usuario' };
            const usuarioId = String(item.usuarioId);
            const div = document.createElement('div');
            div.className = 'profile-card';
            div.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; transition: transform 0.2s;';

            // Botón de pareja según estado
            let btnParejaHTML = '';
            if (generoOpuesto && usuario.genero === generoOpuesto && !parejaInfo.tienePareja) {
                const yaEnviada = parejaInfo.idsConSolicitudEnviada?.has(usuarioId);
                btnParejaHTML = yaEnviada
                    ? `<button style="width:100%; margin-top:8px; padding:8px; background:white; border:1px solid #ccc; border-radius:8px; color:#999; cursor:default;" disabled>⏳ Solicitud de pareja enviada</button>`
                    : `<button class="js-solicitar-pareja-btn" data-user-id="${item.usuarioId}" style="width:100%; margin-top:8px; padding:8px; background:white; border:1px solid var(--accent); color:var(--accent); border-radius:8px; cursor:pointer; font-weight:600;">💑 Solicitar pareja</button>`;
            } else if (parejaInfo.tienePareja && window.estadoParejaGlobal?.parejaActivaId == item.usuarioId) {
                btnParejaHTML = `<button style="width:100%; margin-top:8px; padding:8px; background:white; border:1px solid #4caf50; border-radius:8px; color:#4caf50; cursor:default;" disabled>💑 Son pareja</button>`;
            }

            div.innerHTML = `
                ${UI.construirCardUsuario(usuario)}
                <p style="margin: 10px 0 0 0; color: var(--text-muted);">Amigos desde ${item.fechaAmistad}</p>
                <button class="btn-primary js-user-chat-btn" data-user-id="${item.usuarioId}" style="width: 100%; margin-top: 10px;">Enviar mensaje</button>
                ${btnParejaHTML}
            `;

            const nombreElement = div.querySelector('.js-user-name');
            nombreElement.onclick = (e) => {
                e.stopPropagation();
                UI.mostrarPerfilUsuario(usuario);
            };

            listaAmigos.appendChild(div);
        });
    },

    renderizarSolicitudes(solicitudes, usuariosPorEmail) {
        const listaSolicitudes = document.getElementById('listaSolicitudes');
        if (!listaSolicitudes) return;

        if (!solicitudes || solicitudes.length === 0) {
            listaSolicitudes.innerHTML = '<p>No tienes solicitudes pendientes</p>';
            return;
        }

        listaSolicitudes.innerHTML = '';
        solicitudes.forEach((solicitud) => {
            const usuario = usuariosPorEmail.get(String(solicitud.solicitante_id)) || { email: '-', nombre: 'Usuario' };
            const div = document.createElement('div');
            div.className = 'profile-card';
            div.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; transition: transform 0.2s;';
            div.innerHTML = `
                ${UI.construirCardUsuario(usuario)}
                <p style="margin: 10px 0 12px 0; color: var(--text-muted);">Quiere agregarte como amigo</p>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary js-accept-request-btn" data-id="${solicitud.id}" style="padding: 10px 16px;">Aceptar</button>
                    <button class="js-reject-request-btn" data-id="${solicitud.id}" style="padding: 10px 16px; border: 1px solid #dee2e6; background: white; border-radius: 8px; cursor: pointer;">Rechazar</button>
                </div>
            `;

            const nombreElement = div.querySelector('.js-user-name');
            nombreElement.onclick = (e) => {
                e.stopPropagation();
                UI.mostrarPerfilUsuario(usuario);
            };

            listaSolicitudes.appendChild(div);
        });
    },

    // Para mostrar el perfil completo de otro usuario
    mostrarPerfilUsuario(usuario) {
        // Llenar los campos de la vista de perfil
        const fechaNacimiento = usuario.fecha_nacimiento || usuario.fechaNacimiento;
        const edad = UI.calcularEdad(fechaNacimiento);

        document.getElementById('verNombre').textContent = UI.obtenerNombreVisible(usuario);
        document.getElementById('verApellidoPaterno').textContent = usuario.apellido_paterno || usuario.apellidoPaterno || '-';
        document.getElementById('verApellidoMaterno').textContent = usuario.apellido_materno || usuario.apellidoMaterno || '-';
        document.getElementById('verApodo').textContent = usuario.apodo || '-';
        document.getElementById('verPais').textContent = usuario.pais || usuario.país || '-';
        document.getElementById('verFechaNacimiento').textContent = fechaNacimiento ? new Date(fechaNacimiento).toLocaleDateString('es-ES') : '-';
        document.getElementById('verEdad').textContent = edad !== null ? `${edad} años` : '-';
        document.getElementById('verGenero').textContent = usuario.genero || '-';
        const esAmigo = window.relacionesUsuariosGlobal?.amigos?.has(String(usuario.id));
        const privWa = usuario.mostrar_whatsapp || 'nadie';
        const privIg = usuario.mostrar_instagram || 'nadie';
        const privEm = usuario.mostrar_email || 'nadie';
        const puedeVerWa = privWa === 'publico' || (privWa === 'conocidos' && esAmigo);
        const puedeVerIg = privIg === 'publico' || (privIg === 'conocidos' && esAmigo);
        const puedeVerEm = privEm === 'publico' || (privEm === 'conocidos' && esAmigo);
        document.getElementById('verWhatsapp').textContent = puedeVerWa ? (usuario.whatsapp || '-') : '🔒 Privado';
        document.getElementById('verInstagram').textContent = puedeVerIg ? (usuario.instagram || '-') : '🔒 Privado';
        const verEmail = document.getElementById('verEmail');
        if (verEmail) verEmail.textContent = puedeVerEm ? (usuario.email || '-') : '🔒 Privado';
        document.getElementById('verBio').textContent = usuario.bio || '-';
        document.getElementById('verIntereses').textContent = usuario.intereses || '-';
        
        // Mostrar fotos
        const fotoVerOtro1 = document.getElementById('fotoVerOtro1');
        const fotoVerOtro2 = document.getElementById('fotoVerOtro2');
        
        // Limpiar contenido anterior
        fotoVerOtro1.innerHTML = '';
        fotoVerOtro2.innerHTML = '';
        
        if (usuario.foto1) {
            const img1 = document.createElement('img');
            img1.src = usuario.foto1;
            img1.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            fotoVerOtro1.appendChild(img1);
        } else {
            fotoVerOtro1.innerHTML = '<p style="color: #999;">Sin foto</p>';
        }
        
        if (usuario.foto2) {
            const img2 = document.createElement('img');
            img2.src = usuario.foto2;
            img2.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            fotoVerOtro2.appendChild(img2);
        } else {
            fotoVerOtro2.innerHTML = '<p style="color: #999;">Sin foto</p>';
        }
        
        // Mapear valores de busca a texto
        const textoBusca = {
            'pareja': 'Una relación seria',
            'conocer': 'Salir y ver qué pasa',
            'amistad': 'Amistad en la colectividad'
        };
        document.getElementById('verBusca').textContent = textoBusca[usuario.busca] || usuario.busca || '-';
        
        // Guardar ID del usuario para usar en los botones de acción
        window.usuarioPerfilActualId = usuario.id;

        // Mostrar/ocultar botones según relación con este usuario
        const esAmigoPerfil = window.relacionesUsuariosGlobal?.amigos?.has(String(usuario.id));
        const solicitudAmistadEnviada = window.relacionesUsuariosGlobal?.solicitudesEnviadas?.has(String(usuario.id));
        const esParejaActiva = window.estadoParejaGlobal?.parejaActivaId == usuario.id;
        const solicitudEnviada = window.estadoParejaCache?.idsConSolicitudEnviada?.has(String(usuario.id));
        const generoOpuesto = window.estadoParejaCache?.miGenero === 'masculino' ? 'femenino' : (window.estadoParejaCache?.miGenero === 'femenino' ? 'masculino' : null);
        const puedesolicitarPareja = esAmigoPerfil && generoOpuesto && usuario.genero === generoOpuesto && !window.estadoParejaCache?.tienePareja && !esParejaActiva && !solicitudEnviada;

        const btnDejarAmigo = document.getElementById('btnDejarAmigo');
        const btnTerminarPareja = document.getElementById('btnTerminarParejaPerfil');
        const btnSolicitarPareja = document.getElementById('btnSolicitarParejaPerfil');
        const btnSolicitudEnviada = document.getElementById('btnSolicitudParejaEnviada');
        const btnSolicitudAmistad = document.getElementById('btnSolicitudAmistad');

        if (btnSolicitudAmistad) btnSolicitudAmistad.style.display = (solicitudAmistadEnviada && !esAmigoPerfil) ? 'block' : 'none';
        if (btnDejarAmigo) btnDejarAmigo.style.display = esAmigoPerfil ? 'block' : 'none';
        if (btnTerminarPareja) btnTerminarPareja.style.display = esParejaActiva ? 'block' : 'none';
        if (btnSolicitarPareja) btnSolicitarPareja.style.display = puedesolicitarPareja ? 'block' : 'none';
        if (btnSolicitudEnviada) btnSolicitudEnviada.style.display = (solicitudEnviada && !esParejaActiva) ? 'block' : 'none';
        
        // Cambiar a la sección de perfil de usuario
        const menuItems = document.querySelectorAll('.menu-item');
        const sections = document.querySelectorAll('.content-section');
        
        menuItems.forEach(item => item.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));
        
        document.getElementById('sec-perfil-usuario').classList.add('active');
    },

    // Para navegar a la sección de chat y abrir conversación
    async irAlChat(contactoId) {
        // Navegar a la sección de chat
        const menuItems = document.querySelectorAll('.menu-item');
        const sections = document.querySelectorAll('.content-section');
        
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === 'chat') {
                item.classList.add('active');
            }
        });
        
        sections.forEach(sec => sec.classList.remove('active'));
        const chatSection = document.getElementById('sec-chat');
        if (chatSection) {
            chatSection.classList.add('active');
        }
        
        // Abrir el chat con el contacto
        await Chat.abrirChat(contactoId);
    }
};

window.calcularEdadDesdeFechaNacimiento = function(fechaNacimiento) {
    return UI.calcularEdad(fechaNacimiento);
};