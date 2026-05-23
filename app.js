const waves = [
  { name: "1ª onda", start: "08:30", end: "09:15", planned: 24, arrived: 0, loaded: 0 },
  { name: "2ª onda", start: "09:15", end: "10:00", planned: 24, arrived: 0, loaded: 0 },
  { name: "3ª onda", start: "10:00", end: "10:45", planned: 24, arrived: 0, loaded: 0 },
  { name: "4ª onda", start: "10:45", end: "11:30", planned: 24, arrived: 0, loaded: 0 },
  { name: "5ª onda", start: "11:30", end: "12:15", planned: 24, arrived: 0, loaded: 0 },
];

const totalRoutesInput = document.querySelector("#totalRoutes");
const targetPercentInput = document.querySelector("#targetPercent");
const managerNameInput = document.querySelector("#managerName");
const managerPhoneInput = document.querySelector("#managerPhone");
const wavesBody = document.querySelector("#wavesBody");
const managerMessage = document.querySelector("#managerMessage");
const copyFeedback = document.querySelector("#copyFeedback");
const whatsappLink = document.querySelector("#whatsappLink");
const syncStatus = document.querySelector("#syncStatus");
const supabaseSettings = window.EXPEDITION_SUPABASE || {};
const hasSupabaseConfig =
  Boolean(supabaseSettings.url) &&
  Boolean(supabaseSettings.anonKey) &&
  !supabaseSettings.url.includes("COLE_AQUI") &&
  !supabaseSettings.anonKey.includes("COLE_AQUI") &&
  window.supabase;
const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
  : null;
const statusId = supabaseSettings.statusId || "default";
let isApplyingRemoteState = false;
let saveTimer = null;

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatPercent(value) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatRemainingTime(minutes) {
  if (minutes <= 0) {
    return "Encerrada";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}min`;
}

function clampNumber(value) {
  return Math.max(0, Number(value) || 0);
}

function getCleanPhone() {
  return managerPhoneInput.value.replace(/\D/g, "");
}

function getWhatsAppUrl() {
  const phone = getCleanPhone();
  const message = encodeURIComponent(managerMessage.value);

  if (!phone) {
    return "";
  }

  return `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;
}

function getNowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCurrentWave() {
  const nowMinutes = getNowInMinutes();
  return waves.find((wave) => nowMinutes >= toMinutes(wave.start) && nowMinutes < toMinutes(wave.end));
}

function updateSyncStatus(message) {
  syncStatus.textContent = message;
}

function getAppState() {
  return {
    totalRoutes: totalRoutesInput.value,
    targetPercent: targetPercentInput.value,
    managerName: managerNameInput.value,
    waves,
    updatedAt: new Date().toISOString(),
  };
}

function applyAppState(state) {
  if (!state || !Array.isArray(state.waves)) {
    return;
  }

  isApplyingRemoteState = true;
  totalRoutesInput.value = state.totalRoutes ?? totalRoutesInput.value;
  targetPercentInput.value = state.targetPercent ?? targetPercentInput.value;
  managerNameInput.value = state.managerName ?? managerNameInput.value;

  state.waves.forEach((wave, index) => {
    if (!waves[index]) {
      return;
    }

    waves[index].planned = clampNumber(wave.planned);
    waves[index].arrived = clampNumber(wave.arrived);
    waves[index].loaded = clampNumber(wave.loaded);
  });

  refresh();
  isApplyingRemoteState = false;
}

function scheduleSaveState() {
  if (!supabaseClient || isApplyingRemoteState) {
    return;
  }

  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 500);
}

async function saveState() {
  if (!supabaseClient) {
    return;
  }

  updateSyncStatus("Salvando no Supabase...");

  const { error } = await supabaseClient
    .from("expedition_status")
    .upsert({
      id: statusId,
      payload: getAppState(),
      updated_at: new Date().toISOString(),
    });

  updateSyncStatus(error ? "Erro ao sincronizar" : "Sincronizado no Supabase");
}

async function loadState() {
  if (!supabaseClient) {
    updateSyncStatus("Sincronização local");
    return;
  }

  updateSyncStatus("Carregando Supabase...");

  const { data, error } = await supabaseClient
    .from("expedition_status")
    .select("payload")
    .eq("id", statusId)
    .maybeSingle();

  if (error) {
    updateSyncStatus("Erro ao carregar Supabase");
    return;
  }

  if (data?.payload) {
    applyAppState(data.payload);
  } else {
    await saveState();
  }

  updateSyncStatus("Sincronizado no Supabase");
}

