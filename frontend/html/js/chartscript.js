console.log("Chart script loaded");

// Проверка на наличие библиотеки
if (!window.LightweightCharts) {
  console.error("Lightweight Charts is not loaded!");
} else {
  console.log("Lightweight Charts loaded successfully");
}

const chartContainer = document.getElementById("chartContainer");
const pairSelect = document.getElementById("pairSelect");
const timeframeButtons = document.querySelectorAll(".timeframe-btn");

const userId = localStorage.getItem("userId");

if (!userId) {
  console.error("Error: User is not authorized. Missing userId.");
}

let chart;
let candleSeries;
let currentTimeframe = "1h";

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
      loadChart(); // Загружаем график при первой загрузке
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
    loadChart(); // перезагружаем график
  });
});

// Отслеживаем изменение выбранной пары
pairSelect.addEventListener("change", loadChart);

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
  console.log("Chart container dimensions before init:", chartDimensions);

  // Удаляем старый график, если есть
  if (chart) {
    chart.remove();
  }

  chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
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
    },
  });

  candleSeries = chart.addCandlestickSeries();

  fetch(
    `/api/chartdata?pair=${encodeURIComponent(selectedPair)}&timeframe=${currentTimeframe}`,
    {
      headers: {
        "x-user-id": userId,
      },
    }
  )
    .then(res => res.json())
    .then(data => {
      console.log("Chart data received:", data);

      if (!Array.isArray(data)) {
        throw new Error("Expected data to be an array. Received: " + JSON.stringify(data));
      }

      const candleData = data.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));

      console.log("Candle Data:", candleData);
      candleSeries.setData(candleData);
    })
    .catch(err => {
      console.error("Error fetching chart data:", err);
    });
}

// Обработка ресайза окна
window.addEventListener("resize", () => {
  if (chart) {
    chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
    console.log("Chart resized to:", chartContainer.clientWidth, chartContainer.clientHeight);
  }
});


