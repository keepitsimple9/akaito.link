// js/app.js

// Variable para guardar referencias de fotos seleccionadas
let fotosSeleccionadas = {
    foto1: null,
    foto2: null
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- NAVEGACIÓN ---
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(sec => sec.classList.remove('active'));
            const target = document.getElementById(`sec-${item.getAttribute('data-section')}`);
            if (target) target.classList.add('active');
            
            // Cargar usuarios si se hace clic en emparejador
            if (item.getAttribute('data-section') === 'emparejador') {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    const { data: usuarios } = await API.obtenerUsuarios();
                    usuariosCargados = usuarios || [];
                    emailActual = session.user.email;
                    await UI.renderizarUsuarios(usuariosCargados, emailActual);
                }
            }

            // Cargar perfil si se hace clic en perfil
            if (item.getAttribute('data-section') === 'perfil') {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    const { data: usuario, error } = await API.obtenerPerfil(session.user.email);
                    if (!error && usuario) {
                        UI.cargarPerfil(usuario);
                        // Cargar previsualizaciones de fotos si existen
                        if (usuario.foto1) {
                            document.getElementById('preview1').src = usuario.foto1;
                            document.getElementById('preview1').style.display = 'block';
                            document.getElementById('fotoBox1').style.display = 'none';
                        }
                        if (usuario.foto2) {
                            document.getElementById('preview2').src = usuario.foto2;
                            document.getElementById('preview2').style.display = 'block';
                            document.getElementById('fotoBox2').style.display = 'none';
                        }
                    }
                }
            }
        });
    });

    // --- CARGA INICIAL DE DATOS ---
    if (window.location.pathname.includes('dashboard.html')) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // Cargar datos del usuario y mostrar nombre
            const { data: usuario } = await API.obtenerPerfil(session.user.email);
            if (usuario) {
                UI.actualizarNombreUsuario(usuario.nombre_perfil || 'paisano');
            }
            
            // Cargar lista de chats
            const listaContactos = document.getElementById('listaContactos');
            await Chat.cargarLista(listaContactos, session.user.email);
            
            // Cargar usuarios para emparejador
            const { data: usuarios } = await API.obtenerUsuarios();
            await UI.renderizarUsuarios(usuarios, session.user.email);
        }
    }

    // --- MANEJO DE FOTOS ---
    const fotoBox1 = document.getElementById('fotoBox1');
    const fotoBox2 = document.getElementById('fotoBox2');
    const inputFoto1 = document.getElementById('inputFoto1');
    const inputFoto2 = document.getElementById('inputFoto2');
    const preview1 = document.getElementById('preview1');
    const preview2 = document.getElementById('preview2');

    const setupFotoHandler = (box, input, preview, numeroFoto) => {
        box.addEventListener('click', () => input.click());
        
        input.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                // Guardar referencia del archivo
                fotosSeleccionadas[`foto${numeroFoto}`] = archivo;
                
                // Mostrar previsualización
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    box.style.display = 'none';
                };
                reader.readAsDataURL(archivo);
            }
        });
        
        // Permitir hacer clic en la previsualización para cambiar foto
        preview.addEventListener('click', () => input.click());
    };

    if (fotoBox1 && inputFoto1) setupFotoHandler(fotoBox1, inputFoto1, preview1, 1);
    if (fotoBox2 && inputFoto2) setupFotoHandler(fotoBox2, inputFoto2, preview2, 2);

    // --- EVENTO GUARDAR PERFIL ---
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            if (!session) {
                alert('Debes estar autenticado');
                return;
            }

            const datosPerfil = {
                nombre_perfil: document.getElementById('profNombre').value,
                edad: parseInt(document.getElementById('profEdad').value),
                genero: document.getElementById('profGenero').value,
                whatsapp: document.getElementById('profWhatsapp').value,
                instagram: document.getElementById('profInstagram').value,
                bio: document.getElementById('profBio').value,
                intereses: document.getElementById('profIntereses').value,
                busca: document.getElementById('profBusca').value
            };

            // Subir fotos si fueron seleccionadas
            if (fotosSeleccionadas.foto1) {
                console.log('📸 Procesando foto 1...');
                const resultado1 = await API.subirFoto(session.user.email, fotosSeleccionadas.foto1, 1);
                if (resultado1.error) {
                    console.error('❌ Error foto 1:', resultado1.error);
                    alert('Error al subir foto 1: ' + resultado1.error);
                } else if (resultado1.data && resultado1.data.url) {
                    console.log('✅ Foto 1 guardada:', resultado1.data.url);
                    datosPerfil.foto1 = resultado1.data.url;
                    fotosSeleccionadas.foto1 = null;
                }
            }

            if (fotosSeleccionadas.foto2) {
                console.log('📸 Procesando foto 2...');
                const resultado2 = await API.subirFoto(session.user.email, fotosSeleccionadas.foto2, 2);
                if (resultado2.error) {
                    console.error('❌ Error foto 2:', resultado2.error);
                    alert('Error al subir foto 2: ' + resultado2.error);
                } else if (resultado2.data && resultado2.data.url) {
                    console.log('✅ Foto 2 guardada:', resultado2.data.url);
                    datosPerfil.foto2 = resultado2.data.url;
                    fotosSeleccionadas.foto2 = null;
                }
            }

            console.log('💾 Guardando datos en base de datos:', datosPerfil);

            const { error } = await supabaseClient
                .from('usuarios')
                .update(datosPerfil)
                .eq('email', session.user.email);

            if (error) {
                alert('Error al guardar perfil: ' + error.message);
            } else {
                alert('¡Perfil guardado exitosamente!');
                UI.actualizarNombreUsuario(datosPerfil.nombre_perfil);
            }
        });
    }

    // --- EVENTO ENVIAR MENSAJE ---
    const btnEnviar = document.getElementById('btnEnviar');
    const inputMensaje = document.getElementById('inputMensaje');
    
    const enviarMensaje = async () => {
        const contenido = inputMensaje.value;
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!interlocutorActual) { alert('Selecciona un contacto'); return; }
        if (!contenido) return;

        await API.enviarMensaje(session.user.email, interlocutorActual, contenido);
        inputMensaje.value = '';
        
        // Refrescar mensajes tras enviar
        await Chat.abrirChat(interlocutorActual);
    };
    
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviarMensaje);
    }
    
    if (inputMensaje) {
        inputMensaje.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await enviarMensaje();
            }
        });
    }

    // --- EVENTO BUSCADOR EMPAREJADOR ---
    const buscadorEmparejador = document.getElementById('buscadorEmparejador');
    if (buscadorEmparejador) {
        buscadorEmparejador.addEventListener('input', (e) => {
            const filtro = e.target.value.toLowerCase();
            const usuariosFiltrados = usuariosCargados.filter(usuario => {
                const nombre = (usuario.nombre_perfil || usuario.email).toLowerCase();
                const bio = (usuario.bio || '').toLowerCase();
                const intereses = (usuario.intereses || '').toLowerCase();
                
                return nombre.includes(filtro) || bio.includes(filtro) || intereses.includes(filtro);
            });
            
            UI.renderizarUsuarios(usuariosFiltrados, emailActual);
        });
    }

    // --- EVENTO CERRAR SESIÓN ---
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async () => {
            await Auth.cerrarSesion();
        });
    }

    // --- EVENTO VOLVER AL EMPAREJADOR ---
    const btnVolverEmparejador = document.getElementById('btnVolverEmparejador');
    if (btnVolverEmparejador) {
        btnVolverEmparejador.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Activar sección emparejador
            const emparejadorMenu = document.querySelector('[data-section="emparejador"]');
            if (emparejadorMenu) emparejadorMenu.classList.add('active');
            const emparejadorSection = document.getElementById('sec-emparejador');
            if (emparejadorSection) emparejadorSection.classList.add('active');
        });
    }

    // --- EVENTO ENVIAR MENSAJE DESDE PERFIL ---
    const btnEnviarMensajeOtro = document.getElementById('btnEnviarMensajeOtro');
    if (btnEnviarMensajeOtro) {
        btnEnviarMensajeOtro.addEventListener('click', async () => {
            if (window.usuarioPerfilActual) {
                await UI.irAlChat(window.usuarioPerfilActual);
            }
        });
    }
});