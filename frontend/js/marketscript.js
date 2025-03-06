document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!localStorage.getItem("id")) { // Check for id
    window.location.href = "login.html"; // Redirect to login if no id
  }

  const cryptoList = document.getElementById("cryptoList");
  const searchInput = document.getElementById("searchInput");
  const sortFilter = document.getElementById("sortFilter");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageNumbers = document.getElementById("pageNumbers");

  let cryptocurrencies = []; // Store all fetched data
  const itemsPerPage = 10; // Number of cryptocurrencies per page
  let currentPage = 1;

  // Fetch cryptocurrency data from CoinGecko
  async function fetchCryptocurrencies() {
    try {
      const id = localStorage.getItem("id");
      const response = await fetch("http://localhost:5000/api/market", {
        headers: {
          "Content-Type": "application/json",
          "x-user-id": id // Send id in custom header for authMiddleware
        }
      });
      if (!response.ok) {
        throw new Error("Ошибка при получении данных о криптовалютах");
      }
      
      const data = await response.json();
      cryptocurrencies = data.map(crypto => ({
        name: crypto.symbol.toUpperCase() + "/USD", // e.g., BTC/USD
        price: crypto.current_price,
        change24h: crypto.price_change_percentage_24h,
        volume: crypto.total_volume
      }));

      applyFiltersAndSort();
      displayCryptocurrencies(getPaginatedData());
      updatePagination();
    } catch (error) {
      console.error("Ошибка:", error);
      cryptoList.innerHTML = "<tr><td colspan='4'>Ошибка загрузки данных</td></tr>";
    }
  }

  // Get paginated data for the current page
  function getPaginatedData() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return cryptocurrencies.slice(start, end);
  }

  // Display cryptocurrencies in the table
  function displayCryptocurrencies(data) {
    cryptoList.innerHTML = ""; // Clear existing content
    data.forEach(crypto => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${crypto.name}</td>
        <td>$${crypto.price.toFixed(2)}</td>
        <td class="price-change ${crypto.change24h >= 0 ? 'positive' : 'negative'}">
          ${crypto.change24h.toFixed(2)}%
        </td>
        <td>$${crypto.volume.toLocaleString()}M</td>
      `;
      cryptoList.appendChild(row);
    });
  }

  // Update pagination controls
  function updatePagination() {
    const totalPages = Math.ceil(cryptocurrencies.length / itemsPerPage);
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    pageNumbers.textContent = `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, cryptocurrencies.length)} из ${cryptocurrencies.length}`;
  }

  // Apply search and sort filters
  function applyFiltersAndSort() {
    let filteredCryptos = [...cryptocurrencies];
    
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filteredCryptos = filteredCryptos.filter(crypto => 
        crypto.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sort filter
    const sortBy = sortFilter.value;
    if (sortBy === "price-desc") {
      filteredCryptos.sort((a, b) => b.price - a.price);
    } else if (sortBy === "price-asc") {
      filteredCryptos.sort((a, b) => a.price - b.price);
    }

    cryptocurrencies = filteredCryptos;
  }

  // Search functionality
  searchInput.addEventListener("input", () => {
    currentPage = 1; // Reset to first page
    applyFiltersAndSort();
    displayCryptocurrencies(getPaginatedData());
    updatePagination();
  });

  // Sort functionality
  sortFilter.addEventListener("change", () => {
    currentPage = 1; // Reset to first page
    applyFiltersAndSort();
    displayCryptocurrencies(getPaginatedData());
    updatePagination();
  });

  // Pagination navigation
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

  // Logout functionality (if you have a logout button elsewhere)
  const logoutButton = document.getElementById("logoutButton"); // Add this if you have a logout button

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("id"); // Clear id
      window.location.href = "login.html"; // Redirect to login page
    });
  }

  // Set up periodic polling for real-time updates
  setInterval(() => {
    fetchCryptocurrencies();
  }, 30000); // 30 seconds

  // Initial fetch
  fetchCryptocurrencies();
});