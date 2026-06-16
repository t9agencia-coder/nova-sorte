(function() {
    'use strict';

    // Configuração - parâmetros que você quer capturar
    const CONFIG = {
        clickIdParam: 'click_id',
        pixelIdParam: 'pixel_id',
        utmSourceParam: 'utm_source',
        storageKey: 'UTM_SOURCE_VALUE'
    };

    // Executa quando o DOM estiver pronto
    function onReady(fn) {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    // Pega parâmetros da URL
    function getUrlParams() {
        return new URLSearchParams(window.location.search);
    }

    // Gera o utm_source a partir de click_id e pixel_id
    function generateUtmSource() {
        const params = getUrlParams();
        const clickId = params.get(CONFIG.clickIdParam);
        const pixelId = params.get(CONFIG.pixelIdParam);

        if (clickId && pixelId) {
            return `${clickId}::${pixelId}`;
        }
        return null;
    }

    // Pega utm_source existente (da URL ou localStorage)
    function getExistingUtmSource() {
        const params = getUrlParams();
        const fromUrl = params.get(CONFIG.utmSourceParam);
        
        if (fromUrl) {
            // Salva no localStorage para persistir
            localStorage.setItem(CONFIG.storageKey, fromUrl);
            return fromUrl;
        }

        // Tenta pegar do localStorage
        return localStorage.getItem(CONFIG.storageKey);
    }

    // Atualiza a URL atual com utm_source (e remove click_id/pixel_id)
    function updateCurrentUrl(utmSource, removeOriginalParams) {
        const url = new URL(window.location.href);
        
        // Remove os parâmetros originais
        if (removeOriginalParams) {
            url.searchParams.delete(CONFIG.clickIdParam);
            url.searchParams.delete(CONFIG.pixelIdParam);
        }
        
        url.searchParams.set(CONFIG.utmSourceParam, utmSource);
        window.history.replaceState({}, '', url.toString());
    }

    // Atualiza um link/botão com utm_source (só passa utm_source, não click_id/pixel_id)
    function updateLink(element, utmSource) {
        if (!element.href) return;
        if (element.href.startsWith('#') || element.href.startsWith('javascript:')) return;

        try {
            const url = new URL(element.href);
            
            // Remove click_id e pixel_id do link
            url.searchParams.delete(CONFIG.clickIdParam);
            url.searchParams.delete(CONFIG.pixelIdParam);
            
            // Adiciona só o utm_source
            url.searchParams.set(CONFIG.utmSourceParam, utmSource);
            element.href = url.toString();
        } catch (e) {
            // URL inválida, ignora
        }
    }

    // Atualiza todos os links da página
    function updateAllLinks(utmSource) {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => updateLink(link, utmSource));

        // Também atualiza botões que podem ter onclick com redirecionamento
        const buttons = document.querySelectorAll('button[data-href], [role="button"][data-href]');
        buttons.forEach(btn => {
            const href = btn.getAttribute('data-href');
            if (href) {
                try {
                    const url = new URL(href, window.location.origin);
                    url.searchParams.delete(CONFIG.clickIdParam);
                    url.searchParams.delete(CONFIG.pixelIdParam);
                    url.searchParams.set(CONFIG.utmSourceParam, utmSource);
                    btn.setAttribute('data-href', url.toString());
                } catch (e) {}
            }
        });
    }

    // Observa novos elementos adicionados ao DOM
    function watchForNewLinks(utmSource) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        // Se o próprio nó é um link
                        if (node.matches && node.matches('a[href]')) {
                            updateLink(node, utmSource);
                        }
                        // Se contém links dentro
                        const links = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
                        links.forEach(link => updateLink(link, utmSource));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Função principal
    function init() {
        // 1. Verifica se já tem utm_source (na URL ou localStorage)
        let utmSource = getExistingUtmSource();
        let wasGenerated = false;

        // 2. Se não tem, tenta gerar a partir de click_id::pixel_id
        if (!utmSource) {
            utmSource = generateUtmSource();
            wasGenerated = true; // Marca que foi gerado a partir de click_id/pixel_id
        }

        // 3. Se conseguiu um utm_source, propaga
        if (utmSource) {
            console.log('[UTM Propagator] utm_source:', utmSource);
            
            // Salva no localStorage
            localStorage.setItem(CONFIG.storageKey, utmSource);
            
            // Atualiza URL atual (remove click_id/pixel_id se foi gerado a partir deles)
            updateCurrentUrl(utmSource, wasGenerated);
            
            // Atualiza todos os links existentes
            updateAllLinks(utmSource);
            
            // Observa novos links
            watchForNewLinks(utmSource);
        } else {
            console.log('[UTM Propagator] Nenhum utm_source encontrado');
        }
    }

    // Inicia quando o DOM estiver pronto
    onReady(init);

})();
