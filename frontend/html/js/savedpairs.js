// savedpairs.js
document.addEventListener("DOMContentLoaded", () => {
    const pairsList = document.getElementById("pairsList");

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
            console.log("Полученные пары:", savedPairs);
            displaySavedPairs(savedPairs);
        } catch (error) {
            console.error("Ошибка:", error);
            pairsList.innerHTML = "<tr><td colspan='5'>Ошибка загрузки данных</td></tr>";
        }
    }

    async function removePair(pair) {
        try {
            const id = localStorage.getItem("id");
            console.log("Удаление пары:", { userId: id, pair });
            const response = await fetch("http://localhost:5000/api/remove-pair", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": id
                },
                body: JSON.stringify({ pair })
            });

            const result = await response.json();
            console.log("Response:", { status: response.status, result });
            if (!response.ok) {
                throw new Error(result.message || "Ошибка при удалении пары");
            }

            alert("Пара успешно удалена!");
            fetchSavedPairs();
        } catch (error) {
            console.error("Ошибка удаления пары:", error);
            alert(error.message || "Ошибка при удалении пары");
        }
    }

    function displaySavedPairs(pairs) {
        pairsList.innerHTML = "";
        if (pairs.length === 0) {
            pairsList.innerHTML = "<tr><td colspan='5'>Нет сохраненных пар</td></tr>";
            return;
        }

        pairs.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.pair}</td>
                <td>
                    <button class="remove-button" data-pair="${item.pair}">Удалить</button>
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

    fetchSavedPairs();
});