// savedpairs.js
document.addEventListener("DOMContentLoaded", () => {
    const pairsList = document.getElementById("pairsList");
  
    // Fetch saved pairs
    async function fetchSavedPairs() {
      try {
        const id = localStorage.getItem("id");
        if (!id) {
          alert('Пожалуйста, войдите в систему');
          window.location.href = 'login.html';
          return;
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
        const savedPairs = await response.json();
        displaySavedPairs(savedPairs);
      } catch (error) {
        console.error("Ошибка:", error);
        pairsList.innerHTML = "<tr><td colspan='5'>Ошибка загрузки данных</td></tr>";
      }
    }
  
    // Remove a saved pair
    async function removePair(pair) {
      try {
        const id = localStorage.getItem("id");
        const response = await fetch("http://localhost:5000/api/remove-pair", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": id
          },
          body: JSON.stringify({ pair })
        });
  
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Ошибка при удалении пары");
        }
  
        alert("Пара успешно удалена!");
        fetchSavedPairs(); // Refresh the list
      } catch (error) {
        console.error("Ошибка удаления пары:", error);
        alert(error.message || "Ошибка при удалении пары");
      }
    }
  
    // Display saved pairs in the table
    function displaySavedPairs(pairs) {
  pairsList.innerHTML = "";
  if (pairs.length === 0) {
    pairsList.innerHTML = "<tr><td colspan='5'>Нет сохраненных пар</td></tr>";
    return;
  }

  const formattedPairs = pairs.map(item => {
    if (item.coinData) {
      return {
        name: item.pair,
        price: item.coinData.current_price,
        change24h: item.coinData.price_change_percentage_24h,
        volume: item.coinData.total_volume
      };
    }
    return null;
  }).filter(pair => pair !== null);

  if (formattedPairs.length === 0) {
    pairsList.innerHTML = "<tr><td colspan='5'>Нет данных для отображения</td></tr>";
    return;
  }

  formattedPairs.forEach(pair => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${pair.name}</td>
      <td>$${pair.price.toFixed(2)}</td>
      <td class="price-change ${pair.change24h >= 0 ? 'positive' : 'negative'}">
        ${pair.change24h.toFixed(2)}%
      </td>
      <td>$${pair.volume.toLocaleString()}</td>
      <td>
        <button class="remove-button" data-pair="${pair.name}">Удалить</button>
      </td>
    `;
    pairsList.appendChild(row);
  });

  document.querySelectorAll(".remove-button").forEach(button => {
    button.addEventListener("click", () => {
      const pair = button.getAttribute("data-pair");
      removePair(pair);
    });
  });
}
  
    // Initial fetch
    fetchSavedPairs();
  });