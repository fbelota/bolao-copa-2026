const cfg = window.BOLAO_CONFIG;
const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let jogoAtual = null;
let usuario = null;

const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const statusLabel = s => s === 'validated' || s === 'paid' ? 'validado' : 'pendente';
const betStatus = b => b.status || (b.validated ? 'validated' : 'pending');

async function carregarTudo(){
  await carregarJogo();
  await carregarPalpites();
}

async function carregarJogo(){
  const { data, error } = await client.from('games').select('*').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error){mostrarErro('Erro ao carregar jogo: '+error.message);return;}
  jogoAtual = data;
  const box = document.getElementById('jogoAberto');
  const form = document.getElementById('formPalpite');
  if(!data){box.innerHTML='Nenhum jogo cadastrado ainda.';form.style.display='none';return;}
  const aberto = data.status === 'open';
  box.innerHTML = `<strong>${data.home_team} x ${data.away_team}</strong><span>${formatarData(data.game_date)} às ${String(data.game_time).slice(0,5)} | ${aberto?'Apostas abertas':'Apostas fechadas'}</span>`;
  form.style.display = aberto ? 'grid' : 'none';
  document.getElementById('homeTeam').value = data.home_team || '';
  document.getElementById('awayTeam').value = data.away_team || '';
  document.getElementById('gameDate').value = data.game_date || '';
  document.getElementById('gameTime').value = String(data.game_time || '').slice(0,5);
  document.getElementById('gameStatus').value = data.status || 'open';
}

function formatarData(d){
  if(!d) return '';
  const [a,m,di]=d.split('-');
  return `${di}/${m}/${a}`;
}

async function carregarPalpites(){
  let q = client.from('bets').select('*').order('created_at',{ascending:false});
  const {data,error}= await q;
  if(error){mostrarErro('Erro ao carregar palpites: '+error.message);return;}
  const bets = data || [];
  renderResumo(bets);
  renderStats(bets);
  renderLista(bets);
  renderAdminBets(bets);
}

function renderResumo(bets){
  const validados = bets.filter(b=>['validated','paid'].includes(betStatus(b))).length;
  const pendentes = bets.length - validados;
  document.getElementById('totalPalpites').textContent = bets.length;
  document.getElementById('validados').textContent = validados;
  document.getElementById('pendentes').textContent = pendentes;
  document.getElementById('arrecadado').textContent = fmtBRL(validados * cfg.VALOR_PALPITE);
  document.getElementById('pixTexto').textContent = cfg.PIX_TEXTO;
}

function placarDe(b){return `${b.home_score} x ${b.away_score}`;}

function renderStats(bets){
  const cont = {};
  bets.forEach(b=>{const p=placarDe(b);cont[p]=(cont[p]||0)+1;});
  const arr = Object.entries(cont).sort((a,b)=>b[1]-a[1]);
  document.getElementById('estatisticas').innerHTML = arr.length ? arr.map(([p,n])=>`<div class="item"><strong>${p}</strong><span>${n} palpite(s)</span></div>`).join('') : 'Nenhum palpite enviado.';
}

