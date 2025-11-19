document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");
    const primitiveImage = document.getElementById("primitive-image");

    let currentIndex = 0;
    let data = [];

    fetch("data_enriched.json")
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
            const aPriority = /bone|vertebrae|tooth/i.test(a.primitive_name) ? 1 : 0;
            const bPriority = /bone|vertebrae|tooth/i.test(b.primitive_name) ? 1 : 0;
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
        if (!item) return;
        primitiveId.textContent = item.primitive_id;
        primitiveName.textContent = item.primitive_name;
        compositeId.textContent = item.composite_id;
        compositeName.textContent = item.composite_name;
        updateImage(item.primitive_id);
        renderSpecifications(item.specifications);
    }

    function renderSpecifications(spec) {
        const container = document.getElementById('specifications');
        if (!container) return;
        container.innerHTML = '';
        if (!spec || typeof spec !== 'object' || Object.keys(spec).length === 0) {
            container.innerHTML = '<h4>Specifications</h4><em style="color:#777">None available</em>';
            return;
        }
        const list = document.createElement('ul');
        for (const [key, value] of Object.entries(spec)) {
            const li = document.createElement('li');
            const prettyKey = key.replace(/_/g,' ').replace(/\b(mm|cm|m)\b/i, '$1');
            li.innerHTML = `<code>${prettyKey}</code>: ${value}`;
            list.appendChild(li);
        }
        const heading = document.createElement('h4');
        heading.textContent = 'Specifications';
        container.appendChild(heading);
        container.appendChild(list);
    }

    function updateImage(primitiveId) {
        if (primitiveId) {
            const imagePath = `assets/png/${primitiveId}.png`;
            fetch(imagePath, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        primitiveImage.src = imagePath;
                        primitiveImage.alt = `Image for Primitive ID: ${primitiveId}`;
                        primitiveImage.style.display = 'block';
                    } else {
                        primitiveImage.style.display = 'block';
                        primitiveImage.src = '';
                        primitiveImage.alt = 'Image not present';
                        primitiveImage.textContent = 'Image not present';
                    }
                })
                .catch(() => {
                    primitiveImage.style.display = 'block';
                    primitiveImage.src = '';
                    primitiveImage.alt = 'Error in loading image';
                    primitiveImage.textContent = 'Error in loading image';
                });
        } else {
            primitiveImage.style.display = 'none';
        }
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
