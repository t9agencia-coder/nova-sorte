var CheckoutPix = {
    modalId: 'modal-pix-checkout', timerInterval: null, pollingInterval: null, redirectUrl: '',
    iniciar: function(v,r) { this.redirectUrl = r; this.gerarPix(v); },
    obterDadosUsuario: function() {
        var s = JSON.parse(localStorage.getItem('podpay_dados')) || {};
        if (s.nome && s.cpf) return s;
        var u = JSON.parse(localStorage.getItem('dadosSaquePix')) || {};
        var n = ["Joao Silva","Maria Oliveira","Pedro Santos","Ana Costa","Lucas Ferreira","Juliana Almeida"];
        return {nome: u.nomeCompleto || n[Math.floor(Math.random()*n.length)],
                email: "cliente" + Math.floor(1000+Math.random()*9000) + "@email.com",
                cpf: (u.cpf || "").replace(/\D/g,'') || Math.floor(100+Math.random()*899)+"00000000",
                telefone: u.telefone || "11999999999"};
    },
    gerarPix: function(valor) {
        var pagina = document.getElementById('pagina-inicial');
        var modal = document.getElementById(this.modalId);
        var lv = document.getElementById('pix-loading');
        var cv = document.getElementById('pix-content');
        pagina.style.display = 'none';
        lv.style.display = 'flex';
        cv.style.display = 'none';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('checkout-valor-exibido').textContent = 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
        var u = this.obterDadosUsuario();
        var ac = Math.round(parseFloat(String(valor).replace(',','.')) * 100);
        fetch('/api/podpay', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                amount: ac,
                customer: {name: u.nome, document: {type: "cpf", number: u.cpf.replace(/\D/g,'')}, email: u.email, phone: u.telefone || "11999999999"},
                items: [{title: "Pagamento", unitPrice: ac, quantity: 1, tangible: false}]
            })
        })
        .then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error((e.error && e.error.message) || 'Erro ao gerar PIX'); });
            return r.json();
        })
        .then(function(d) {
            if (!d.success || !d.data) throw new Error(d.error?.message || 'Resposta invalida da API');
            var t = d.data;
            var px = t.pixQrCode || '';
            var id = t.id || '';
            if (!px) throw new Error('PIX nao gerado: resposta sem codigo');
            document.getElementById('pix-copia-checkout').value = px;
            var qi = document.getElementById('pix-qr-checkout');
            qi.src = t.pixQrCodeImage || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(px);
            setTimeout(function() { lv.style.display = 'none'; cv.style.display = 'block'; CheckoutPix.iniciarTimer(420); }, 400);
            CheckoutPix.iniciarPolling(id);
        })
        .catch(function(e) {
            console.error(e);
            alert("Erro: " + (e.message || "Tente novamente."));
            CheckoutPix.fechar();
        });
    },
    iniciarTimer: function(d) {
        clearInterval(this.timerInterval);
        var e = document.getElementById('expira-timer-checkout');
        var t = d;
        this.timerInterval = setInterval(function() {
            var mn = parseInt(t/60, 10);
            var sc = parseInt(t%60, 10);
            if (e) e.textContent = (mn<10?'0':'')+mn+':'+(sc<10?'0':'')+sc;
            if (--t < 0) { clearInterval(CheckoutPix.timerInterval); if(e) e.textContent = '00:00'; }
        }, 1000);
    },
    iniciarPolling: function(id) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(function() {
            fetch('/api/podpay?id=' + encodeURIComponent(id), {headers: {'Accept': 'application/json'}})
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success && res.data && res.data.status === 'paid') {
                    clearInterval(CheckoutPix.pollingInterval);
                    clearInterval(CheckoutPix.timerInterval);
                    var sc = document.getElementById('status-checkout');
                    sc.className = 'status-card status-success';
                    sc.innerHTML = '<i class="bx bx-check-circle status-icon"></i><div class="status-text"><strong>Pagamento Confirmado!</strong><span>Redirecionando...</span></div>';
                    setTimeout(function() { window.location.href = CheckoutPix.redirectUrl; }, 1500);
                }
            })
            .catch(function(e) { console.error('Polling:', e); });
        }, 4000);
    },
    copiar: function() {
        var i = document.getElementById('pix-copia-checkout');
        i.select(); i.setSelectionRange(0, 99999);
        try { document.execCommand('copy'); alert('Codigo PIX copiado!'); }
        catch(e) { navigator.clipboard.writeText(i.value).then(function() { alert('Codigo PIX copiado!'); }); }
    },
    fechar: function() {
        clearInterval(this.timerInterval);
        clearInterval(this.pollingInterval);
        var modal = document.getElementById(this.modalId);
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};