function renderLista(bets){
  const html = `<table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Placar</th><th>Status</th><th>Data</th></tr></thead><tbody>${bets.map(b=>`<tr><td>${esc(b.bettor_name||b.name||'')}</td><td>${esc(b.bettor_whatsapp||b.whatsapp||'')}</td><td>${placarDe(b)}</td><td><span class="badge ${statusLabel(betStatus(b))}">${statusLabel(betStatus(b))}</span></td><td>${new Date(b.created_at).toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('listaPalpites').innerHTML = bets.length ? html : 'Nenhum palpite enviado.';
}

function renderAdminBets(bets){
  const el = document.getElementById('adminBets');
  if(!el) return;
  el.innerHTML = bets.length ? bets.map(b=>`<div class="item admin-bet"><div><strong>${esc(b.bettor_name||b.name||'')}</strong><br><span>${esc(b.bettor_whatsapp||b.whatsapp||'')} | ${placarDe(b)} | ${statusLabel(betStatus(b))}</span></div><button class="btn" onclick="validarBet(${b.id})">Validar pagamento</button></div>`).join('') : 'Nenhum palpite ainda.';
}

async function validarBet(id){
  const {error}= await client.from('bets').update({status:'validated'}).eq('id',id);
  if(error){mostrarErro(error.message);return;}
  await carregarPalpites();
}
window.validarBet = validarBet;

function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function mostrarErro(msg){alert(msg);}

async function checarAdmin(){
  const {data:{session}}= await client.auth.getSession();
  usuario = session?.user || null;
  if(!usuario){mostrarLogin();return;}
  const {data,error}= await client.from('admins').select('*').eq('email',usuario.email).maybeSingle();
  if(error || !data){alert('Seu e-mail não está cadastrado como administrador.');mostrarLogin();return;}
  mostrarPainel();
}
function mostrarLogin(){document.getElementById('loginBox').classList.remove('oculto');document.getElementById('painelAdmin').classList.add('oculto');}
function mostrarPainel(){document.getElementById('loginBox').classList.add('oculto');document.getElementById('painelAdmin').classList.remove('oculto');carregarTudo();}

document.getElementById('formPalpite').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!jogoAtual || jogoAtual.status !== 'open'){alert('Não existe jogo aberto para palpites.');return;}
  const novo = {
    game_id: jogoAtual.id,
    bettor_name: document.getElementById('nome').value.trim(),
    bettor_whatsapp: document.getElementById('whatsapp').value.trim(),
    home_score: Number(document.getElementById('placarCasa').value),
    away_score: Number(document.getElementById('placarFora').value),
    status: 'pending'
  };
  const {error}= await client.from('bets').insert(novo);
  if(error){mostrarErro('Erro ao enviar palpite: '+error.message);return;}
  e.target.reset();
  alert('Palpite enviado. Agora faça o Pix e envie o comprovante pelo WhatsApp.');
  carregarPalpites();
});

document.getElementById('btnWhats').addEventListener('click',()=>{
  const msg = encodeURIComponent('Olá. Enviei meu palpite no bolão e vou mandar o comprovante do Pix.');
  window.open(`https://wa.me/${cfg.WHATSAPP_ORGANIZADOR}?text=${msg}`,'_blank');
});

document.getElementById('btnAdmin').addEventListener('click',()=>{document.getElementById('modalAdmin').showModal();checarAdmin();});
document.getElementById('fecharAdmin').addEventListener('click',()=>document.getElementById('modalAdmin').close());

document.getElementById('loginAdmin').addEventListener('click',async()=>{
  const email = document.getElementById('emailAdmin').value.trim();
  if(!email){alert('Informe seu e-mail.');return;}
  const {error}= await client.auth.signInWithOtp({email,options:{emailRedirectTo: window.location.href}});
  if(error){mostrarErro(error.message);return;}
  alert('Enviamos um link de acesso para seu e-mail.');
});

document.getElementById('logoutAdmin').addEventListener('click',async()=>{await client.auth.signOut();mostrarLogin();});

document.getElementById('formJogo').addEventListener('submit',async e=>{
  e.preventDefault();
  const payload = {
    home_team: document.getElementById('homeTeam').value.trim(),
    away_team: document.getElementById('awayTeam').value.trim(),
    game_date: document.getElementById('gameDate').value,
    game_time: document.getElementById('gameTime').value,
    status: document.getElementById('gameStatus').value
  };
  let res;
  if(jogoAtual?.id) res = await client.from('games').update(payload).eq('id',jogoAtual.id);
  else res = await client.from('games').insert(payload);
  if(res.error){mostrarErro(res.error.message);return;}
  alert('Jogo salvo.');
  await carregarJogo();
});

client.channel('public-changes').on('postgres_changes',{event:'*',schema:'public'},carregarTudo).subscribe();
carregarTudo();
