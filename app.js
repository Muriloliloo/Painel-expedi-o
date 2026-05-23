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

function getNowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCurrentWave() {
  const nowMinutes = getNowInMinutes();
  return waves.find((wave) => nowMinutes >= toMinutes(wave.start) && nowMinutes < toMinutes(wave.end));
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

function calculateWaveAllowedLosses(totalAllowedLoss, totalPlanned) {
  if (totalPlanned === 0) {
    return waves.map(() => 0);
  }

  const distribution = waves.map((wave, index) => {
    const exactShare = (wave.planned / totalPlanned) * totalAllowedLoss;
    return {
      index,
      value: Math.floor(exactShare),
      remainder: exactShare % 1,
    };
  });
  let remainderToDistribute = totalAllowedLoss - distribution.reduce((sum, item) => sum + item.value, 0);

  distribution
    .slice()
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
  const totalPlannedInWaves = waves.reduce((sum, wave) => sum + wave.planned, 0);
  const allowedLosses = calculateWaveAllowedLosses(totalAllowedLoss, totalPlannedInWaves);
  const nowMinutes = getNowInMinutes();

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
      const status = getWaveStatus(wave, allowedLoss);

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
  const targetRoutes = Math.ceil(totalRoutes * (targetPercent / 100));
  const loadedRoutes = waves.reduce((sum, wave) => sum + wave.loaded, 0);
  const arrivedRoutes = waves.reduce((sum, wave) => sum + wave.arrived, 0);
  const shippedPercent = totalRoutes === 0 ? 0 : (loadedRoutes / totalRoutes) * 100;
  const routesToTarget = Math.max(0, targetRoutes - loadedRoutes);
  const dailyLossAllowance = Math.max(0, totalRoutes - targetRoutes);
  const pendingTotal = Math.max(0, totalRoutes - loadedRoutes);
  const remainingLossAllowance = Math.max(0, pendingTotal - routesToTarget);

  document.querySelector("#shippedPercent").textContent = formatPercent(shippedPercent);
  document.querySelector("#shippedRoutes").textContent = `${loadedRoutes} rotas carregadas`;
  document.querySelector("#routesToTarget").textContent = routesToTarget;
  document.querySelector("#targetRoutes").textContent = `Meta: ${targetRoutes} rotas`;
  document.querySelector("#dailyLossAllowance").textContent = remainingLossAllowance;
  document.querySelector("#totalLossAllowance").textContent = `Tolerância total do dia: ${dailyLossAllowance}`;

  const statusCard = document.querySelector("#statusCard");
  const generalStatus = document.querySelector("#generalStatus");
  const generalStatusDetail = document.querySelector("#generalStatusDetail");
  statusCard.className = "metric-card status-card";

  if (loadedRoutes >= targetRoutes) {
    statusCard.classList.add("ok");
    generalStatus.textContent = "Meta batida";
    generalStatusDetail.textContent = `Você já atingiu ${targetPercent}% ou mais.`;
  } else if (pendingTotal <= routesToTarget) {
    statusCard.classList.add("danger");
    generalStatus.textContent = "Sem folga";
    generalStatusDetail.textContent = "Precisa carregar tudo que falta para buscar a meta.";
  } else {
    statusCard.classList.add("warning");
    generalStatus.textContent = "Acompanhar";
    generalStatusDetail.textContent = `Ainda pode perder ${Math.max(0, pendingTotal - routesToTarget)} rotas e bater a meta.`;
  }

  const currentWave = getCurrentWave();
  const nowMinutes = getNowInMinutes();
  const waveText = currentWave
    ? buildCurrentWaveMessage(currentWave, nowMinutes)
    : "Onda atual: fora do horário das ondas configuradas.";

  managerMessage.value = `${managerNameInput.value}
Status expedição ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}: temos ${totalRoutes} rotas planejadas no dia, ${loadedRoutes} carregadas, ${arrivedRoutes} carros que subiram e ${pendingTotal} rotas pendentes.
Percentual expedido: ${formatPercent(shippedPercent)}. Meta mínima: ${targetPercent}% (${targetRoutes} rotas).
Faltam ${routesToTarget} rotas para atingir a meta. Pela meta do dia, a tolerância total é de ${dailyLossAllowance} rotas e ainda podemos perder ${remainingLossAllowance}.
${waveText}`;
}

function buildCurrentWaveMessage(wave, nowMinutes) {
  const missingArrivals = Math.max(0, wave.planned - wave.arrived);
  const pendingLoads = Math.max(0, wave.planned - wave.loaded);
  const arrivedPercent = wave.planned === 0 ? 0 : (wave.arrived / wave.planned) * 100;
  const missingArrivalPercent = wave.planned === 0 ? 0 : (missingArrivals / wave.planned) * 100;
  const remainingTime = formatRemainingTime(toMinutes(wave.end) - nowMinutes);

  return `Onda atual: ${wave.name} (${wave.start} até ${wave.end}). Tempo restante: ${remainingTime}.
Status da onda: ${wave.planned} planejadas, ${wave.arrived} subiram (${formatPercent(arrivedPercent)}), faltam subir ${missingArrivals} (${formatPercent(missingArrivalPercent)}), ${wave.loaded} carregadas e ${pendingLoads} pendentes para carregar.`;
}

function refresh() {
  updateClock();
  renderWaves();
  updateSummary();
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
});

[totalRoutesInput, targetPercentInput, managerNameInput, managerPhoneInput].forEach((input) => {
  input.addEventListener("input", refresh);
});

document.querySelector("#balanceButton").addEventListener("click", () => {
  const totalRoutes = clampNumber(totalRoutesInput.value);
  const base = Math.floor(totalRoutes / waves.length);
  const remainder = totalRoutes % waves.length;

  waves.forEach((wave, index) => {
    wave.planned = base + (index < remainder ? 1 : 0);
  });

  refresh();
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
  const phone = managerPhoneInput.value.replace(/\D/g, "");
  const message = encodeURIComponent(managerMessage.value);
  const baseUrl = phone ? `https://wa.me/${phone}` : "https://wa.me/";

  copyFeedback.textContent = phone
    ? "Abrindo WhatsApp com a mensagem pronta."
    : "Informe o telefone com DDI e DDD para enviar direto ao contato.";

  window.open(`${baseUrl}?text=${message}`, "_blank", "noopener");
});

refresh();
setInterval(refresh, 30000);
