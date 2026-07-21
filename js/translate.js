// Mapeo de textos en español a claves de traducción
const textToKeyMapping = {
    'Iniciar Sesión': 'signIn',
    'Comunidad Privada': 'privateComm',
    'Acceso Miembros': 'memberAccess',
    'Formulario de Postulación': 'applicationForm',
    'Postular a la Comunidad': 'joinCommunity',
    'Un espacio exclusivo para conectar con alguien especial': 'welcome',
    'En Proyecto Akaito queremos facilitarte la formación de una pareja romántica, nos enfocamos en jóvenes de la colectividad nikkei en el Perú.': 'subtitle',
    '¿Quiénes Somos?': 'about',
    'Akaito es una plataforma privada y verificada para conectar a jóvenes de la comunidad nikkei.': 'aboutText',
    'Saber Más': 'learnMore',
    'Enviar mi Postulación': 'submit',
    'Guardar Cambios': 'saveChanges',
};

// Almacenar los textos originales cuando carga la página
let originalTexts = {};

function storeOriginalTexts() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    let index = 0;
    
    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 0 && textToKeyMapping[text]) {
            originalTexts[index] = {
                node: node,
                originalText: text,
                key: textToKeyMapping[text]
            };
            index++;
        }
    }
}

// Sistema de traducción dinámica
function applyTranslations() {
    const lang = getCurrentLanguage();
    
    // Traducir elementos con atributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        
        if (element.hasAttribute('data-i18n-placeholder')) {
            element.placeholder = t(element.getAttribute('data-i18n-placeholder'));
        }
        
        if (element.tagName === 'INPUT' && element.type === 'button') {
            element.value = translation;
        } else if (element.tagName === 'BUTTON') {
            element.innerHTML = translation;
        } else if (element.tagName === 'A') {
            element.textContent = translation;
        } else if (element.tagName === 'LABEL') {
            element.textContent = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Usar los textos originales guardados para traducir
    Object.values(originalTexts).forEach(item => {
        if (item.node && item.node.parentNode) {
            const translation = t(item.key);
            item.node.textContent = translation;
        }
    });
    
    // Traducir placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

// Aplicar traducciones al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    storeOriginalTexts();
    applyTranslations();
    
    // Establecer el idioma guardado en el selector
    const languageSelector = document.getElementById('languageSelector');
    const currentLang = getCurrentLanguage();
    
    if (languageSelector) {
        languageSelector.value = currentLang;
    }
});

// Función mejorada para cambiar el idioma - SIN RELOAD
window.changeLanguage = function(lang) {
    if (translations[lang]) {
        localStorage.setItem('language', lang);
        // Aplicar traducciones sin recargar
        applyTranslations();
        
        // Actualizar el selector
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.value = lang;
        }
    }
};
