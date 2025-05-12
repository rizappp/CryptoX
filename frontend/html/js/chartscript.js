console.log("Chart script loaded");

// Проверка на наличие библиотеки
if (!window.LightweightCharts) {
  console.error("Lightweight Charts is not loaded!");
} else {
  console.log("Lightweight Charts loaded successfully");
}

const chartContainer = document.getElementById("chartContainer");
const indicatorsContainer = document.getElementById("indicatorsContainer");
const pairSelect = document.getElementById("pairSelect");
const timeframeButtons = document.querySelectorAll(".timeframe-btn");
const indicatorSelect = document.getElementById("indicatorSelect");
const addIndicatorBtn = document.getElementById("addIndicatorBtn");
const recommendationText = document.getElementById("recommendationText");

const userId = localStorage.getItem("userId");

if (!userId) {
  console.error("Error: User is not authorized. Missing userId.");
}

let chart;
let candleSeries;
let smaSeries = null;
let emaSeries = null;
let psarSeries = null;
let currentTimeframe = "1h";
let candleData = [];
let smaData = [];
let emaData = [];

// Получение сохранённых пар
fetch("/api/saved-pairs", {
  headers: {
    "x-user-id": userId,
  },
})
  .then(res => res.json())
  .then(pairs => {
    console.log("Saved pairs:", pairs);
    pairSelect.innerHTML = "";

    pairs.forEach(pairObj => {
      const option = document.createElement("option");
      option.value = pairObj.pair;
      option.textContent = pairObj.pair;
      pairSelect.appendChild(option);
    });

    if (pairs.length > 0) {
      pairSelect.value = pairs[0].pair;
      loadChart();
    }
  })
  .catch(err => {
    console.error("Error fetching saved pairs:", err);
  });

// Отслеживаем изменения таймфрейма
timeframeButtons.forEach(button => {
  button.addEventListener("click", () => {
    timeframeButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    currentTimeframe = button.dataset.timeframe;
    loadChart();
  });
});

// Отслеживаем изменение выбранной пары
pairSelect.addEventListener("change", loadChart);

// Обновляем текст кнопки индикатора
function updateButtonText() {
  const indicator = indicatorSelect.value;
  if (!indicator) {
    addIndicatorBtn.textContent = "Добавить";
    addIndicatorBtn.disabled = true;
    return;
  }
  addIndicatorBtn.disabled = false;

  switch (indicator) {
    case "ma":
      addIndicatorBtn.textContent = smaSeries ? "Удалить" : "Добавить";
      break;
    case "ema":
      addIndicatorBtn.textContent = emaSeries ? "Удалить" : "Добавить";
      break;
    case "psar":
      addIndicatorBtn.textContent = psarSeries ? "Удалить" : "Добавить";
      break;
    default:
      addIndicatorBtn.textContent = "Добавить";
  }
}

// Вычисление рекомендации
function calculateRecommendation() {
  if (!smaSeries || !emaSeries || !smaData.length || !emaData.length) {
    recommendationText.textContent = "Нейтрально";
    recommendationText.style.color = "#000000";
    return;
  }

  const lastSMA = smaData[smaData.length - 1].value;
  const prevSMA = smaData[smaData.length - 2]?.value;
  const lastEMA = emaData[emaData.length - 1].value;
  const prevEMA = emaData[emaData.length - 2]?.value;

  if (!lastSMA || !prevSMA || !lastEMA || !prevEMA) {
    recommendationText.textContent = "Нейтрально";
    recommendationText.style.color = "#000000";
    return;
  }

  // Проверяем пересечение EMA и SMA
  if (prevEMA <= prevSMA && lastEMA > lastSMA) {
    recommendationText.textContent = "Покупка";
    recommendationText.style.color = "#4caf50";
  } else if (prevEMA >= prevSMA && lastEMA < lastSMA) {
    recommendationText.textContent = "Продажа";
    recommendationText.style.color = "#f44336";
  } else {
    recommendationText.textContent = "Нейтрально";
    recommendationText.style.color = "#000000";
  }
}