function subscribeToRemoteChanges() {
  if (!supabaseClient) {
    return;
  }

  supabaseClient
    .channel("expedition-status-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "expedition_status",
        filter: `id=eq.${statusId}`,
      },
      (payload) => {
        if (payload.new?.payload) {
          applyAppState(payload.new.payload);
          updateSyncStatus("Atualizado em tempo real");
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        updateSyncStatus("Tempo real conectado");
      }
    });
}

function isWaveClosed(wave, nowMinutes) {
  return nowMinutes >= toMinutes(wave.end);
}

function isWaveOpen(wave, nowMinutes) {
  return nowMinutes < toMinutes(wave.end);
}

function getClosedLosses(nowMinutes) {
  return waves.reduce((sum, wave) => {
    if (!isWaveClosed(wave, nowMinutes)) {
      return sum;
    }

    return sum + Math.max(0, wave.planned - wave.loaded);
  }, 0);
}

function getWaveStatus(wave, allowedLoss) {
  const pending = Math.max(0, wave.planned - wave.loaded);
  if (pending <= allowedLoss) {
    return { label: "Ok", className: "ok" };
  }
  if (wave.loaded + allowedLoss >= Math.ceil(wave.planned * 0.75)) {
    return { label: "Atenção", className: "warning" };
  }
  return { label: "Crítico", className: "danger" };
}

function calculateWaveAllowedLosses(totalAllowedLoss, nowMinutes) {
  const closedLosses = getClosedLosses(nowMinutes);
  const remainingAllowedLoss = Math.max(0, totalAllowedLoss - closedLosses);
  const openWaves = waves
    .map((wave, index) => ({ ...wave, index }))
    .filter((wave) => isWaveOpen(wave, nowMinutes));
  const openPlannedTotal = openWaves.reduce((sum, wave) => sum + wave.planned, 0);

  if (openPlannedTotal === 0) {
    return waves.map(() => 0);
  }

  const distribution = waves.map((wave, index) => ({
    index,
    value: 0,
    remainder: 0,
  }));

  openWaves.forEach((wave) => {
    const exactShare = (wave.planned / openPlannedTotal) * remainingAllowedLoss;
    distribution[wave.index] = {
      index: wave.index,
      value: Math.floor(exactShare),
      remainder: exactShare % 1,
    };
  });

  let remainderToDistribute = remainingAllowedLoss - distribution.reduce((sum, item) => sum + item.value, 0);

  distribution
    .filter((item) => openWaves.some((wave) => wave.index === item.index))
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((item) => {
      if (remainderToDistribute > 0) {
        distribution[item.index].value += 1;
        remainderToDistribute -= 1;
      }
    });

  return distribution.map((item) => item.value);
}

function updateClock() {
  const now = new Date();
  const currentTime = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentWave = getCurrentWave();

  document.querySelector("#currentTime").textContent = currentTime;
  document.querySelector("#currentWaveLabel").textContent = currentWave
    ? `${currentWave.name} fecha às ${currentWave.end}`
    : "Fora das ondas configuradas";
}

