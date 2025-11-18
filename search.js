document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");

    let currentIndex = 0;
    let data = [];
    let filteredData = [];

    fetch("data.json")
        .then(response => response.json())
        .then(jsonData => {
            data = jsonData;
            filteredData = data;
            populateList();
            updateDetails(0);
        })
        .catch(error => console.error("Error loading data.json:", error));

    // Populate the left pane with primitive names
    function populateList() {
        primitiveList.innerHTML = ""; // Clear the list
        filteredData.forEach((item, index) => {
            const listItem = document.createElement("li");
            listItem.textContent = item.primitive_name;
            listItem.dataset.index = index;
            primitiveList.appendChild(listItem);
        });
        highlightItem(0);
    }

    function highlightItem(index) {
        const items = primitiveList.querySelectorAll("li");
        items.forEach(item => item.classList.remove("selected"));
        if (items[index]) {
            items[index].classList.add("selected");
            items[index].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    // Update the right pane with details
    function updateDetails(index) {
        const item = filteredData[index];
        primitiveId.textContent = item.primitive_id;
        primitiveName.textContent = item.primitive_name;
        compositeId.textContent = item.composite_id;
        compositeName.textContent = item.composite_name;
    }

    // Handle search dialog
    document.addEventListener("keydown", (event) => {
        console.log("Key pressed:", event.key); // Debugging log
        if (event.key === "/") {
            console.log("Slash key detected. Opening search dialog."); // Debugging log
            event.preventDefault();
            openSearchDialog();
        }
    });

    function openSearchDialog() {
        console.log("openSearchDialog function called."); // Debugging log
        const searchDialog = document.createElement("div");
        searchDialog.id = "search-dialog";
        searchDialog.innerHTML = `
            <input type="text" id="search-input" placeholder="Search...">
        `;
        document.body.appendChild(searchDialog);

        const searchInput = document.getElementById("search-input");
        searchInput.focus();

        searchInput.addEventListener("input", () => {
            const query = searchInput.value;
            filterData(query);
            populateList();
        });

        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSearchDialog();
            } else if (event.key === "ArrowDown") {
                if (currentIndex < filteredData.length - 1) {
                    currentIndex++;
                    highlightItem(currentIndex);
                    updateDetails(currentIndex);
                }
            } else if (event.key === "ArrowUp") {
                if (currentIndex > 0) {
                    currentIndex--;
                    highlightItem(currentIndex);
                    updateDetails(currentIndex);
                }
            }
        });
    }

    function closeSearchDialog() {
        console.log("closeSearchDialog function called."); // Debugging log
        const searchDialog = document.getElementById("search-dialog");
        if (searchDialog) {
            searchDialog.remove();
            filteredData = data; // Reset filter
            populateList();
        }
    }

    function filterData(query) {
        console.log("Filtering data with query:", query); // Debugging log
        if (query.startsWith("P_FMA:")) {
            const primitiveFma = query.replace("P_FMA:", "").trim();
            filteredData = data.filter(item => item.primitive_id.includes(primitiveFma));
        } else if (query.startsWith("C_FMA:")) {
            const compositeFma = query.replace("C_FMA:", "").trim();
            filteredData = data.filter(item => item.composite_id.includes(compositeFma));
        } else {
            filteredData = data.filter(item => item.primitive_name.toLowerCase().includes(query.toLowerCase()));
        }
        currentIndex = 0; // Reset selection
    }
});
