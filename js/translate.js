// Diccionario directo español → japonés para reemplazo de texto en el DOM
const ES_JA = {
    // Navegación dashboard
    'Inicio': 'ホーム',
    'Mi Perfil': 'マイプロフィール',
    'Usuarios': 'ユーザー',
    'Citas': 'デート',
    'Eventos': 'イベント',
    'Chat': 'チャット',
    'Beneficios a parejas': 'カップル特典',
    'Preguntas': 'よくある質問',
    'Ayuda': 'ヘルプ',
    'Configuración': '設定',
    'Cerrar Sesión': 'ログアウト',
    'Miembro': 'メンバー',
    'Admin': '管理者',

    // Encabezados de sección
    '🏠 Inicio': '🏠 ホーム',
    '👤 Mi Perfil de Miembro': '👤 マイプロフィール',
    '👥 Usuarios': '👥 ユーザー',
    '📅 Citas': '📅 デート',
    '🎉 Eventos': '🎉 イベント',
    '💬 Chat': '💬 チャット',
    '💑 Beneficios a Parejas': '💑 カップル特典',
    '📘 Preguntas Frecuentes': '📘 よくある質問',
    '❓ Soporte y Ayuda': '❓ サポート・ヘルプ',
    '⚙️ Configuración': '⚙️ 設定',

    // Subtítulos
    'Explora la comunidad y gestiona tus conexiones.': 'コミュニティを探索し、つながりを管理しましょう。',
    'Organiza tus encuentros y revisa tu actividad reciente.': 'デートを整理し、最近のアクティビティを確認しましょう。',
    'Participa en eventos especiales de la comunidad.': 'コミュニティの特別なイベントに参加しましょう。',
    'Formaliza tu relación dentro de la comunidad y accede a beneficios exclusivos.': 'コミュニティ内での関係を公式化し、限定特典にアクセスしましょう。',
    'Completa tu información para que podamos encontrarte conexiones altamente compatibles.': '高い互換性のある出会いを見つけるために、情報を入力してください。',
    'Ajusta tus preferencias dentro de la plataforma.': 'プラットフォームの設定を調整しましょう。',
    '¿Tienes alguna duda o inconveniente? Estamos para ayudarte.': 'ご不明な点はありますか？お手伝いします。',

    // Pestañas
    'Buscar usuario': 'ユーザー検索',
    'Amigos': '友達',
    'Solicitudes de amigos': '友達申請',
    'Solicitudes de pareja': 'カップル申請',
    'Nueva invitación': '新しい招待',
    'Recibidas': '受信済み',
    'Enviadas': '送信済み',
    'Buscar evento': 'イベント検索',
    'Historial de eventos': 'イベント履歴',

    // Formulario de perfil
    '📋 Información Básica': '📋 基本情報',
    'Nombre(s):': '名前：',
    'Apellido Paterno:': '父方の姓：',
    'Apellido Materno:': '母方の姓：',
    'Apodo (Opcional):': 'ニックネーム（任意）：',
    'País:': '国：',
    'Fecha de nacimiento:': '生年月日：',
    'Género:': '性別：',
    'Masculino': '男性',
    'Femenino': '女性',
    'WhatsApp:': 'WhatsApp：',
    'Instagram (Opcional):': 'Instagram（任意）：',
    '✨ Sobre Mí e Intereses': '✨ 自己紹介・興味',
    '📸 Mis Fotos': '📸 写真',
    'Guardar Cambios': '変更を保存',
    'Foto Principal': 'メイン写真',
    'Foto 2': '写真2',

    // Citas
    'Invitar a una cita': 'デートに招待',
    'Tipo de cita:': 'デートの種類：',
    'Normal': '通常',
    'Gokon (Grupo)': 'ゴーコン（グループ）',
    'Fecha:': '日付：',
    'Hora:': '時間：',
    'Lugar:': '場所：',
    'Con quién:': '相手：',
    'Enviar invitación': '招待を送る',
    'Selecciona un usuario': 'ユーザーを選択',
    'Selecciona un tipo': '種類を選択',

    // Gokon
    'Mínimo 2 y máximo 5 participantes de cada género. Los pares no necesitan ser iguales.': '各性別2〜5人まで。ペアは均等でなくても構いません。',
    'Sin chicos disponibles': '男性ユーザーがいません',
    'Sin chicas disponibles': '女性ユーザーがいません',

    // Pareja
    'Sin pareja activa': 'アクティブなカップルなし',
    'Puedes enviar una solicitud de pareja a otro miembro.': '他のメンバーにカップル申請を送ることができます。',
    'Invitar a:': '招待する：',
    '💌 Enviar solicitud': '💌 申請を送る',
    'Terminar relación': '関係を終了',
    'Cancelar solicitud': '申請をキャンセル',

    // Configuración
    '🌐 Idioma': '🌐 言語',
    'Idioma de la interfaz:': 'インターフェース言語：',
    'Español': 'スペイン語',
    '🎨 Apariencia': '🎨 外観',
    'Modo oscuro:': 'ダークモード：',
    'Cambiar tema': 'テーマを変更',
    '🔒 Seguridad': '🔒 セキュリティ',
    'Cambia tu contraseña cuando lo necesites.': 'パスワードをいつでも変更できます。',
    'Cambiar contraseña': 'パスワードを変更',
    '🚨 Zona de peligro': '🚨 危険ゾーン',
    'Cerrar sesión en todos los dispositivos.': 'すべてのデバイスからログアウト。',

    // Botones comunes
    'Enviar Mensaje': 'メッセージを送る',
    'Agregar amigo': '友達追加',
    'Solicitud enviada': '申請送信済み',
    'Responder solicitud': '申請に返信',
    '💑 Solicitar pareja': '💑 カップル申請',
    'Enviar': '送信',
    'Aceptar': '承認',
    'Rechazar': '拒否',
    '✓ Aceptar': '✓ 承認',
    '✗ Rechazar': '✗ 拒否',
    'Recargar': '再読み込み',

    // Beneficios
    '🛍️ Descuentos exclusivos': '🛍️ 限定割引',
    'Próximamente disponible': 'もうすぐ利用可能',
    '🍼 Apoyo a padres': '🍼 親サポート',
    '🏫 Descuentos en colegios': '🏫 学校割引',
    '💒 Apoyo para la boda': '💒 結婚サポート',
    '🏠 Asesoría de vivienda': '🏠 住宅アドバイス',
    '📬 Mantente informado': '📬 最新情報を受け取る',
    'Disponible próximamente': 'もうすぐ公開',

    // Eventos
    'Shumikon': 'シュミコン',
    'Machikon': 'まちコン',
    'Ver proximas fechas': '次回日程を見る',
    'Estado: Finalizado': '状態：終了',

    // Login / Registro
    'Iniciar Sesión': 'ログイン',
    'Acceso Miembros': 'メンバーアクセス',
    '❤️ Ingresar a la Comunidad ❤️': '❤️ コミュニティへログイン ❤️',
    'Correo Electrónico:': 'メールアドレス：',
    'Contraseña:': 'パスワード：',
    '¿Aún no postulas?': 'まだ申請していませんか？',
    'Postula aquí': 'こちらで申請',
    'Recuperar tu contraseña': 'パスワードを回復',
    'Comunidad Privada': 'プライベートコミュニティ',
    'Iniciar Sesión': 'ログイン',

    // Registro
    '🌸 Únete a Akaito 🌸': '🌸 赤糸に参加 🌸',
    'Enviar mi Postulación': '申請を送信',

    // Index
    '❤️ Un espacio exclusivo para conectar con alguien especial ❤️': '❤️ 特別な誰かと出会うための専用スペース ❤️',
    'Un espacio exclusivo para conectar con alguien especial': '特別な誰かと出会うための専用スペース',
    'En Proyecto Akaito queremos facilitar la formación de parejas románticas a jóvenes de la colectividad nikkei internacional.': '赤糸プロジェクトでは、国際日系コミュニティの若者がロマンチックなカップルを形成するお手伝いをします。',
    'En Proyecto Akaito queremos facilitarte la formación de una pareja romántica, nos enfocamos en jóvenes de la colectividad nikkei en el Perú.': '赤糸プロジェクトでは、ペルーの日系若年層を対象にロマンチックなパートナーシップの形成をサポートします。',
    'Postular a la Comunidad': 'コミュニティに参加申請',
    'Eficientes y eficaces': '効率的で効果的',
    'Comprometidos con el compromiso amoroso.': '真剣な交際へのコミットメント。',
    '100% Discreto': '100% 秘密厳守',
    'Cuidamos tu privacidad desde el primer día. Tus datos y participación se manejan bajo estricta confidencialidad para tu total tranquilidad.': '初日からプライバシーを守ります。あなたのデータと参加情報は厳格な守秘義務のもとで管理されます。',
    'Eventos a Medida de la comunidad': 'コミュニティ向けイベント',
    'Desde esta acercamientos web hasta gōkon (presencial).': 'オンラインのマッチングからゴーコン（対面）まで。',
    '¿Tienes Preguntas? ¿quieres unirte al equipo Akaito?': '質問がありますか？赤糸チームに参加しませんか？',
    'Contáctanos para más información sobre cómo unirte a nuestra comunidad': 'コミュニティへの参加方法の詳細はお問い合わせください',
    '✉️ admin@akaito.link': '✉️ admin@akaito.link',
    'Responderemos tu mensaje lo antes posible': 'できるだけ早くご返信します',
    '© 2026 Proyecto Akaito. Todos los derechos reservados.': '© 2026 赤糸プロジェクト。全著作権所有。',
    'Proyecto Akaito': '赤糸プロジェクト',
    'Iniciar Sesión': 'ログイン',
    '🔐 Admin': '🔐 管理者',
    '¿Quiénes Somos?': '私たちについて',
    'Akaito es una plataforma privada y verificada para conectar a jóvenes de la comunidad nikkei.': '赤糸は日系コミュニティの若者を繋ぐプライベートな認証済みプラットフォームです。',
    'Saber Más': '詳細を見る',
    'Únete a la Comunidad': 'コミュニティに参加',

    // Mensajes vacíos
    'No hay usuarios disponibles': '利用可能なユーザーがいません',
    'Sin conversaciones aún': 'まだ会話がありません',
    'Cargando...': '読み込み中...',
    'Cargando miembros...': 'メンバーを読み込み中...',
    'No tienes invitaciones recibidas.': '受信した招待はありません。',
    'No has enviado invitaciones.': '招待を送っていません。',
    'No hay postulantes': '応募者がいません',
};

