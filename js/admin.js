// js/admin.js

let usuarioActualEmail = '';
let usuarioActualId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const dashboardContainer = document.querySelector('.dashboard-container');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const SIDEBAR_KEY = 'akaito-admin-sidebar-hidden';

    // --- VERIFICAR AUTENTICACIÓN Y ACCESO ADMIN ---
    const verificarAccesoAdmin = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = 'admin-login.html';
            return false;
        }

        usuarioActualEmail = session.user.email;

        // Verificar si el usuario es administrador
        const { data: usuario, error } = await supabaseClient
            .from('usuarios')
            .select('es_admin')
            .eq('email', session.user.email)
            .single();

        if (error || !usuario || !usuario.es_admin) {
            alert('No tienes permisos para acceder al panel de administración.');
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    };

    const tieneAcceso = await verificarAccesoAdmin();
    if (!tieneAcceso) return;

    // --- MANEJO DEL SIDEBAR ---
    const applySidebarState = (isHidden) => {
        if (!dashboardContainer || !btnToggleSidebar) return;
        dashboardContainer.classList.toggle('sidebar-hidden', isHidden);
        btnToggleSidebar.textContent = isHidden ? '☰ Mostrar menú' : '☰ Ocultar menú';
        btnToggleSidebar.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
    };

    if (dashboardContainer && btnToggleSidebar) {
        const savedSidebarState = localStorage.getItem(SIDEBAR_KEY);
        const sidebarWasHidden = savedSidebarState === null ? true : savedSidebarState === 'true';
        applySidebarState(sidebarWasHidden);

        btnToggleSidebar.addEventListener('click', () => {
            const isHidden = !dashboardContainer.classList.contains('sidebar-hidden');
            applySidebarState(isHidden);
            localStorage.setItem(SIDEBAR_KEY, isHidden ? 'true' : 'false');
        });
    }

    // --- NAVEGACIÓN ENTRE SECCIONES ---
    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');

    menuItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = item.getAttribute('data-section');
            
            menuItems.forEach((m) => m.classList.remove('active'));
            contentSections.forEach((s) => s.classList.remove('active'));
            
            item.classList.add('active');
            const targetSection = document.getElementById(`sec-${sectionName}`);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            if (sectionName === 'postulantes') {
                cargarPostulantes();
            }
        });
    });

    // --- BOTÓN CERRAR SESIÓN ---
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async () => {
            if (confirm('¿Deseas cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            }
        });
    }

    // --- BOTÓN CONFIGURACIÓN (Redirige a sec-configuracion) ---
    const btnConfig = document.getElementById('btnConfig');
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            const configMenu = document.querySelector('[data-section="configuracion"]');
            if (configMenu) {
                configMenu.click();
            }
        });
    }

    // --- GESTIÓN DE POSTULANTES ---
    let postulantesCache = [];
    
    const cargarPostulantes = async () => {
        const contenido = document.getElementById('contenidoPostulantes');
        if (!contenido) return;
        
        contenido.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-muted);"><p>Cargando...</p></div>';
        
        try {
            const { data: postulantes, error } = await supabaseClient
                .from('postulantes')
                .select('*');
            
            if (error) throw error;
            
            postulantesCache = postulantes || [];

            if (postulantesCache.length === 0) {
                contenido.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                        <p>No hay postulantes registrados, o no tienes permiso de lectura en la tabla <strong>postulantes</strong> (verifica las políticas RLS en Supabase).</p>
                    </div>`;
                return;
            }

            mostrarPostulantes(postulantesCache);
        } catch (err) {
            console.error('Error cargando postulantes:', err);
            contenido.innerHTML = `<div style="padding: 30px; text-align: center; color: #d9534f;"><p><strong>Error:</strong> ${err.message}</p></div>`;
        }
    };
    
    const mostrarPostulantes = (postulantes) => {
        const contenido = document.getElementById('contenidoPostulantes');
        if (!contenido) return;
        
        if (postulantes.length === 0) {
            contenido.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-muted);"><p>No hay postulantes</p></div>';
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
                    <tr>
                        <th style="padding: 15px; text-align: left; font-weight: 600;">Nombre</th>
                        <th style="padding: 15px; text-align: left; font-weight: 600;">Email</th>
                        <th style="padding: 15px; text-align: left; font-weight: 600;">Estado</th>
                        <th style="padding: 15px; text-align: center; font-weight: 600;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        postulantes.forEach(p => {
            const estadoColor = p.estado === 'pendiente' ? '#ff9800' : (p.estado === 'aprobado' ? '#4caf50' : '#f44336');
            const estadoTexto = p.estado || 'pendiente';
            
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">${p.nombre || '-'}</td>
                    <td style="padding: 15px;">${p.email || '-'}</td>
                    <td style="padding: 15px;">
                        <span style="background-color: ${estadoColor}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; text-transform: capitalize;">
                            ${estadoTexto}
                        </span>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        ${p.estado === 'pendiente' ? `
                            <button class="btn-aprobar-postulante" data-id="${p.id}" style="padding: 6px 12px; margin: 0 5px; background-color: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                                ✓ Aprobar
                            </button>
                            <button class="btn-rechazar-postulante" data-id="${p.id}" style="padding: 6px 12px; margin: 0 5px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                                ✗ Rechazar
                            </button>
                        ` : `
                            <span style="color: var(--text-muted); font-size: 0.9rem;">-</span>
                        `}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        contenido.innerHTML = html;
        
        // Event listeners para aprobar/rechazar
        document.querySelectorAll('.btn-aprobar-postulante').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                await aprobarPostulante(id);
            });
        });
        
        document.querySelectorAll('.btn-rechazar-postulante').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('¿Estás seguro de que deseas rechazar este postulante?')) {
                    await rechazarPostulante(id);
                }
            });
        });
    };
    
    const aprobarPostulante = async (postulantId) => {
        try {
            // eslint-disable-next-line eqeqeq
            const postulante = postulantesCache.find(p => p.id == postulantId);
            if (!postulante) {
                alert('Postulante no encontrado');
                return;
            }
            
            // Preparar datos para usuarios
            const datosUsuario = {
                email: postulante.email,
                nombre: postulante.nombre,
                genero: postulante.genero || null,
                edad: postulante.edad || null,
                whatsapp: postulante.whatsapp || null,
                instagram: postulante.instagram || null,
                apellido_paterno: postulante.apellido_paterno || null,
                apellido_materno: postulante.apellido_materno || null,
                apodo: postulante.apodo || null,
                pais: postulante.pais || null,
                fecha_nacimiento: postulante.fecha_nacimiento || null
            };
            
            // Insertar en tabla usuarios
            const { error: errorUsuario } = await supabaseClient
                .from('usuarios')
                .insert([datosUsuario]);
            
            if (errorUsuario) throw errorUsuario;
            
            // Actualizar estado en postulantes
            const { error: errorActualizar } = await supabaseClient
                .from('postulantes')
                .update({ estado: 'aprobado' })
                .eq('id', postulantId);
            
            if (errorActualizar) throw errorActualizar;
            
            alert('✓ Postulante aprobado y migrado a usuarios');
            await cargarPostulantes();
        } catch (err) {
            console.error('Error aprobando postulante:', err);
            alert('Error: ' + (err.message || err));
        }
    };
    
    const rechazarPostulante = async (postulantId) => {
        try {
            const { error } = await supabaseClient
                .from('postulantes')
                .update({ estado: 'rechazado' })
                .eq('id', postulantId);
            
            if (error) throw error;
            
            alert('✓ Postulante rechazado');
            await cargarPostulantes();
        } catch (err) {
            console.error('Error rechazando postulante:', err);
            alert('Error: ' + (err.message || err));
        }
    };
    
    // Botón para recargar postulantes
    const btnCargarPostulantes = document.getElementById('btnCargarPostulantes');
    if (btnCargarPostulantes) {
        btnCargarPostulantes.addEventListener('click', cargarPostulantes);
    }
    
    // Filtro por estado
    const filtroEstado = document.getElementById('filtroEstadoPostulantes');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => {
            const estado = filtroEstado.value;
            if (estado === '') {
                mostrarPostulantes(postulantesCache);
            } else {
                const filtrados = postulantesCache.filter(p => (p.estado || 'pendiente') === estado);
                mostrarPostulantes(filtrados);
            }
        });
    }
    
    console.log('✅ Dashboard de administración cargado correctamente');
});
