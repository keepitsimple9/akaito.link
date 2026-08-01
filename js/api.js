// js/api.js
function sortFriendPair(idA, idB) {
    return [String(idA), String(idB)].sort((left, right) => left.localeCompare(right));
}

function isMissingFriendTablesError(error) {
    const message = (error?.message || '').toLowerCase();
    return message.includes('amistades') || message.includes('solicitudes_amistad') || message.includes('does not exist') || message.includes('schema cache') || message.includes('receptor_id') || message.includes('solicitante_id') || message.includes('user_id') || message.includes('friend_id');
}

const API = {
    async obtenerMiembro(email) {
        return await supabaseClient.from('usuarios').select('*').eq('email', email).single();
    },
    
    async actualizarPerfil(email, datos) {
        return await supabaseClient.from('usuarios').update(datos).eq('email', email);
    },

    async obtenerMensajes(miUsuarioId, interlocutorId) {
        return await supabaseClient
            .from('mensajes')
            .select('*')
            .or(`and(remitente_id.eq.${miUsuarioId},receptor_id.eq.${interlocutorId}),and(remitente_id.eq.${interlocutorId},receptor_id.eq.${miUsuarioId})`)
            .order('created_at', { ascending: true });
    },

    async enviarMensaje(remitenteId, receptorId, contenido) {
        return await supabaseClient.from('mensajes').insert([{ 
            remitente_id: remitenteId,
            receptor_id: receptorId,
            contenido 
        }]);
    },

    async obtenerContactos(usuarioId) {
        return await supabaseClient
            .from('mensajes')
            .select('remitente_id, receptor_id')
            .or(`remitente_id.eq.${usuarioId},receptor_id.eq.${usuarioId}`);
    },

    async obtenerUsuarios() {
        return await supabaseClient.from('usuarios').select('*');
    },

    async obtenerPerfil(email) {
        return await supabaseClient.from('usuarios').select('*').eq('email', email).single();
    },

    async obtenerAmigos(usuarioId) {
        const { data, error } = await supabaseClient
            .from('amistades')
            .select('*')
            .or(`user_id.eq.${usuarioId},friend_id.eq.${usuarioId}`)
            .order('created_at', { ascending: false });

        if (error && isMissingFriendTablesError(error)) {
            return { data: [], error: null, setupRequired: true };
        }

        return { data: data || [], error, setupRequired: false };
    },

    async obtenerSolicitudesRecibidas(usuarioId) {
        const { data, error } = await supabaseClient
            .from('solicitudes_amistad')
            .select('*')
            .eq('receptor_id', usuarioId)
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });

        if (error && isMissingFriendTablesError(error)) {
            return { data: [], error: null, setupRequired: true };
        }

        return { data: data || [], error, setupRequired: false };
    },

    async obtenerSolicitudesEnviadas(usuarioId) {
        const { data, error } = await supabaseClient
            .from('solicitudes_amistad')
            .select('*')
            .eq('solicitante_id', usuarioId)
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });

        if (error && isMissingFriendTablesError(error)) {
            return { data: [], error: null, setupRequired: true };
        }

        return { data: data || [], error, setupRequired: false };
    },

    async enviarSolicitudAmistad(solicitanteId, receptorId) {
        const [lowerId, higherId] = sortFriendPair(solicitanteId, receptorId);

        const { data: amistadExistente, error: amistadError } = await supabaseClient
            .from('amistades')
            .select('id')
            .eq('user_id', lowerId)
            .eq('friend_id', higherId)
            .maybeSingle();

        if (amistadError && !isMissingFriendTablesError(amistadError)) {
            return { error: amistadError };
        }

        if (amistadExistente) {
            return { error: new Error('Ya son amigos.') };
        }

        const { data: solicitudExistente, error: solicitudError } = await supabaseClient
            .from('solicitudes_amistad')
            .select('id, estado, solicitante_id, receptor_id')
            .or(`and(solicitante_id.eq.${solicitanteId},receptor_id.eq.${receptorId}),and(solicitante_id.eq.${receptorId},receptor_id.eq.${solicitanteId})`)
            .eq('estado', 'pendiente')
            .maybeSingle();

        if (solicitudError && !isMissingFriendTablesError(solicitudError)) {
            return { error: solicitudError };
        }

        if (solicitudExistente) {
            return { error: new Error('Ya existe una solicitud pendiente entre ambos usuarios.') };
        }

        const { data, error } = await supabaseClient
            .from('solicitudes_amistad')
            .insert([{
                solicitante_id: solicitanteId,
                receptor_id: receptorId,
                estado: 'pendiente'
            }])
            .select()
            .single();

        return { data, error };
    },

    async responderSolicitudAmistad(solicitudId, aceptar) {
        const { data: solicitud, error: solicitudError } = await supabaseClient
            .from('solicitudes_amistad')
            .select('*')
            .eq('id', solicitudId)
            .single();

        if (solicitudError) {
            return { error: solicitudError };
        }

        const nuevoEstado = aceptar ? 'aceptada' : 'rechazada';
        const { error: updateError } = await supabaseClient
            .from('solicitudes_amistad')
            .update({ estado: nuevoEstado, responded_at: new Date().toISOString() })
            .eq('id', solicitudId);

        if (updateError) {
            return { error: updateError };
        }

        if (!aceptar) {
            return { data: { estado: nuevoEstado }, error: null };
        }

        const [lowerId, higherId] = sortFriendPair(solicitud.solicitante_id, solicitud.receptor_id);
        const { data, error } = await supabaseClient
            .from('amistades')
            .upsert([{
                user_id: lowerId,
                friend_id: higherId
            }], { onConflict: 'user_id,friend_id' })
            .select()
            .single();

        return { data, error };
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