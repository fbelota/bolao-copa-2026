const cfg = window.BOLAO_CONFIG;
const supabaseClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let currentGame = null;
const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const $ = id => document.getElementById(id);

function fmtDate(date){
  if(!date) return '';
  const [y,m,d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function normalizeTeamName(name){
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const FLAG_CODE_MAP = {
  'brasil':'br','brazil':'br',
  'escocia':'gb-sct','scotland':'gb-sct',
  'argentina':'ar','mexico':'mx','canada':'ca','estados unidos':'us','united states':'us','usa':'us',
  'alemanha':'de','germany':'de','franca':'fr','france':'fr','inglaterra':'gb-eng','england':'gb-eng',
  'portugal':'pt','espanha':'es','spain':'es','uruguai':'uy','uruguay':'uy','colombia':'co',
  'japao':'jp','japan':'jp','holanda':'nl','netherlands':'nl','suecia':'se','sweden':'se',
  'marrocos':'ma','morocco':'ma','haiti':'ht','suica':'ch','switzerland':'ch','australia':'au',
  'turquia':'tr','turkey':'tr','paraguai':'py','paraguay':'py','belgica':'be','belgium':'be',
  'egito':'eg','egypt':'eg','ira':'ir','iran':'ir','nova zelandia':'nz','new zealand':'nz',
  'noruega':'no','norway':'no','senegal':'sn','iraque':'iq','iraq':'iq','austria':'at',
  'argelia':'dz','algeria':'dz','catar':'qa','qatar':'qa','africa do sul':'za','south africa':'za',
  'coreia do sul':'kr','south korea':'kr','tchequia':'cz','czechia':'cz',
  'croacia':'hr','croatia':'hr','gana':'gh','ghana':'gh','panama':'pa',
  'tunisia':'tn','tunisia':'tn','jordan':'jo','jordania':'jo','equador':'ec','ecuador':'ec',
  'curacao':'cw','costa do marfim':'ci','ivory coast':'ci','cabo verde':'cv','cape verde':'cv',
  'arabia saudita':'sa','saudi arabia':'sa','uzbequistao':'uz','uzbekistan':'uz',
  'congo dr':'cd','dr congo':'cd','bosnia':'ba','bosnia and herzegovina':'ba'
};

function flagCode(name){
  return FLAG_CODE_MAP[normalizeTeamName(name)] || '';
}

function teamFlagHtml(name){
  const code = flagCode(name);
  const initials = String(name || 'Time').slice(0,2).toUpperCase();
  if(!code) return `<span class="flag-fallback">${initials}</span>`;
  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="Bandeira ${escapeHtml(name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag-fallback',textContent:'${initials}'}))">`;
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function updateScoreFields(){
  if(!currentGame) return;
  const home = currentGame.home_team || 'Time A';
  const away = currentGame.away_team || 'Time B';
  $('homeScoreLabel').textContent = home;
  $('awayScoreLabel').textContent = away;
  $('homeScore').placeholder = `Gols ${home}`;
  $('awayScore').placeholder = `Gols ${away}`;
}

function statusLabel(s){
  return s === 'open' ? 'Apostas abertas' : s === 'closed' ? 'Apostas fechadas' : 'Finalizado';
}
function betStatusLabel(s){
  return (s === 'validated' || s === 'paid') ? 'Validado' : 'Pendente';
}
function showError(prefix, err){
  console.error(prefix, err);
  alert(`${prefix}: ${err?.message || err}`);
}

async function loadGame(){
  const { data, error } = await supabaseClient
    .from('games')
    .select('*')
    .order('created_at', { ascending:false })
    .limit(1)
    .maybeSingle();
  if(error){ showError('Erro ao carregar jogo', error); return; }
  currentGame = data;
  renderGame();
}
function renderGame(){
  const box = $('gameBox');
  if(!currentGame){
    box.innerHTML = '<p class="muted">Nenhum jogo cadastrado pelo organizador.</p>';
    $('betForm').classList.add('hidden');
    return;
  }
  const home = currentGame.home_team || 'Time A';
  const away = currentGame.away_team || 'Time B';
  box.innerHTML = `
    <div class="match-card">
      <span class="flag" aria-hidden="true">${teamFlagHtml(home)}</span>
      <div class="match-info">
        <div class="game-title">${home} x ${away}</div>
        <div class="muted">${fmtDate(currentGame.game_date)} às ${String(currentGame.game_time).slice(0,5)} | ${statusLabel(currentGame.status)}</div>
      </div>
      <span class="flag right" aria-hidden="true">${teamFlagHtml(away)}</span>
    </div>`;
  $('betForm').classList.toggle('hidden', currentGame.status !== 'open');
  updateScoreFields();
  $('adminHomeTeam').value = currentGame.home_team || '';
  $('adminAwayTeam').value = currentGame.away_team || '';
  $('adminDate').value = currentGame.game_date || '';
  $('adminTime').value = String(currentGame.game_time || '').slice(0,5);
  $('adminStatus').value = currentGame.status || 'open';
}

async function loadBets(){
  const { data, error } = await supabaseClient
    .from('bets')
    .select('*, games(home_team, away_team)')
    .order('id', { ascending:false });
  if(error){ showError('Erro ao carregar palpites', error); return; }
  renderStats(data || []);
  renderPublicBets(data || []);
  renderAdminBets(data || []);
}
function renderStats(bets){
  const valid = bets.filter(b => b.status === 'validated' || b.status === 'paid');
  const pending = bets.filter(b => b.status !== 'validated');
  $('totalBets').textContent = bets.length;
  $('validBets').textContent = valid.length;
  $('pendingBets').textContent = pending.length;
  $('totalMoney').textContent = money.format(valid.length * Number(cfg.VALOR_PALPITE || 0));
  const counts = {};
  bets.forEach(b => {
    const key = `${b.home_score} x ${b.away_score}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  $('scoreStats').innerHTML = entries.length ? entries.map(([score,count]) => `<div class="score-item"><strong>${score}</strong><span class="muted">${count} palpite(s)</span></div>`).join('') : 'Nenhum palpite enviado.';
}
function renderPublicBets(bets){
  $('publicBets').innerHTML = bets.length ? bets.map(b => `<div class="bet-item"><strong>${b.name}</strong><div>${b.home_score} x ${b.away_score}</div><span class="status ${(b.status === 'validated' || b.status === 'paid') ? 'validated':''}">${betStatusLabel(b.status)}</span></div>`).join('') : 'Nenhum palpite ainda.';
}
function renderAdminBets(bets){
  const box = $('adminBets');
  if(!box) return;
  box.innerHTML = bets.length ? bets.map(b => `
    <div class="bet-item admin-row">
      <div>
        <strong>${b.name}</strong>
        <div class="muted">WhatsApp: ${b.whatsapp}</div>
        <div>Palpite: ${b.home_score} x ${b.away_score}</div>
        <span class="status ${(b.status === 'validated' || b.status === 'paid') ? 'validated':''}">${betStatusLabel(b.status)}</span>
      </div>
      ${(b.status === 'validated' || b.status === 'paid') ? '<button class="btn secondary" disabled>Validado</button>' : `<button class="btn" onclick="validateBet(${b.id})">Validar pagamento</button>`}
    </div>`).join('') : 'Nenhum palpite ainda.';
}

async function submitBet(e){
  e.preventDefault();
  if(!currentGame || currentGame.status !== 'open') return alert('Não há jogo aberto para apostas.');
  const payload = {
    name: $('name').value.trim(),
    whatsapp: $('whatsapp').value.trim(),
    game_id: currentGame.id,
    home_score: Number($('homeScore').value),
    away_score: Number($('awayScore').value),
    status: 'pending'
  };
  const { error } = await supabaseClient.from('bets').insert(payload);
  if(error){ showError('Erro ao enviar palpite', error); return; }
  e.target.reset();
  alert('Palpite enviado. Envie o comprovante do Pix pelo WhatsApp.');
  await loadBets();
}

async function validateBet(id){
  const { error } = await supabaseClient.from('bets').update({ status:'validated' }).eq('id', id);
  if(error){ showError('Erro ao validar pagamento', error); return; }
  await loadBets();
}
window.validateBet = validateBet;

async function saveGame(){
  const payload = {
    home_team: $('adminHomeTeam').value.trim(),
    away_team: $('adminAwayTeam').value.trim(),
    game_date: $('adminDate').value,
    game_time: $('adminTime').value,
    status: $('adminStatus').value
  };
  if(!payload.home_team || !payload.away_team || !payload.game_date || !payload.game_time) return alert('Preencha todos os dados do jogo.');
  let result;
  if(currentGame?.id){
    result = await supabaseClient.from('games').update(payload).eq('id', currentGame.id);
  } else {
    result = await supabaseClient.from('games').insert(payload);
  }
  if(result.error){ showError('Erro ao salvar jogo', result.error); return; }
  alert('Jogo salvo.');
  await loadGame();
}

async function isAdmin(email){
  const normalized = String(email || '').trim().toLowerCase();
  const { data, error } = await supabaseClient.from('admins').select('email').ilike('email', normalized).maybeSingle();
  if(error){ showError('Erro ao verificar administrador', error); return false; }
  return !!data;
}
async function sendLogin(){
  const email = $('adminEmail').value.trim().toLowerCase();
  if(!email) return alert('Informe seu e-mail.');
  const ok = await isAdmin(email);
  if(!ok) return alert('Seu e-mail não está cadastrado como administrador.');
  const { error } = await supabaseClient.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin + window.location.pathname } });
  if(error){ showError('Erro ao enviar link', error); return; }
  alert('Link enviado. Abra o e-mail mais recente do Supabase.');
}
async function checkSession(){
  const { data } = await supabaseClient.auth.getSession();
  const email = data?.session?.user?.email;
  const admin = email ? await isAdmin(email) : false;
  $('loginBox').classList.toggle('hidden', admin);
  $('adminPanel').classList.toggle('hidden', !admin);
}
async function logout(){
  await supabaseClient.auth.signOut();
  await checkSession();
}
function setupWhatsApp(){
  $('pixText').textContent = cfg.PIX_TEXTO;
  const msg = encodeURIComponent('Olá. Segue comprovante do meu Pix para validar meu palpite no bolão.');
  $('whatsProof').href = `https://wa.me/${cfg.WHATSAPP_ORGANIZADOR}?text=${msg}`;
}
function bindEvents(){
  $('betForm').addEventListener('submit', submitBet);
  $('openAdmin').addEventListener('click', async () => { $('adminModal').classList.remove('hidden'); await checkSession(); });
  $('closeAdmin').addEventListener('click', () => $('adminModal').classList.add('hidden'));
  $('sendLogin').addEventListener('click', sendLogin);
  $('logoutBtn').addEventListener('click', logout);
  $('saveGame').addEventListener('click', saveGame);
}
async function init(){
  setupWhatsApp();
  bindEvents();
  await loadGame();
  await loadBets();
  await checkSession();
  supabaseClient.channel('bolao')
    .on('postgres_changes', { event:'*', schema:'public', table:'bets' }, loadBets)
    .on('postgres_changes', { event:'*', schema:'public', table:'games' }, async()=>{ await loadGame(); await loadBets(); })
    .subscribe();
}
init();