// Inversión JA→ES generada automáticamente
const JA_ES = Object.fromEntries(Object.entries(ES_JA).map(([k, v]) => [v, k]));

// Almacena {node, esText} para cada nodo de texto al cargar
let textoOriginales = [];

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

function recolectarNodos() {
    textoOriginales = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
        const text = node.textContent;
        if (text.trim().length === 0) continue;
        // Guardamos siempre el texto en español (si ya está en japonés, lo traducimos de vuelta)
        const esText = JA_ES[text.trim()] ? JA_ES[text.trim()] : (ES_JA[text.trim()] !== undefined ? text.trim() : null);
        if (esText) {
            textoOriginales.push({ node, esText, prefix: text.replace(text.trim(), '') });
        }
    }
}

function aplicarIdioma() {
    const lang = getCurrentLanguage();

    // Aplicar a nodos de texto colectados
    textoOriginales.forEach(({ node, esText, prefix }) => {
        if (!node.parentNode) return;
        const traduccion = lang === 'ja' ? (ES_JA[esText] || esText) : esText;
        node.textContent = prefix + traduccion;
    });

    // Aplicar a elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (el.tagName === 'INPUT') el.value = val;
        else el.textContent = val;
    });

    // Actualizar placeholders
    document.querySelectorAll('[placeholder]').forEach(el => {
        const orig = el.dataset.placeholderEs || el.placeholder;
        el.dataset.placeholderEs = orig;
        el.placeholder = lang === 'ja' ? (ES_JA[orig] || orig) : orig;
    });

    // Sincronizar selectores de idioma
    ['languageSelector', 'configIdioma'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.value = lang;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    recolectarNodos();
    aplicarIdioma();
});

window.changeLanguage = function(lang) {
    if (!translations[lang]) return;
    localStorage.setItem('language', lang);
    // Re-recolectar porque el DOM puede haber cambiado (secciones dinámicas)
    recolectarNodos();
    aplicarIdioma();
};
