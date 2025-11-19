document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");
    const primitiveImage = document.getElementById("primitive-image");

    const assetState = window.__assetManifestState || (window.__assetManifestState = {
        png: new Set(),
        stl: new Set(),
        cached: { png: new Set(), stl: new Set() },
        missing: { png: new Set(), stl: new Set() },
        failed: false,
        promise: null
    });

    if (!assetState.promise) {
        assetState.promise = fetch("assets/manifest.json")
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Manifest request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(manifest => {
                (manifest?.png || []).forEach(name => assetState.png.add(name));
                (manifest?.stl || []).forEach(name => assetState.stl.add(name));
                assetState.failed = false;
                return assetState;
            })
            .catch(error => {
                assetState.failed = true;
                console.warn("Asset manifest unavailable, falling back to on-demand checks.", error);
                return assetState;
            });
    }

    if (!assetState.checkAvailability) {
        assetState.checkAvailability = function checkAvailability(type, fileName) {
            if (!fileName) {
                return Promise.resolve(false);
            }
            const manifestPromise = assetState.promise;
            if (!assetState.cached[type]) {
                assetState.cached[type] = new Set();
            }
            if (!assetState.missing[type]) {
                assetState.missing[type] = new Set();
            }
            return manifestPromise.then(() => {
                const registry = assetState[type];
                if (registry && registry.has(fileName)) {
                    return true;
                }
                if (!assetState.failed) {
                    return false;
                }
                const cacheHit = assetState.cached[type]?.has(fileName);
                if (cacheHit) {
                    return true;
                }
                const cacheMiss = assetState.missing[type]?.has(fileName);
                if (cacheMiss) {
                    return false;
                }
                const assetPath = type === "png" ? `assets/png/${fileName}` : `assets/stl/${fileName}`;
                return fetch(assetPath, { method: "HEAD" })
                    .then(res => {
                        if (res.ok) {
                            assetState.cached[type].add(fileName);
                            return true;
                        }
                        assetState.missing[type].add(fileName);
                        return false;
                    })
                    .catch(() => {
                        assetState.missing[type].add(fileName);
                        return false;
                    });
            });
        };
    }

    const checkAssetAvailability = assetState.checkAvailability;

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
            const fileName = `${primitiveId}.png`;
            const imagePath = `assets/png/${fileName}`;
            checkAssetAvailability('png', fileName)
                .then(isAvailable => {
                    if (isAvailable) {
                        primitiveImage.src = imagePath;
                        primitiveImage.alt = `Image for Primitive ID: ${primitiveId}`;
                        primitiveImage.style.display = 'block';
                        primitiveImage.removeAttribute('data-msg');
                    } else {
                        primitiveImage.style.display = 'block';
                        primitiveImage.removeAttribute('src');
                        primitiveImage.alt = 'Image not available';
                        primitiveImage.setAttribute('data-msg', 'Image not available');
                    }
                })
                .catch(() => {
                    primitiveImage.style.display = 'block';
                    primitiveImage.removeAttribute('src');
                    primitiveImage.alt = 'Image not available';
                    primitiveImage.setAttribute('data-msg', 'Image not available');
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
