// js/api.js
const API = {
    async obtenerMiembro(email) {
        return await supabaseClient.from('usuarios').select('*').eq('email', email).single();
    },
    
    async actualizarPerfil(email, datos) {
        return await supabaseClient.from('usuarios').update(datos).eq('email', email);
    },

    async obtenerMensajes(miEmail, interlocutor) {
        return await supabaseClient
            .from('mensajes')
            .select('*')
            .or(`and(remitente_email.eq.${miEmail},receptor_email.eq.${interlocutor}),and(remitente_email.eq.${interlocutor},receptor_email.eq.${miEmail})`)
            .order('created_at', { ascending: true });
    },

    async enviarMensaje(remitente, receptor, contenido) {
        return await supabaseClient.from('mensajes').insert([{ 
            remitente_email: remitente, 
            receptor_email: receptor, 
            contenido 
        }]);
    },

    async obtenerContactos(email) {
        return await supabaseClient
            .from('mensajes')
            .select('remitente_email, receptor_email')
            .or(`remitente_email.eq.${email},receptor_email.eq.${email}`);
    },

    async obtenerUsuarios() {
        return await supabaseClient.from('usuarios').select('*');
    },

    async obtenerPerfil(email) {
        return await supabaseClient.from('usuarios').select('*').eq('email', email).single();
    },

    async subirFoto(email, archivo, numeroFoto) {
        if (!archivo) {
            console.error('❌ No hay archivo');
            return { error: 'No hay archivo' };
        }

        try {
            console.log('📸 Iniciando subida...');
            console.log('Email:', email);
            console.log('Archivo:', archivo.name, 'Tamaño:', archivo.size, 'Tipo:', archivo.type);

            // Crear un nombre único para la foto
            const timestamp = Date.now();
            const extension = archivo.name.split('.').pop() || 'jpg';
            const nombreArchivo = `${email}_foto${numeroFoto}_${timestamp}.${extension}`;

            console.log('📝 Nombre archivo:', nombreArchivo);

            // Convertir a ArrayBuffer para mayor compatibilidad
            const arrayBuffer = await archivo.arrayBuffer();
            
            console.log('📤 Enviando a Supabase...');

            // Subir a Supabase Storage
            const { data, error } = await supabaseClient.storage
                .from('fotos-perfil')
                .upload(nombreArchivo, arrayBuffer, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: archivo.type
                });

            if (error) {
                console.error('❌ Error al subir:', error);
                return { error: error.message || 'Error desconocido' };
            }

            console.log('✅ Archivo subido:', data);

            // Obtener URL pública
            const { data: publicData } = supabaseClient.storage
                .from('fotos-perfil')
                .getPublicUrl(nombreArchivo);

            console.log('🔗 URL generada:', publicData.publicUrl);

            return { 
                data: {
                    url: publicData.publicUrl,
                    path: nombreArchivo
                }
            };
        } catch (err) {
            console.error('❌ Excepción:', err);
            return { error: err.message };
        }
    },

    async guardarURLFoto(email, numeroFoto, urlFoto) {
        const columna = `foto${numeroFoto}`;
        return await supabaseClient.from('usuarios').update({ 
            [columna]: urlFoto 
        }).eq('email', email);
    }
};