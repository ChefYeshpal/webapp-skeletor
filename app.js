document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");

    let currentIndex = 0;
    let data = [];

    fetch("data.json")
        .then(response => response.json())
        .then(jsonData => {
            data = sortData(jsonData);
            populateList();
            updateDetails(0);
        })
        .catch(error => console.error("Error loading data.json:", error));

    // data prioritization
    function sortData(data) {
        return data.sort((a, b) => {
            const aPriority = /bone|vertebrae/i.test(a.primitive_name) ? 1 : 0;
            const bPriority = /bone|vertebrae/i.test(b.primitive_name) ? 1 : 0;
            return bPriority - aPriority;
        });
    }

    // Populate the left pane with primitive names
    function populateList() {
        data.forEach((item, index) => {
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
        const item = data[index];
        primitiveId.textContent = item.primitive_id;
        primitiveName.textContent = item.primitive_name;
        compositeId.textContent = item.composite_id;
        compositeName.textContent = item.composite_name;
    }

    // key nav
    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "j") {
            if (currentIndex < data.length - 1) {
                currentIndex++;
                highlightItem(currentIndex);
                updateDetails(currentIndex);
            }
        } else if (event.key === "ArrowUp" || event.key === "k") {
            if (currentIndex > 0) {
                currentIndex--;
                highlightItem(currentIndex);
                updateDetails(currentIndex);
            }
        }
    });
});