// Обработчик выбора индикатора
indicatorSelect.addEventListener("change", updateButtonText);

// Обработчик добавления/удаления индикатора
addIndicatorBtn.addEventListener("click", () => {
  const indicator = indicatorSelect.value;
  if (!indicator) {
    console.log("No indicator selected");
    return;
  }

  switch (indicator) {
    case "ma":
      if (smaSeries) {
        chart.removeSeries(smaSeries);
        smaSeries = null;
        smaData = [];
        console.log("SMA removed");
      } else {
        addSMAIndicator();
        console.log("SMA added");
      }
      break;
    case "ema":
      if (emaSeries) {
        chart.removeSeries(emaSeries);
        emaSeries = null;
        emaData = [];
        console.log("EMA removed");
      } else {
        addEMAIndicator();
        console.log("EMA added");
      }
      break;
    case "psar":
      if (psarSeries) {
        chart.removeSeries(psarSeries);
        psarSeries = null;
        console.log("Parabolic SAR removed");
      } else {
        addPSARIndicator();
        console.log("Parabolic SAR added");
      }
      break;
    default:
      console.log("Unknown indicator:", indicator);
  }
  updateButtonText();
  calculateRecommendation();
});

// Основная функция загрузки графика
function loadChart() {
  const selectedPair = pairSelect.value;
  if (!selectedPair) {
    console.error("No pair selected.");
    return;
  }

  if (!userId) {
    console.error("Error: User is not authorized. Missing userId.");
    return;
  }

  const chartDimensions = chartContainer.getBoundingClientRect();
  console.log("Chart container dimensions before init:", {
    width: chartDimensions.width,
    height: chartDimensions.height
  });

  const isSMAActive = !!smaSeries;
  const isEMAActive = !!emaSeries;
  const isPSARActive = !!psarSeries;

  if (chart) {
    chart.remove();
  }

  chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth || 800,
    height: chartContainer.clientHeight || 700,
    layout: {
      backgroundColor: "#ffffff",
      textColor: "#000",
    },
    grid: {
      vertLines: { color: "#eee" },
      horzLines: { color: "#eee" },
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: false,
      fixRightEdge: false,
      barSpacing: 6,
      rightOffset: 20,
      lockVisibleTimeRangeOnResize: false,
      zoomScaleMargin: { left: 0.1, right: 0.1 },
      minBarSpacing: 0.2
    },
    rightPriceScale: {
      autoScale: true,
      scaleMargins: { top: 0.1, bottom: 0.2 },
      minimumHeight: 1
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false
    },
    handleScale: {
      mouseWheel: true,
      pinch: true
    }
  });

  chartContainer.style.cursor = "grab";

  chartContainer.addEventListener("wheel", (event) => {
    if (!event.shiftKey) return;
    event.preventDefault();
    const delta = event.deltaX || event.deltaY;
    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();
    const shift = delta * 0.1;
    timeScale.setVisibleLogicalRange({
      from: visibleRange.from + shift,
      to: visibleRange.to + shift
    });
  });

  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (range) {
      console.log("Visible logical range:", range);
    }
  });

  fetch(
    `/api/chart-data?pair=${encodeURIComponent(selectedPair)}&timeframe=${currentTimeframe}`,
    {
      headers: {
        "x-user-id": userId,
      },
    }
  )
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Chart data received (full):", data);
      console.log("Total candles:", data.length);
      console.log("Chart data (first 5):", data.slice(0, 5));
      console.log("Chart data (last 5):", data.slice(-5));

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No data or invalid format received");
      }

      candleData = data.map(item => ({
        time: item.time,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      }));

      console.log("Processed candle data (first 5):", candleData.slice(0, 5));
      console.log("Processed candle data (last 5):", candleData.slice(-5));

      candleSeries = chart.addCandlestickSeries({
        upColor: '#4caf50',
        downColor: '#f44336',
        borderUpColor: '#4caf50',
        borderDownColor: '#f44336',
        wickUpColor: '#4caf50',
        wickDownColor: '#f44336',
        borderVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#000000'
      });

      candleSeries.setData(candleData);

      const visibleCandles = Math.min(60, candleData.length);
      if (candleData.length > visibleCandles) {
        const lastIndex = candleData.length - 1;
        const firstVisibleIndex = lastIndex - visibleCandles + 1;
        chart.timeScale().setVisibleLogicalRange({
          from: firstVisibleIndex,
          to: lastIndex + 10
        });
      } else {
        chart.timeScale().fitContent();
      }

      if (isSMAActive) addSMAIndicator();
      if (isEMAActive) addEMAIndicator();
      if (isPSARActive) addPSARIndicator();

      updateButtonText();
      calculateRecommendation();
    })
    .catch(err => {
      console.error("Error fetching chart data:", err);
      chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка: ${err.message}</p>`;
    });
}

// Функция добавления SMA
function addSMAIndicator() {
  const period = 20;
  smaData = [];
  for (let i = 0; i < candleData.length; i++) {
    if (i < period - 1) {
      smaData.push({ time: candleData[i].time, value: null });
      continue;
    }
    const sum = candleData.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    const smaValue = sum / period;
    smaData.push({ time: candleData[i].time, value: smaValue });
  }

  smaSeries = chart.addLineSeries({
    color: '#2962FF',
    lineWidth: 2,
    title: 'SMA (20)',
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });
  smaSeries.setData(smaData);
  calculateRecommendation();
}

// Функция добавления EMA
function addEMAIndicator() {
  const period = 9;
  emaData = [];
  const k = 2 / (period + 1);
  let previousEMA = candleData[0].close;

  for (let i = 0; i < candleData.length; i++) {
    if (i < period - 1) {
      emaData.push({ time: candleData[i].time, value: null });
      continue;
    }
    const currentEMA = (candleData[i].close - previousEMA) * k + previousEMA;
    emaData.push({ time: candleData[i].time, value: currentEMA });
    previousEMA = currentEMA;
  }

  emaSeries = chart.addLineSeries({
    color: '#FF9800',
    lineWidth: 2,
    title: 'EMA (9)',
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });
  emaSeries.setData(emaData);
  calculateRecommendation();
}

// Функция добавления Parabolic SAR
function addPSARIndicator() {
  const step = 0.02;
  const maxStep = 0.2;
  const psarData = [];
  let psar = candleData[0].low;
  let ep = candleData[0].high;
  let af = step;
  let isUptrend = true;

  for (let i = 1; i < candleData.length; i++) {
    psarData.push({ time: candleData[i - 1].time, value: psar });

    psar = psar + af * (ep - psar);

    if (isUptrend) {
      psar = Math.min(psar, candleData[i - 1].low, i >= 2 ? candleData[i - 2].low : candleData[i - 1].low);
      if (psar > candleData[i].low) {
        isUptrend = false;
        psar = ep;
        ep = candleData[i].low;
        af = step;
      } else {
        if (candleData[i].high > ep) {
          ep = candleData[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      psar = Math.max(psar, candleData[i - 1].high, i >= 2 ? candleData[i - 2].high : candleData[i - 1].high);
      if (psar < candleData[i].high) {
        isUptrend = true;
        psar = ep;
        ep = candleData[i].high;
        af = step;
      } else {
        if (candleData[i].low < ep) {
          ep = candleData[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
  }

  psarData.push({ time: candleData[candleData.length - 1].time, value: psar });

  psarSeries = chart.addLineSeries({
    color: '#9C27B0',
    lineWidth: 0,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 3,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    title: 'PSAR (0.02, 0.2)',
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });
  psarSeries.setData(psarData);
}

// Обработка ресайза окна
window.addEventListener("resize", () => {
  if (chart) {
    chart.resize(chartContainer.clientWidth || 800, chartContainer.clientHeight || 700);
    console.log("Chart resized to:", chartContainer.clientWidth || 800, chartContainer.clientHeight || 700);
    chart.timeScale().fitContent();
  }
});