function renderWaves() {
  const totalRoutes = clampNumber(totalRoutesInput.value);
  const targetPercent = clampNumber(targetPercentInput.value);
  const targetRoutes = Math.ceil(totalRoutes * (targetPercent / 100));
  const totalAllowedLoss = Math.max(0, totalRoutes - targetRoutes);
  const nowMinutes = getNowInMinutes();
  const allowedLosses = calculateWaveAllowedLosses(totalAllowedLoss, nowMinutes);

  wavesBody.innerHTML = waves
    .map((wave, index) => {
      const pending = Math.max(0, wave.planned - wave.loaded);
      const missingArrivals = Math.max(0, wave.planned - wave.arrived);
      const arrivedPercent = wave.planned === 0 ? 0 : (wave.arrived / wave.planned) * 100;
      const missingArrivalPercent = wave.planned === 0 ? 0 : (missingArrivals / wave.planned) * 100;
      const isCurrentWave = nowMinutes >= toMinutes(wave.start) && nowMinutes < toMinutes(wave.end);
      const didNotStart = nowMinutes < toMinutes(wave.start);
      const remainingTime = isCurrentWave
        ? formatRemainingTime(toMinutes(wave.end) - nowMinutes)
        : didNotStart
          ? "Ainda não iniciou"
          : "Encerrada";
      const allowedLoss = allowedLosses[index];
      const status = isWaveClosed(wave, nowMinutes)
        ? pending > 0
          ? { label: `Perdeu ${pending}`, className: "danger" }
          : { label: "Fechada", className: "ok" }
        : getWaveStatus(wave, allowedLoss);

      return `
        <tr class="${isCurrentWave ? "current-wave" : ""}">
          <td><strong>${wave.name}</strong></td>
          <td>${wave.start} - ${wave.end}</td>
          <td><input type="number" min="0" value="${wave.planned}" data-index="${index}" data-field="planned" aria-label="Rotas planejadas da ${wave.name}"></td>
          <td><input type="number" min="0" value="${wave.arrived}" data-index="${index}" data-field="arrived" aria-label="Carros que subiram na ${wave.name}"></td>
          <td>${formatPercent(arrivedPercent)}</td>
          <td>${missingArrivals}</td>
          <td>${formatPercent(missingArrivalPercent)}</td>
          <td><input type="number" min="0" value="${wave.loaded}" data-index="${index}" data-field="loaded" aria-label="Carros carregados na ${wave.name}"></td>
          <td>${pending}</td>
          <td>${allowedLoss}</td>
          <td>${remainingTime}</td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");
}

function updateSummary() {
  const totalRoutes = clampNumber(totalRoutesInput.value);
  const targetPercent = clampNumber(targetPercentInput.value);
  const nowMinutes = getNowInMinutes();
  const targetRoutes = Math.ceil(totalRoutes * (targetPercent / 100));
  const loadedRoutes = waves.reduce((sum, wave) => sum + wave.loaded, 0);
  const arrivedRoutes = waves.reduce((sum, wave) => sum + wave.arrived, 0);
  const shippedPercent = totalRoutes === 0 ? 0 : (loadedRoutes / totalRoutes) * 100;
  const routesToTarget = Math.max(0, targetRoutes - loadedRoutes);
  const dailyLossAllowance = Math.max(0, totalRoutes - targetRoutes);
  const closedLosses = getClosedLosses(nowMinutes);
  const remainingGeneralAllowance = Math.max(0, dailyLossAllowance - closedLosses);
  const pendingTotal = Math.max(0, totalRoutes - loadedRoutes);

  document.querySelector("#shippedPercent").textContent = formatPercent(shippedPercent);
  document.querySelector("#shippedRoutes").textContent = `${loadedRoutes} rotas carregadas`;
  document.querySelector("#routesToTarget").textContent = routesToTarget;
  document.querySelector("#targetRoutes").textContent = `Meta: ${targetRoutes} rotas`;
  document.querySelector("#dailyLossAllowance").textContent = remainingGeneralAllowance;
  document.querySelector("#totalLossAllowance").textContent = `Perdas fechadas: ${closedLosses} de ${dailyLossAllowance}`;

  const statusCard = document.querySelector("#statusCard");
  const generalStatus = document.querySelector("#generalStatus");
  const generalStatusDetail = document.querySelector("#generalStatusDetail");
  statusCard.className = "metric-card status-card";

  if (loadedRoutes >= targetRoutes) {
    statusCard.classList.add("ok");
    generalStatus.textContent = "Meta batida";
    generalStatusDetail.textContent = `Você já atingiu ${targetPercent}% ou mais.`;
  } else if (closedLosses > dailyLossAllowance) {
    statusCard.classList.add("danger");
    generalStatus.textContent = "Meta em risco";
    generalStatusDetail.textContent = `As ondas fechadas já passaram da tolerância em ${closedLosses - dailyLossAllowance} rotas.`;
  } else if (pendingTotal <= routesToTarget) {
    statusCard.classList.add("danger");
    generalStatus.textContent = "Sem folga";
    generalStatusDetail.textContent = "Precisa carregar tudo que falta para buscar a meta.";
  } else {
    statusCard.classList.add("warning");
    generalStatus.textContent = "Acompanhar";
    generalStatusDetail.textContent = `Depois das ondas fechadas, ainda pode perder ${remainingGeneralAllowance} rotas.`;
  }

  const currentWave = getCurrentWave();
  const allowedLosses = calculateWaveAllowedLosses(dailyLossAllowance, nowMinutes);
  const currentWaveIndex = waves.indexOf(currentWave);
  const waveText = currentWave
    ? buildCurrentWaveMessage(currentWave, nowMinutes, allowedLosses[currentWaveIndex])
    : "Onda atual: fora do horário das ondas configuradas.";

  managerMessage.value = `${managerNameInput.value}
Status expedição ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}: temos ${totalRoutes} rotas planejadas no dia, ${loadedRoutes} carregadas, ${arrivedRoutes} carros que subiram e ${pendingTotal} rotas pendentes.
Indicador geral: estamos com ${formatPercent(shippedPercent)} expedido. A meta mínima é ${targetPercent}%, ou seja, precisamos carregar pelo menos ${targetRoutes} rotas.
Para bater a meta, ainda faltam ${routesToTarget} rotas. A tolerância total do dia é de ${dailyLossAllowance} rotas que podem ficar sem carregar.
As ondas já fechadas consumiram ${closedLosses} dessa tolerância. Por isso, a folga restante para a onda atual e as próximas é de ${remainingGeneralAllowance} rotas.
${waveText}`;
}

function buildCurrentWaveMessage(wave, nowMinutes, allowedLoss) {
  const missingArrivals = Math.max(0, wave.planned - wave.arrived);
  const pendingLoads = Math.max(0, wave.planned - wave.loaded);
  const arrivedPercent = wave.planned === 0 ? 0 : (wave.arrived / wave.planned) * 100;
  const missingArrivalPercent = wave.planned === 0 ? 0 : (missingArrivals / wave.planned) * 100;
  const remainingTime = formatRemainingTime(toMinutes(wave.end) - nowMinutes);

  return `Onda atual: ${wave.name} (${wave.start} até ${wave.end}). Tempo restante: ${remainingTime}.
Status da onda: ${wave.planned} planejadas, ${wave.arrived} subiram (${formatPercent(arrivedPercent)}), faltam subir ${missingArrivals} (${formatPercent(missingArrivalPercent)}), ${wave.loaded} carregadas e ${pendingLoads} pendentes para carregar.
Pela folga restante do indicador geral, esta onda pode encerrar com até ${allowedLoss} rotas sem carregar. Se passar disso, a folga das próximas ondas diminui.`;
}

function refresh() {
  updateClock();
  renderWaves();
  updateSummary();
  updateWhatsAppLink();
}

function updateWhatsAppLink() {
  const whatsappUrl = getWhatsAppUrl();

  if (!whatsappUrl) {
    whatsappLink.classList.remove("visible");
    whatsappLink.removeAttribute("href");
    return;
  }

  whatsappLink.href = whatsappUrl;
  whatsappLink.classList.add("visible");
}

wavesBody.addEventListener("input", (event) => {
  const input = event.target;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;

  if (!Number.isInteger(index) || !field) {
    return;
  }

  waves[index][field] = clampNumber(input.value);
  if (field === "loaded" && waves[index].arrived < waves[index].loaded) {
    waves[index].arrived = waves[index].loaded;
  }

  refresh();
  scheduleSaveState();
});

[totalRoutesInput, targetPercentInput, managerNameInput, managerPhoneInput].forEach((input) => {
  input.addEventListener("input", () => {
    refresh();

    if (input !== managerPhoneInput) {
      scheduleSaveState();
    }
  });
});

document.querySelector("#balanceButton").addEventListener("click", () => {
  const totalRoutes = clampNumber(totalRoutesInput.value);
  const base = Math.floor(totalRoutes / waves.length);
  const remainder = totalRoutes % waves.length;

  waves.forEach((wave, index) => {
    wave.planned = base + (index < remainder ? 1 : 0);
  });

  refresh();
  scheduleSaveState();
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  copyFeedback.textContent = "";

  try {
    await navigator.clipboard.writeText(managerMessage.value);
    copyFeedback.textContent = "Mensagem copiada.";
  } catch {
    managerMessage.select();
    document.execCommand("copy");
    copyFeedback.textContent = "Mensagem selecionada para copiar.";
  }
});

document.querySelector("#whatsappButton").addEventListener("click", () => {
  const phone = getCleanPhone();
  const whatsappUrl = getWhatsAppUrl();

  if (!phone) {
    copyFeedback.textContent = "Informe o numero com DDI e DDD. Exemplo: 5511999999999.";
    managerPhoneInput.focus();
    return;
  }

  if (phone.length < 12) {
    copyFeedback.textContent = "Confira o numero. Para Brasil, use 55 + DDD + numero.";
    managerPhoneInput.focus();
    return;
  }

  copyFeedback.textContent = "Abrindo WhatsApp Web com a mensagem pronta.";
  window.open(whatsappUrl, "_blank", "noopener");
});

refresh();
loadState();
subscribeToRemoteChanges();
setInterval(refresh, 30000);
