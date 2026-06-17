var CheckoutPix = {
    modalId: 'modal-pix-checkout', timerInterval: null, pollingInterval: null,
    iniciar: function(v,r) { this.redirectUrl = r; this.criarModal(); this.gerarPix(v); },
    obterDadosUsuario: function() {
        var s = JSON.parse(localStorage.getItem('podpay_dados')) || {};
        if (s.nome && s.cpf) return s;
        var u = JSON.parse(localStorage.getItem('dadosSaquePix')) || {};
        var n = ["João Silva","Maria Oliveira","Pedro Santos","Ana Costa","Lucas Ferreira","Juliana Almeida"];
        return {nome: u.nomeCompleto || n[Math.floor(Math.random()*n.length)],
                email: "cliente" + Math.floor(1000+Math.random()*9000) + "@email.com",
                cpf: (u.cpf || "").replace(/\D/g,'') || Math.floor(100+Math.random()*899)+"00000000",
                telefone: u.telefone || "11999999999"};
    },
    criarModal: function() {
        if(document.getElementById(this.modalId)) document.getElementById(this.modalId).remove();
        var s=document.createElement('style'); s.innerHTML='#modal-pix-checkout{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);justify-content:center;align-items:center;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;padding:20px}@keyframes popPix{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}.pix-box{background:#f8f9fa;width:100%;max-width:400px;border-radius:16px;padding:20px 15px;box-sizing:border-box;animation:popPix .3s ease-out;max-height:90vh;overflow-y:auto;box-shadow:0 10px 25px rgba(0,0,0,0.2)}.pix-box::-webkit-scrollbar{display:none}.pix-header{text-align:center;font-size:18px;font-weight:700;color:#000;margin:0 0 20px 0}.saldo-card{border:1px solid #cce5ff;background:#f0f7ff;border-radius:12px;padding:15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.saldo-card-info span{display:block;font-size:10px;font-weight:700;color:#0056b3;margin-bottom:4px}.saldo-card-info strong{display:block;font-size:18px;font-weight:800;color:#000}.saldo-timer{text-align:right}.saldo-timer span{display:block;font-size:10px;font-weight:700;color:#0056b3;margin-bottom:4px}.saldo-timer strong{display:block;font-size:18px;font-weight:800;color:#000}.pix-card{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.03);margin-bottom:15px;border:1px solid #eee}.pix-card h4{margin:0 0 5px;font-size:16px;color:#000;font-weight:700}.pix-card p{margin:0 0 15px;font-size:12px;color:#666}.qr-wrap{border:1px solid #eee;border-radius:12px;padding:10px;display:inline-block;margin-bottom:15px;background:#fff}.pix-qr{width:180px;height:180px;display:block;object-fit:contain}.pix-input{width:100%;padding:12px;border:1px solid #eee;border-radius:8px;box-sizing:border-box;resize:none;background:#f9f9f9;color:#555;font-size:11px;margin-bottom:15px;word-break:break-all;height:60px;font-family:monospace}.pix-btn2{background:#007bff;color:#fff;border:none;padding:14px;border-radius:8px;cursor:pointer;width:100%;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:.2s;box-shadow:0 4px 10px rgba(0,123,255,.3)}.pix-btn2:hover{background:#0056b3}.pix-btn2 i{font-size:18px}.status-card{display:flex;align-items:center;gap:12px;padding:15px;border-radius:12px;margin-bottom:12px;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.02);border:1px solid #eee}.status-icon{font-size:24px;flex-shrink:0}.status-text{display:flex;flex-direction:column;text-align:left}.status-text strong{font-size:13px;color:#000;margin-bottom:2px}.status-text span{font-size:11px;color:#666}.status-wait .status-icon{color:#007bff}.status-success{background:#e8f8f0;border:1px solid #bcead5}.status-success .status-icon{color:#10b981}.status-danger{background:#fdf3f4;border:1px solid #f8d7da}.status-danger .status-icon{color:#dc3545}.pix-footer{display:flex;align-items:center;justify-content:center;gap:6px;color:#888;font-size:11px;margin-top:18px;text-align:center}#pix-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px}#pix-content{display:none}.pix-spinner{font-size:40px;color:#007bff;margin-bottom:15px}'; document.head.appendChild(s);
        var m=document.createElement('div'); m.id=this.modalId;
        m.innerHTML='<div class="pix-box"><div id="pix-loading"><i class="bx bx-loader-alt bx-spin pix-spinner"></i><p style="color:#333;margin:0;font-weight:700;font-size:16px">Gerando pagamento...</p><p style="color:#888;font-size:12px;margin-top:5px">Aguarde um instante</p></div><div id="pix-content"><h2 class="pix-header">Pagamento via PIX</h2><div class="saldo-card"><div class="saldo-card-info"><span>VALOR</span><strong id="checkout-valor-exibido">R$ 0,00</strong></div><div class="saldo-timer"><span>EXPIRA EM</span><strong id="expira-timer-checkout">07:00</strong></div></div><div class="pix-card"><h4>Pague via PIX</h4><p>Escaneie o QR Code ou copie o c\u00f3digo abaixo</p><div class="qr-wrap"><img id="pix-qr-checkout" class="pix-qr" src="" alt="QR Code PIX"></div><textarea id="pix-copia-checkout" class="pix-input" readonly></textarea><button class="pix-btn2" onclick="CheckoutPix.copiar()"><i class="bx bx-copy"></i> Copiar c\u00f3digo PIX</button></div><div class="status-card status-wait" id="status-checkout"><i class="bx bx-loader-alt bx-spin status-icon"></i><div class="status-text"><strong id="status-text-checkout">Aguardando pagamento...</strong><span id="status-sub-checkout">Atualiza\u00e7\u00e3o autom\u00e1tica</span></div></div><div class="status-card status-danger"><i class="bx bx-error status-icon"></i><div class="status-text"><strong>N\u00e3o perca seu pr\u00eamio</strong><span>O saldo ser\u00e1 cancelado se o pagamento n\u00e3o for confirmado.</span></div></div><button class="pix-btn2" onclick="CheckoutPix.copiar()" style="margin-top:5px"><i class="bx bx-copy"></i> Copiar c\u00f3digo PIX</button><div class="pix-footer"><i class="bx bx-shield-quarter"></i> Pagamento 100% seguro</div></div></div>';
        m.addEventListener('click',function(e){if(e.target.id===CheckoutPix.modalId)CheckoutPix.fechar()});
        document.body.appendChild(m);
    },
    iniciarTimer: function(d){clearInterval(this.timerInterval);var e=document.getElementById('expira-timer-checkout'),t=d,mn,sc;this.timerInterval=setInterval(function(){mn=parseInt(t/60,10);sc=parseInt(t%60,10);if(e)e.textContent=(mn<10?'0':'')+mn+':'+(sc<10?'0':'')+sc;if(--t<0){clearInterval(CheckoutPix.timerInterval);if(e)e.textContent='00:00'}},1000)},
    gerarPix: function(valor){
        var modal=document.getElementById(this.modalId),lv=document.getElementById('pix-loading'),cv=document.getElementById('pix-content');
        lv.style.display='flex';cv.style.display='none';modal.style.display='flex';document.body.style.overflow='hidden';
        document.getElementById('checkout-valor-exibido').textContent='R$ '+parseFloat(valor).toFixed(2).replace('.',',');
        var u=this.obterDadosUsuario(),ac=Math.round(parseFloat(String(valor).replace(',','.'))*100);
        fetch('/api/podpay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:ac,customer:{name:u.nome,document:{type:"cpf",number:u.cpf.replace(/\D/g,'')},email:u.email,phone:u.telefone||"11999999999"},items:[{title:"Pagamento",unitPrice:ac,quantity:1,tangible:false}]})})
        .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error((e.error&&e.error.message)||'Erro')});return r.json()})
        .then(function(d){if(!d.success||!d.data)throw new Error(d.error?.message||'Erro');var t=d.data,px=t.pixQrCode||'',id=t.id||'';if(!px)throw new Error('PIX n\u00e3o gerado');document.getElementById('pix-copia-checkout').value=px;var qi=document.getElementById('pix-qr-checkout');qi.src=t.pixQrCodeImage||'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='+encodeURIComponent(px);setTimeout(function(){lv.style.display='none';cv.style.display='block';CheckoutPix.iniciarTimer(420)},400);CheckoutPix.iniciarPolling(id)}.bind(this))
        .catch(function(e){console.error(e);alert("Erro: "+(e.message||"Tente novamente."));CheckoutPix.fechar()});
    },
    iniciarPolling: function(id){
        clearInterval(this.pollingInterval);
        this.pollingInterval=setInterval(function(){
            fetch('/api/podpay?id='+encodeURIComponent(id),{headers:{'Accept':'application/json'}})
            .then(function(r){return r.json()}).then(function(res){
                if(res.success&&res.data&&res.data.status==='paid'){
                    clearInterval(CheckoutPix.pollingInterval);clearInterval(CheckoutPix.timerInterval);
                    var sc=document.getElementById('status-checkout');sc.className='status-card status-success';
                    sc.innerHTML='<i class="bx bx-check-circle status-icon"></i><div class="status-text"><strong>Pagamento Confirmado!</strong><span>Redirecionando...</span></div>';
                    setTimeout(function(){window.location.href=CheckoutPix.redirectUrl},1500);
                }
            }).catch(function(e){console.error('Polling:',e)});
        },4000);
    },
    copiar: function(){var i=document.getElementById('pix-copia-checkout');i.select();i.setSelectionRange(0,99999);try{document.execCommand('copy');alert('C\u00f3digo PIX copiado!')}catch(e){navigator.clipboard.writeText(i.value).then(function(){alert('C\u00f3digo PIX copiado!')})}},
    fechar: function(){clearInterval(this.timerInterval);clearInterval(this.pollingInterval);var m=document.getElementById(this.modalId);if(m)m.style.display='none';document.body.style.overflow='auto'}
};
