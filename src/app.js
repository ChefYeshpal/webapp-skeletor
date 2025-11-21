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
    let etymologyData = {};

    Promise.all([
        fetch("data_enriched.json").then(res => res.json()),
        fetch("etymologies_only.json").then(res => res.json())
    ])
    .then(([jsonData, etymData]) => {
        data = sortData(jsonData);
        etymologyData = etymData;
        populateList();
        updateDetails(0);
    })
    .catch(error => console.error("Error loading data:", error));

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
        renderMetadata(item);
        renderEtymology(item.primitive_name);
    }

    function renderMetadata(item) {
        const container = document.getElementById('specifications');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        const sections = [];
        const specSection = buildSpecSection(item.specifications);
        if (specSection) {
            sections.push(specSection);
        }

        const primitiveSection = buildFmaSection('Primitive FMA metadata', item.primitive_fma);
        if (primitiveSection) {
            sections.push(primitiveSection);
        }

        const compositeSection = buildFmaSection('Composite FMA metadata', item.composite_fma);
        if (compositeSection) {
            sections.push(compositeSection);
        }

        if (sections.length === 0) {
            const heading = document.createElement('h4');
            heading.textContent = 'Specifications';
            container.appendChild(heading);
            const none = document.createElement('em');
            none.style.color = '#777';
            none.textContent = 'None available';
            container.appendChild(none);
            return;
        }

        sections.forEach(section => container.appendChild(section));
    }

    function buildSpecSection(spec) {
        if (!spec || typeof spec !== 'object' || Object.keys(spec).length === 0) {
            return null;
        }

        const list = document.createElement('ul');
        Object.entries(spec).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }
            const li = document.createElement('li');
            const prettyKey = key.replace(/_/g, ' ').replace(/\b(mm|cm|m)\b/i, '$1');
            const label = document.createElement('code');
            label.textContent = prettyKey;
            li.appendChild(label);
            li.appendChild(document.createTextNode(': '));
            const renderedValue = renderValue(value);
            if (!renderedValue) {
                return;
            }
            li.appendChild(renderedValue);
            list.appendChild(li);
        });

        if (!list.childNodes.length) {
            return null;
        }

        return createSection('Specifications', list);
    }

    function buildFmaSection(title, meta) {
        if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) {
            return null;
        }

        const list = document.createElement('ul');
        appendMetaEntry(list, 'FMA ID', meta.fma_id || meta.fmaid);
        appendMetaEntry(list, 'Numeric ID', meta.fmaid);
        appendMetaEntry(list, 'Preferred Label', meta.preferred_label);
        appendMetaEntry(list, 'URI', meta.uri);
        appendMetaEntry(list, 'Synonyms', meta.synonyms);
        appendMetaEntry(list, 'Definitions', meta.definitions);
        appendMetaEntry(list, 'Parents', meta.parents);

        if (!list.childNodes.length) {
            return null;
        }

        return createSection(title, list);
    }

    function appendMetaEntry(list, label, value) {
        if (value === undefined || value === null) {
            return;
        }
        if (Array.isArray(value) && value.length === 0) {
            return;
        }
        if (typeof value === 'string' && !value.trim()) {
            return;
        }

        const rendered = renderValue(value);
        if (!rendered) {
            return;
        }

        const li = document.createElement('li');
        const labelNode = document.createElement('code');
        labelNode.textContent = label;
        li.appendChild(labelNode);
        li.appendChild(document.createTextNode(': '));
        li.appendChild(rendered);
        list.appendChild(li);
    }

    function createSection(title, contentNode) {
        const section = document.createElement('section');
        section.className = 'spec-section';
        const heading = document.createElement('h4');
        heading.textContent = title;
        section.appendChild(heading);
        section.appendChild(contentNode);
        return section;
    }

    function renderValue(value) {
        if (value === undefined || value === null) {
            return null;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return null;
            }
            const fragment = document.createDocumentFragment();
            let first = true;
            value.forEach(entry => {
                const renderedEntry = renderValue(entry);
                if (!renderedEntry) {
                    return;
                }
                if (!first) {
                    fragment.append(document.createTextNode(', '));
                }
                fragment.append(renderedEntry);
                first = false;
            });
            return first ? null : fragment;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }
            if (/^https?:\/\//i.test(trimmed)) {
                const link = document.createElement('a');
                link.href = trimmed;
                link.textContent = trimmed;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                return link;
            }
            const span = document.createElement('span');
            span.textContent = trimmed;
            return span;
        }

        const span = document.createElement('span');
        span.textContent = String(value);
        return span;
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

    function renderEtymology(name) {
        const container = document.getElementById('etymology-data');
        if (!container) return;
        
        container.innerHTML = '';
        container.style.display = 'none';

        if (!name || !etymologyData) return;

        // Tokenize name + filter unique words
        const tokens = [...new Set(name.toLowerCase().split(/[^a-z]+/))];
        const foundWords = tokens.filter(token => etymologyData[token]);

        if (foundWords.length === 0) return;

        foundWords.forEach(word => {
            const data = etymologyData[word];
            const section = document.createElement('section');
            section.className = 'spec-section';
            
            const heading = document.createElement('h4');
            heading.textContent = word.charAt(0).toUpperCase() + word.slice(1);
            section.appendChild(heading);

            const list = document.createElement('ul');

            // Honestly i'm so close to being done...
            if (data.etymology) {
                const li = document.createElement('li');
                const label = document.createElement('code');
                label.textContent = 'Etymology';
                li.appendChild(label);
                li.appendChild(document.createTextNode(': '));
                
                const span = document.createElement('span');
                span.textContent = data.etymology;
                li.appendChild(span);
                list.appendChild(li);
            }

            if (data.pronunciation && data.pronunciation.length > 0) {
                const li = document.createElement('li');
                const label = document.createElement('code');
                label.textContent = 'Pronunciation';
                li.appendChild(label);
                li.appendChild(document.createTextNode(': '));
                
                const pronList = document.createElement('ul');
                pronList.style.paddingLeft = '15px';
                pronList.style.marginTop = '5px';
                
                data.pronunciation.forEach(p => {
                    const pLi = document.createElement('li');
                    let text = '';
                    if (p.dialect) text += `${p.dialect}: `;
                    if (p.ipa && Array.isArray(p.ipa)) {
                        text += p.ipa.join(', ');
                    }
                    pLi.textContent = text;
                    pronList.appendChild(pLi);
                });
                li.appendChild(pronList);
                list.appendChild(li);
            }

            if (data.link) {
                const li = document.createElement('li');
                const label = document.createElement('code');
                label.textContent = 'Link';
                li.appendChild(label);
                li.appendChild(document.createTextNode(': '));
                
                const a = document.createElement('a');
                a.href = data.link;
                a.textContent = data.link;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                li.appendChild(a);
                list.appendChild(li);
            }
            
            section.appendChild(list);
            container.appendChild(section);
        });

        if (container.hasChildNodes()) {
            container.style.display = 'block';
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
