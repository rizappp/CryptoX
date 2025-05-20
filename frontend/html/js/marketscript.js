document.addEventListener("DOMContentLoaded", () => {
  const cryptoList = document.getElementById("cryptoList");
  const searchInput = document.getElementById("searchInput");
  const sortFilter = document.getElementById("sortFilter");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageNumbers = document.getElementById("pageNumbers");

  let originalCryptocurrencies = [];
  let cryptocurrencies = [];
  const itemsPerPage = 10;
  let currentPage = 1;
  let savedPairs = [];

  async function fetchSavedPairs() {
    try {
      const id = localStorage.getItem("id");
      if (!id) {
        throw new Error("User ID not found in localStorage");
      }
      const response = await fetch("http://localhost:5000/api/saved-pairs", {
        headers: {
          "Content-Type": "application/json",
          "x-user-id": id
        }
      });
      if (!response.ok) {
        throw new Error("Ошибка при получении сохраненных пар");
      }
      const data = await response.json();
      savedPairs = Array.isArray(data) ? data.map(item => item.pair || "").filter(Boolean) : [];
    } catch (error) {
      console.error("Ошибка загрузки сохраненных пар:", error);
      savedPairs = [];
    }
  }

  async function fetchCryptocurrencies() {
    try {
      const id = localStorage.getItem("id");
      if (!id) {
        throw new Error("User ID not found in localStorage");
      }
      const response = await fetch("http://localhost:5000/api/market", {
        headers: {
          "Content-Type": "application/json",
          "x-user-id": id
        }
      });
      if (!response.ok) {
        throw new Error("Ошибка при получении данных о криптовалютах");
      }

      const data = await response.json();
      originalCryptocurrencies = data.map(crypto => ({
        name: crypto.symbol.toUpperCase() + "/USD",
        price: crypto.current_price,
        change24h: crypto.price_change_percentage_24h,
        volume: crypto.total_volume
      }));

      cryptocurrencies = [...originalCryptocurrencies];
      await fetchSavedPairs();
      applyFiltersAndSort();
      displayCryptocurrencies(getPaginatedData());
      updatePagination();
    } catch (error) {
      console.error("Ошибка:", error);
      cryptoList.innerHTML = "<tr><td colspan='5'>Ошибка загрузки данных</td></tr>";
    }
  }

  async function savePair(pair) {
    try {
      const id = localStorage.getItem("id");
      if (!id) {
        throw new Error("User ID not found in localStorage");
      }
      console.log("Отправка пары:", { userId: id, pair });
      const response = await fetch("http://localhost:5000/api/save-pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": id
        },
        body: JSON.stringify({ userId: id, pair })
      });

      console.log("Response Status:", response.status);
      const responseText = await response.text();
      console.log("Response Text:", responseText);

      const result = JSON.parse(responseText);
      if (!response.ok) {
        throw new Error(result.message || "Ошибка при сохранении пары");
      }

      alert("Пара успешно сохранена!");
      await fetchSavedPairs();
      displayCryptocurrencies(getPaginatedData());
    } catch (error) {
      console.error("Ошибка сохранения пары:", error);
      alert(error.message || "Ошибка при сохранении пары");
    }
  }

  function getPaginatedData() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return cryptocurrencies.slice(start, end);
  }

  function displayCryptocurrencies(data) {
    cryptoList.innerHTML = "";
    data.forEach(crypto => {
      const isSaved = Array.isArray(savedPairs) && savedPairs.includes(crypto.name);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${crypto.name}</td>
        <td>$${crypto.price.toFixed(2)}</td>
        <td class="price-change ${crypto.change24h >= 0 ? 'positive' : 'negative'}">
          ${crypto.change24h.toFixed(2)}%
        </td>
        <td>$${crypto.volume.toLocaleString()}</td>
        <td>
          <button class="save-button" data-pair="${crypto.name}" ${isSaved ? 'disabled' : ''}>
            ${isSaved ? 'Сохранено' : 'Сохранить'}
          </button>
        </td>
      `;
      cryptoList.appendChild(row);
    });

    document.querySelectorAll(".save-button").forEach(button => {
      button.addEventListener("click", () => {
        const pair = button.getAttribute("data-pair");
        if (!button.disabled) {
          savePair(pair);
        }
      });
    });
  }

  function updatePagination() {
    const totalPages = Math.ceil(cryptocurrencies.length / itemsPerPage);
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    pageNumbers.textContent = `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, cryptocurrencies.length)} из ${cryptocurrencies.length}`;
  }

  function applyFiltersAndSort() {
    cryptocurrencies = [...originalCryptocurrencies];
    
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      cryptocurrencies = cryptocurrencies.filter(crypto => 
        crypto.name.toLowerCase().includes(searchTerm)
      );
    }

    const sortBy = sortFilter.value;
    if (sortBy === "price-desc") {
      cryptocurrencies.sort((a, b) => b.price - a.price);
    } else if (sortBy === "price-asc") {
      cryptocurrencies.sort((a, b) => a.price - b.price);
    }
  }

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndSort();
    displayCryptocurrencies(getPaginatedData());
    updatePagination();
  });

  sortFilter.addEventListener("change", () => {
    currentPage = 1;
    applyFiltersAndSort();
    displayCryptocurrencies(getPaginatedData());
    updatePagination();
  });

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayCryptocurrencies(getPaginatedData());
      updatePagination();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(cryptocurrencies.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayCryptocurrencies(getPaginatedData());
      updatePagination();
    }
  });

  setInterval(() => {
    fetchCryptocurrencies();
  }, 30000);

  fetchCryptocurrencies();
});