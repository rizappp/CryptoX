console.log("Chart script loaded");

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
  chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка: Пожалуйста, войдите в аккаунт.</p>`;
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
let savedPairs = [];
let ws = null;

const validTimeframes = ["1m", "5m", "15m", "1h", "1d"];
function isValidTimeframe(timeframe) {
  return validTimeframes.includes(timeframe);
}

fetch("/api/saved-pairs", {
  headers: {
    "x-user-id": userId,
  },
})
  .then(res => {
    if (!res.ok) throw new Error(`Failed to fetch saved pairs: ${res.status}`);
    return res.json();
  })
  .then(pairs => {
    console.log("Saved pairs:", pairs);
    savedPairs = pairs.map(p => ({ pair: p.pair.toUpperCase(), coinData: p.coinData }));
    pairSelect.innerHTML = "";

    savedPairs.forEach(pairObj => {
      const option = document.createElement("option");
      option.value = pairObj.pair;
      option.textContent = pairObj.pair;
      pairSelect.appendChild(option);
    });

    if (savedPairs.length > 0) {
      pairSelect.value = savedPairs.find(p => p.pair === "BTC/USD")?.pair || savedPairs[0].pair;
      loadChart();
    } else {
      chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Нет сохранённых пар.</p>`;
    }
  })
  .catch(err => {
    console.error("Error fetching saved pairs:", err);
    chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка загрузки пар: ${err.message}</p>`;
  });

timeframeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const timeframe = button.dataset.timeframe;
    if (!isValidTimeframe(timeframe)) {
      console.error(`Invalid timeframe: ${timeframe}`);
      return;
    }
    timeframeButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    currentTimeframe = timeframe;
    loadChart();
  });
});

pairSelect.addEventListener("change", loadChart);

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
    recommendationText.style.color = "#FFFFFF";
    return;
  }

  if (prevEMA <= prevSMA && lastEMA > lastSMA) {
    recommendationText.textContent = "Покупка";
    recommendationText.style.color = "#4caf50";
  } else if (prevEMA >= prevSMA && lastEMA < lastSMA) {
    recommendationText.textContent = "Продажа";
    recommendationText.style.color = "#f44336";
  } else {
    recommendationText.textContent = "Нейтрально";
    recommendationText.style.color = "#FFFFFF";
  }
}

indicatorSelect.addEventListener("change", updateButtonText);

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

function initWebSocket(pair, timeframe) {
  if (ws) {
    console.log('Closing existing WebSocket');
    ws.close();
    ws = null;
  }

  function connect() {
    console.log('Initiating WebSocket connection for:', pair, timeframe);
    ws = new WebSocket(`ws://localhost:5000`);

    ws.onopen = () => {
      if (!ws) {
        console.error('WebSocket is null in onopen');
        return;
      }
      console.log('WebSocket connected');
      try {
        ws.send(JSON.stringify({ userId, pair, timeframe }));
        console.log('Sent subscription:', { userId, pair, timeframe });
      } catch (error) {
        console.error('Error sending subscription:', error);
      }
    };

    ws.onmessage = (event) => {
      console.log('Raw WebSocket message:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('WebSocket error from server:', data.error);
          return;
        }
        if (data.type === 'kline') {
          const candle = data.candle;
          console.log('Received kline:', candle);

          const candleDataIndex = candleData.findIndex(c => c.time === candle.time);
          const newCandle = {
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
          };

          if (candleDataIndex >= 0) {
            candleData[candleDataIndex] = newCandle;
          } else {
            candleData.push(newCandle);
          }

          candleSeries.update(newCandle);
          console.log('Updated chart with candle:', newCandle);

          if (smaSeries) addSMAIndicator();
          if (emaSeries) addEMAIndicator();
          if (psarSeries) addPSARIndicator();

          calculateRecommendation();

          const lastIndex = candleData.length - 1;
          chart.timeScale().setVisibleLogicalRange({
            from: lastIndex - 60,
            to: lastIndex + 10
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting in 5s...');
      ws = null;
      setTimeout(connect, 5000);
    };
  }

  connect();
}

function loadChart() {
  let selectedPair = pairSelect.value;
  if (!selectedPair) {
    console.error("No pair selected.");
    chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка: Выберите торговую пару.</p>`;
    return;
  }

  if (!userId) {
    console.error("Error: User is not authorized. Missing userId.");
    chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка: Пожалуйста, войдите в аккаунт.</p>`;
    return;
  }

  if (!isValidTimeframe(currentTimeframe)) {
    console.error(`Invalid timeframe: ${currentTimeframe}`);
    chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка: Неверный таймфрейм.</p>`;
    return;
  }

  selectedPair = selectedPair.replace('-', '/').toUpperCase();

  console.log("Loading chart with:", { userId, pair: selectedPair, timeframe: currentTimeframe });

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

  const url = `/api/chart-data?pair=${encodeURIComponent(selectedPair)}&timeframe=${currentTimeframe}`;
  console.log("Fetching chart data from:", url);

  fetch(url, {
    headers: {
      "x-user-id": userId,
      "Content-Type": "application/json"
    },
  })
    .then(res => {
      console.log('Chart data response:', res.status);
      if (!res.ok) {
        return res.json().then(error => {
          throw new Error(`HTTP error! status: ${res.status}, message: ${error.message || "Unknown error"}`);
        });
      }
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

      console.log('Initiating stream for:', selectedPair, currentTimeframe);
      fetch(`/api/chart-data-stream?pair=${encodeURIComponent(selectedPair)}&timeframe=${currentTimeframe}`, {
        headers: {
          "x-user-id": userId,
          "Content-Type": "application/json"
        },
      })
        .then(res => {
          console.log('Stream response:', res.status);
          if (!res.ok) {
            return res.json().then(error => {
              throw new Error(`Stream error: ${error.message}`);
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('Stream initiated:', data);
          initWebSocket(selectedPair, currentTimeframe);
        })
        .catch(err => {
          console.error("Error initiating stream:", err);
          chartContainer.innerHTML += `<p style="text-align: center; color: #a0b0ff;">Не удалось запустить поток данных: ${err.message}</p>`;
        });
    })
    .catch(err => {
      console.error("Error fetching chart data:", err);
      chartContainer.innerHTML = `<p style="text-align: center; color: #a0b0ff;">Ошибка загрузки данных для пары ${selectedPair}: ${err.message}. Попробуйте другую пару или войдите снова.</p>`;
    });
}

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

function addPSARIndicator() {
  const psarData = [];
  let trend = 1; 
  let accelerationFactor = 0.02;
  const maxAcceleration = 0.2;
  let extremePoint = candleData[0].high;
  let sar = candleData[0].low;

  for (let i = 1; i < candleData.length; i++) {
    const prevCandle = candleData[i - 1];
    const currCandle = candleData[i];

    sar = sar + accelerationFactor * (extremePoint - sar);

    if (trend > 0) {
      sar = Math.min(sar, prevCandle.low);
      if (currCandle.low < sar) {
        trend = -1;
        sar = extremePoint;
        accelerationFactor = 0.02;
        extremePoint = currCandle.low;
      } else {
        if (currCandle.high > extremePoint) {
          extremePoint = currCandle.high;
          accelerationFactor = Math.min(accelerationFactor + 0.02, maxAcceleration);
        }
      }
    } else {
      sar = Math.max(sar, prevCandle.high);
      if (currCandle.high > sar) {
        trend = 1;
        sar = extremePoint;
        accelerationFactor = 0.02;
        extremePoint = currCandle.high;
      } else {
        if (currCandle.low < extremePoint) {
          extremePoint = currCandle.low;
          accelerationFactor = Math.min(accelerationFactor + 0.02, maxAcceleration);
        }
      }
    }

    psarData.push({ time: currCandle.time, value: sar });
  }

  psarSeries = chart.addLineSeries({
    color: '#2196F3',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    title: 'Parabolic SAR',
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01
    }
  });
  psarSeries.setData(psarData);
}