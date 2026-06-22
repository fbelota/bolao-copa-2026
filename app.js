const cfg = window.BOLAO_CONFIG;
const supabaseClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
let currentGame = null;
let latestBets = [];
let countdownTimer = null;
const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const $ = id => document.getElementById(id);

function fmtDate(date){
  if(!date) return '';
  const [y,m,d] = String(date).split('-');
  return `${d}/${m}/${y}`;
}

function normalizeTeamName(name){
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const FLAG_CODE_MAP = {
  'brasil':'br','brazil':'br','escocia':'gb-sct','scotland':'gb-sct','argentina':'ar','mexico':'mx','canada':'ca',
  'estados unidos':'us','united states':'us','usa':'us','alemanha':'de','germany':'de','franca':'fr','france':'fr',
  'inglaterra':'gb-eng','england':'gb-eng','portugal':'pt','espanha':'es','spain':'es','uruguai':'uy','uruguay':'uy',
  'colombia':'co','japao':'jp','japan':'jp','holanda':'nl','netherlands':'nl','suecia':'se','sweden':'se',
  'marrocos':'ma','morocco':'ma','haiti':'ht','suica':'ch','switzerland':'ch','australia':'au','turquia':'tr',
  'turkey':'tr','paraguai':'py','paraguay':'py','belgica':'be','belgium':'be','egito':'eg','egypt':'eg','ira':'ir',
  'iran':'ir','nova zelandia':'nz','new zealand':'nz','noruega':'no','norway':'no','senegal':'sn','iraque':'iq',
  'iraq':'iq','austria':'at','argelia':'dz','algeria':'dz','catar':'qa','qatar':'qa','africa do sul':'za',
  'south africa':'za','coreia do sul':'kr','south korea':'kr','tchequia':'cz','czechia':'cz','croacia':'hr',
  'croatia':'hr','gana':'gh','ghana':'gh','panama':'pa','tunisia':'tn','jordan':'jo','jordania':'jo',
  'equador':'ec','ecuador':'ec','curacao':'cw','costa do marfim':'ci','ivory coast':'ci','cabo verde':'cv',
  'cape verde':'cv','arabia saudita':'sa','saudi arabia':'sa','uzbequistao':'uz','uzbekistan':'uz','congo dr':'cd',
  'dr congo':'cd','bosnia':'ba','bosnia and herzegovina':'ba'
};
function flagCode(name){ return FLAG_CODE_MAP[normalizeTeamName(name)] || ''; }
function escapeHtml(value){ return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function teamFlagHtml(name){
  const code = flagCode(name);
  const initials = String(name || 'Time').slice(0,2).toUpperCase();
  if(!code) return `<span class="flag-fallback">${initials}</span>`;
  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="Bandeira ${escapeHtml(name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag-fallback',textContent:'${initials}'}))">`;
}

function gameDateTime(game){
  if(!game?.game_date || !game?.game_time) return null;
  return new Date(`${game.game_date}T${String(game.game_time).slice(0,5)}:00`);
}
function gameClosingTime(game){
  const dt = gameDateTime(game);
  if(!dt || Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getTime() - (60 * 60 * 1000));
}
function isGameOpen(){
  if(!currentGame || currentGame.status !== 'open') return false;
  const closingTime = gameClosingTime(currentGame);
  if(!closingTime) return currentGame.status === 'open';
  return new Date() < closingTime;
}
function statusLabel(s){ return s === 'open' ? 'Apostas abertas' : s === 'closed' ? 'Apostas fechadas' : 'Finalizado'; }
function betStatusLabel(s){ return (s === 'validated' || s === 'paid') ? 'Validado' : 'Pendente'; }
function showError(prefix, err){ console.error(prefix, err); alert(`${prefix}: ${err?.message || err}`); }
function officialResultReady(){ return currentGame?.official_home_score !== null && currentGame?.official_home_score !== undefined && currentGame?.official_away_score !== null && currentGame?.official_away_score !== undefined; }
function scoreText(home, away){ return `${home} x ${away}`; }
function maskPhone(phone){
  const digits = String(phone || '').replace(/\D/g,'');
  if(digits.length < 7) return 'WhatsApp informado';
  return `${digits.slice(0,4)}*****${digits.slice(-2)}`;
}
function betPoints(b){
  if(!officialResultReady()) return null;
  const oh = Number(currentGame.official_home_score);
  const oa = Number(currentGame.official_away_score);
  const bh = Number(b.home_score);
  const ba = Number(b.away_score);
  if(bh === oh && ba === oa) return 5;
  const realSign = Math.sign(oh - oa);
  const betSign = Math.sign(bh - ba);
  if(realSign === betSign) return 3;
  return 0;
}

function updateScoreFields(){
  if(!currentGame) return;
  const home = currentGame.home_team || 'Time A';
  const away = currentGame.away_team || 'Time B';
  $('homeScoreLabel').textContent = home;
  $('awayScoreLabel').textContent = away;
  $('homeScore').placeholder = `Gols ${home}`;
  $('awayScore').placeholder = `Gols ${away}`;
  $('adminResultHomeLabel').textContent = home;
  $('adminResultAwayLabel').textContent = away;
}

async function loadGame(){
  const { data, error } = await supabaseClient.from('games').select('*').order('created_at', { ascending:false }).limit(1).maybeSingle();
  if(error){ showError('Erro ao carregar jogo', error); return; }
  currentGame = data;
  renderGame();
}
function renderGame(){
  const box = $('gameBox');
  if(!currentGame){
    box.innerHTML = '<p class="muted">Nenhum jogo cadastrado pelo organizador.</p>';
    $('betForm').classList.add('hidden');
    $('closedNotice').classList.add('hidden');
    return;
  }
  const home = currentGame.home_team || 'Time A';
  const away = currentGame.away_team || 'Time B';
  const official = officialResultReady() ? `<div class="official-line">Resultado oficial: ${scoreText(currentGame.official_home_score, currentGame.official_away_score)}</div>` : '';
  box.innerHTML = `
    <div class="match-card">
      <span class="flag" aria-hidden="true">${teamFlagHtml(home)}</span>
      <div class="match-info">
        <div class="game-title">${escapeHtml(home)} x ${escapeHtml(away)}</div>
        <div class="muted">${fmtDate(currentGame.game_date)} às ${String(currentGame.game_time).slice(0,5)}</div>
        <div class="match-status">${isGameOpen() ? 'Apostas abertas' : statusLabel(currentGame.status === 'open' ? 'closed' : currentGame.status)}</div>
        ${official}
      </div>
      <span class="flag right" aria-hidden="true">${teamFlagHtml(away)}</span>
    </div>`;
  const open = isGameOpen();
  $('betForm').classList.toggle('hidden', !open);
  $('closedNotice').classList.toggle('hidden', open);
  updateScoreFields();
  $('adminHomeTeam').value = currentGame.home_team || '';
  $('adminAwayTeam').value = currentGame.away_team || '';
  $('adminDate').value = currentGame.game_date || '';
  $('adminTime').value = String(currentGame.game_time || '').slice(0,5);
  $('adminStatus').value = currentGame.status || 'open';
  $('adminOfficialHome').value = currentGame.official_home_score ?? '';
  $('adminOfficialAway').value = currentGame.official_away_score ?? '';
  renderCountdown();
}
function renderCountdown(){
  const box = $('countdownBox');
  if(!currentGame){ box.classList.add('hidden'); return; }
  const dt = gameDateTime(currentGame);
  if(!dt || Number.isNaN(dt.getTime())){ box.classList.add('hidden'); return; }
  const closingTime = gameClosingTime(currentGame);
  if(!closingTime){ box.classList.add('hidden'); return; }
  const diff = closingTime - new Date();
  if(diff <= 0){
    box.classList.remove('hidden');
    box.textContent = 'Apostas encerradas. O bolão fecha 1 hora antes do jogo.';
    $('betForm').classList.add('hidden');
    $('closedNotice').classList.remove('hidden');
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  box.classList.remove('hidden');
  box.textContent = days > 0 ? `Fecha em ${days}d ${hours}h ${mins}min` : `Fecha em ${hours}h ${mins}min`;
}

async function loadBets(){
  const { data, error } = await supabaseClient.from('bets').select('*, games(home_team, away_team)').order('id', { ascending:false });
  if(error){ showError('Erro ao carregar palpites', error); return; }
  latestBets = data || [];
  renderStats(latestBets);
  renderPublicBets(latestBets);
  renderAdminBets(latestBets);
  renderRanking(latestBets);
}
function renderStats(bets){
  const valid = bets.filter(b => b.status === 'validated' || b.status === 'paid');
  const pending = bets.filter(b => b.status !== 'validated' && b.status !== 'paid');
  const total = valid.length * Number(cfg.VALOR_PALPITE || 0);
  const pct = Number(cfg.PREMIO_PERCENTUAL || 100) / 100;
  $('totalBets').textContent = bets.length;
  $('validBets').textContent = valid.length;
  $('pendingBets').textContent = pending.length;
  $('totalMoney').textContent = money.format(total);
  $('prizeMoney').textContent = money.format(total * pct);
  $('officialScore').textContent = officialResultReady() ? scoreText(currentGame.official_home_score, currentGame.official_away_score) : 'A definir';
  $('ruleValue').textContent = `${money.format(Number(cfg.VALOR_PALPITE || 0))} por palpite`;
  const counts = {};
  bets.forEach(b => { const key = `${b.home_score} x ${b.away_score}`; counts[key] = (counts[key] || 0) + 1; });
  const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  $('scoreStats').innerHTML = entries.length ? entries.map(([score,count]) => `<div class="score-item"><strong>${score}</strong><span class="muted">${count} palpite(s)</span></div>`).join('') : 'Nenhum palpite enviado.';
}
function renderPublicBets(bets){
  $('publicBets').innerHTML = bets.length ? bets.map(b => `<div class="bet-item"><strong>${escapeHtml(b.name)}</strong><div>${b.home_score} x ${b.away_score}</div><span class="muted">${maskPhone(b.whatsapp)}</span><br><span class="status ${(b.status === 'validated' || b.status === 'paid') ? 'validated':''}">${betStatusLabel(b.status)}</span></div>`).join('') : 'Nenhum palpite ainda.';
}
function renderRanking(bets){
  if(!officialResultReady()){
    $('rankingBox').innerHTML = 'O ranking aparece após o resultado oficial.';
    return;
  }
  const valid = bets.filter(b => b.status === 'validated' || b.status === 'paid');
  if(!valid.length){ $('rankingBox').innerHTML = 'Nenhum palpite validado ainda.'; return; }
  const ranked = valid.map(b => ({...b, points: betPoints(b)})).sort((a,b) => b.points - a.points || a.id - b.id);
  $('rankingBox').innerHTML = ranked.map((b,i) => `<div class="ranking-item"><strong>${i+1}º ${escapeHtml(b.name)}</strong><span>${b.home_score} x ${b.away_score}</span><b>${b.points} pts</b></div>`).join('');
}
function renderAdminBets(bets){
  const box = $('adminBets');
  if(!box) return;
  const term = String($('adminBetSearch')?.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const filtered = term ? bets.filter(b => {
    const hay = `${b.name || ''} ${b.whatsapp || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return hay.includes(term);
  }) : bets;
  box.innerHTML = filtered.length ? filtered.map(b => {
    const paid = b.status === 'validated' || b.status === 'paid';
    return `
    <div class="bet-item admin-row">
      <div>
        <strong>${escapeHtml(b.name)}</strong>
        <div class="muted">WhatsApp: ${escapeHtml(b.whatsapp)}</div>
        <div>Palpite: ${b.home_score} x ${b.away_score}</div>
        <span class="status ${paid ? 'validated':''}">${betStatusLabel(b.status)}</span>
      </div>
      <div class="admin-actions">
        ${paid ? '<button class="btn secondary" disabled>Validado</button>' : `<button class="btn" onclick="validateBet(${b.id})">Validar pagamento</button><button class="btn secondary" onclick="editBet(${b.id})">Editar</button><button class="btn danger" onclick="deleteBet(${b.id})">Excluir</button>`}
      </div>
    </div>`;
  }).join('') : 'Nenhum palpite encontrado.';
}


async function submitBet(e){
  e.preventDefault();
  if(!isGameOpen()) return alert('Apostas encerradas para este jogo.');
  const payload = { name: $('name').value.trim(), whatsapp: $('whatsapp').value.trim(), game_id: currentGame.id, home_score: Number($('homeScore').value), away_score: Number($('awayScore').value), status: 'pending' };
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

async function deleteBet(id){
  const bet = latestBets.find(b => Number(b.id) === Number(id));
  if(!bet) return alert('Aposta não encontrada.');
  if(bet.status === 'validated' || bet.status === 'paid'){
    return alert('Apostas já validadas não podem ser excluídas pelo painel.');
  }
  const ok = confirm(`Excluir a aposta de ${bet.name}?\n\nPalpite: ${bet.home_score} x ${bet.away_score}\n\nEssa ação não pode ser desfeita.`);
  if(!ok) return;
  const { error } = await supabaseClient
    .from('bets')
    .delete()
    .eq('id', id)
    .eq('status', 'pending');
  if(error){ showError('Erro ao excluir aposta', error); return; }
  await loadBets();
  alert('Aposta pendente excluída.');
}
window.deleteBet = deleteBet;

async function editBet(id){
  const bet = latestBets.find(b => Number(b.id) === Number(id));
  if(!bet) return alert('Aposta não encontrada.');
  if(bet.status === 'validated' || bet.status === 'paid'){
    return alert('Apostas já validadas não podem ser editadas pelo painel.');
  }
  const newHome = prompt(`Novo placar para ${currentGame?.home_team || 'Time A'}:`, bet.home_score);
  if(newHome === null) return;
  const newAway = prompt(`Novo placar para ${currentGame?.away_team || 'Time B'}:`, bet.away_score);
  if(newAway === null) return;
  if(newHome === '' || newAway === '' || Number(newHome) < 0 || Number(newAway) < 0 || Number.isNaN(Number(newHome)) || Number.isNaN(Number(newAway))){
    return alert('Informe placares válidos.');
  }
  const { error } = await supabaseClient
    .from('bets')
    .update({ home_score: Number(newHome), away_score: Number(newAway) })
    .eq('id', id)
    .eq('status', 'pending');
  if(error){ showError('Erro ao editar aposta', error); return; }
  await loadBets();
  alert('Aposta pendente editada.');
}
window.editBet = editBet;

function exportBets(){
  if(!latestBets.length) return alert('Nenhuma aposta para exportar.');
  const rows = latestBets.map(b => ({
    ID: b.id,
    Nome: b.name,
    WhatsApp: b.whatsapp,
    Jogo: currentGame ? `${currentGame.home_team} x ${currentGame.away_team}` : '',
    Palpite: `${b.home_score} x ${b.away_score}`,
    Status: betStatusLabel(b.status),
    Pontos: betPoints(b) ?? '',
  }));
  if(window.XLSX){
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Apostas');
    XLSX.writeFile(wb, `apostas-bolao-${new Date().toISOString().slice(0,10)}.xlsx`);
    return;
  }
  const headers = Object.keys(rows[0] || {});
  const csv = [headers, ...rows.map(r => headers.map(h => r[h]))]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';'))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `apostas-bolao-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
window.exportBets = exportBets;

async function saveGame(){
  const payload = { home_team: $('adminHomeTeam').value.trim(), away_team: $('adminAwayTeam').value.trim(), game_date: $('adminDate').value, game_time: $('adminTime').value, status: $('adminStatus').value };
  if(!payload.home_team || !payload.away_team || !payload.game_date || !payload.game_time) return alert('Preencha todos os dados do jogo.');
  let result = currentGame?.id ? await supabaseClient.from('games').update(payload).eq('id', currentGame.id) : await supabaseClient.from('games').insert(payload);
  if(result.error){ showError('Erro ao salvar jogo', result.error); return; }
  alert('Jogo salvo.');
  await loadGame();
}
async function saveResult(){
  if(!currentGame?.id) return alert('Cadastre um jogo antes.');
  const home = $('adminOfficialHome').value;
  const away = $('adminOfficialAway').value;
  if(home === '' || away === '') return alert('Informe o resultado oficial completo.');
  const { error } = await supabaseClient.from('games').update({ official_home_score: Number(home), official_away_score: Number(away), status: 'finished' }).eq('id', currentGame.id);
  if(error){ showError('Erro ao salvar resultado', error); return; }
  alert('Resultado salvo.');
  await loadGame();
  await loadBets();
}

async function closeGameNow(){
  if(!currentGame?.id) return alert('Cadastre um jogo antes.');
  const ok = confirm('Deseja encerrar as apostas agora?\n\nDepois disso, novos palpites serão bloqueados até você reabrir o jogo no status Aberto.');
  if(!ok) return;
  const { error } = await supabaseClient.from('games').update({ status:'closed' }).eq('id', currentGame.id);
  if(error){ showError('Erro ao encerrar apostas', error); return; }
  alert('Apostas encerradas para este jogo.');
  await loadGame();
  await loadBets();
}
window.closeGameNow = closeGameNow;

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
async function logout(){ await supabaseClient.auth.signOut(); await checkSession(); }
function setupWhatsApp(){
  $('pixText').textContent = cfg.PIX_TEXTO;
  const msg = encodeURIComponent('Olá. Segue comprovante do meu Pix para validar meu palpite no bolão.');
  $('whatsProof').href = `https://wa.me/${cfg.WHATSAPP_ORGANIZADOR}?text=${msg}`;
}
function shareBolao(){
  const gameText = currentGame ? `${currentGame.home_team} x ${currentGame.away_team}` : 'Copa do Mundo 2026';
  const url = window.location.origin + window.location.pathname;
  const text = `Participe do bolão: ${gameText}. Faça seu palpite aqui: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
function bindEvents(){
  $('betForm').addEventListener('submit', submitBet);
  $('shareBolao').addEventListener('click', shareBolao);
  $('openAdmin').addEventListener('click', async () => { $('adminModal').classList.remove('hidden'); await checkSession(); });
  $('closeAdmin').addEventListener('click', () => $('adminModal').classList.add('hidden'));
  $('sendLogin').addEventListener('click', sendLogin);
  $('logoutBtn').addEventListener('click', logout);
  $('saveGame').addEventListener('click', saveGame);
  $('closeGameNow')?.addEventListener('click', closeGameNow);
  $('saveResult').addEventListener('click', saveResult);
  $('adminBetSearch')?.addEventListener('input', () => renderAdminBets(latestBets));
  $('exportBets')?.addEventListener('click', exportBets);
}
async function init(){
  setupWhatsApp();
  bindEvents();
  await loadGame();
  await loadBets();
  await checkSession();
  countdownTimer = setInterval(() => { renderCountdown(); renderGame(); }, 60000);
  supabaseClient.channel('bolao')
    .on('postgres_changes', { event:'*', schema:'public', table:'bets' }, loadBets)
    .on('postgres_changes', { event:'*', schema:'public', table:'games' }, async()=>{ await loadGame(); await loadBets(); })
    .subscribe();
}
init();
