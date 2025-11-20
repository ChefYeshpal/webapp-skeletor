document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");
    const readmeView = document.getElementById("readme-view");

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
                console.warn("Asset manifest unavailable; falling back to on-demand checks.", error);
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
    let filteredData = [];
    const VISIBLE_LIMIT = 300;
    let highlightTerms = [];

    fetch("data_enriched.json")
        .then(response => response.json())
        .then(jsonData => {
            data = jsonData;
            filteredData = data;
            populateList();
            currentIndex = 0;
            highlightItem(currentIndex);
            displayReadme();
        })
        .catch(error => console.error("Error loading data.json:", error));

    // Populate the left pane with primitive names
    function populateList() {
        primitiveList.innerHTML = "";
        const frag = document.createDocumentFragment();
        const pinned = document.createElement("li");
        pinned.textContent = "README.md";
        pinned.classList.add("pinned");
        pinned.dataset.type = "readme";
        frag.appendChild(pinned);

        const count = Math.min(filteredData.length, VISIBLE_LIMIT);
        for (let index = 0; index < count; index++) {
            const item = filteredData[index];
            const li = document.createElement("li");
            li.innerHTML = highlightName(item.primitive_name, highlightTerms);
            // store index into filteredData
            li.dataset.index = String(index);
            frag.appendChild(li);
        }
        primitiveList.appendChild(frag);
        updateSearchMeta();
    }

    function highlightItem(index) {
        const items = primitiveList.querySelectorAll("li");
        items.forEach(item => item.classList.remove("selected"));
        if (items[index]) {
            items[index].classList.add("selected");
            items[index].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    function applySelection() {
        highlightItem(currentIndex);
        if (currentIndex === 0) {
            displayReadme();
        } else {
            updateDetails(currentIndex - 1);
        }
    }

    function moveSelection(direction) {
        const total = 1 + Math.min(filteredData.length, VISIBLE_LIMIT);
        if (direction === 'down' && currentIndex < total - 1) {
            currentIndex++;
        } else if (direction === 'up' && currentIndex > 0) {
            currentIndex--;
        }
        applySelection();
    }

    // Update the right pane with details
    function updateDetails(index) {
        const item = filteredData[index];
        if (!item) return;
        toggleReadme(false);
        primitiveId.textContent = item.primitive_id;
        primitiveName.textContent = item.primitive_name;
        compositeId.textContent = item.composite_id;
        compositeName.textContent = item.composite_name;
        updateImage(item.primitive_id);
        updateStlButton(item.primitive_id);
        renderMetadata(item);
    }
    
    function toggleReadme(show) {
        const details = document.getElementById("details");
        if (!details || !readmeView) return;
        details.style.display = show ? "none" : "block";
        readmeView.style.display = show ? "block" : "none";
    }

    function displayReadme() {
        toggleReadme(true);
        if (!window.marked) {
            readmeView.textContent = "Markdown renderer not loaded";
            return;
        }
        fetch("README.md")
            .then(res => res.ok ? res.text() : Promise.reject(new Error("Failed to load README.md")))
            .then(md => {
                readmeView.innerHTML = window.marked.parse(md);
            })
            .catch(() => {
                readmeView.textContent = "Unable to load README.md";
            });
    }

    function updateImage(primitiveId) {
        const img = document.getElementById("primitive-image");
        if (!img) return;
        if (primitiveId) {
            const fileName = `${primitiveId}.png`;
            const imagePath = `assets/png/${fileName}`;
            checkAssetAvailability('png', fileName)
                .then(isAvailable => {
                    if (isAvailable) {
                        img.src = imagePath;
                        img.alt = `Image for Primitive ID: ${primitiveId}`;
                        img.style.display = 'block';
                        img.removeAttribute('data-msg');
                    } else {
                        img.style.display = 'block';
                        img.removeAttribute('src');
                        img.alt = 'Image not available';
                        img.setAttribute('data-msg', 'Image not available');
                    }
                })
                .catch(() => {
                    img.style.display = 'block';
                    img.removeAttribute('src');
                    img.alt = 'Image not available';
                    img.setAttribute('data-msg', 'Image not available');
                });
        } else {
            img.style.display = 'none';
        }
    }

    function updateStlButton(primitiveId) {
        const btn = document.getElementById('view-stl-btn');
        if (!btn) return;
        if (!primitiveId) {
            btn.disabled = true;
            btn.title = 'No STL found';
            btn.removeAttribute('data-src');
            return;
        }
        const fileName = `${primitiveId}.stl`;
        const stlPath = `assets/stl/${fileName}`;
        checkAssetAvailability('stl', fileName)
            .then(isAvailable => {
                if (isAvailable) {
                    btn.disabled = false;
                    btn.title = 'Open 3D STL viewer';
                    btn.setAttribute('data-src', stlPath);
                } else {
                    btn.disabled = true;
                    btn.title = 'No STL found';
                    btn.removeAttribute('data-src');
                }
            })
            .catch(() => {
                btn.disabled = true;
                btn.title = 'No STL found';
                btn.removeAttribute('data-src');
            });
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

        /**
         * Never gonna give you up
         * never gonna let you down
         * never gonna run around and desert you~
         * never gonna make you cry
         * never gonna say goodbye
         * never gonna tell a lie and hurt you~
         *      - Mah idol, Rick Astley :)
         */
        
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

    document.addEventListener("keydown", (event) => {
        const activeElement = document.activeElement;
        if (event.key === "/") {
            event.preventDefault();
            openSearchDialog();
            return;
        }
        const navKeys = ["j", "k", "ArrowDown", "ArrowUp"];
        if (navKeys.includes(event.key) && activeElement.id !== "search-input") {
            event.preventDefault();
            moveSelection(event.key === "j" || event.key === "ArrowDown" ? 'down' : 'up');
        }
    });

    function openSearchDialog() {
        const searchDialog = document.createElement("div");
        searchDialog.id = "search-dialog";
        searchDialog.innerHTML = `
            <input type="text" id="search-input" placeholder="P/C_FMA for pri/compo ID">
            <div id="search-meta" aria-live="polite" style="margin-top:6px;font-size:12px;color:#9aa0a6"></div>
        `;
        document.body.appendChild(searchDialog);

        const searchInput = document.getElementById("search-input");
        searchInput.focus();

        const debouncedFilter = debounce(() => {
            const query = searchInput.value;
            filterData(query);
            populateList();
            if (filteredData.length > 0) {
                currentIndex = 1; 
            } else {
                currentIndex = 0; 
            }
            applySelection();
        }, 200);

        searchInput.addEventListener("input", debouncedFilter);

        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSearchDialog();
                return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                moveSelection(event.key === "ArrowDown" ? 'down' : 'up');
            }
        });
    }

    function closeSearchDialog() {
        const searchDialog = document.getElementById("search-dialog");
        if (searchDialog) {
            searchDialog.remove();
            filteredData = data;
            populateList();
        }
    }

    function filterData(query) {
        const { filters, terms, regex } = parseQuery(query);
        highlightTerms = terms;
        filteredData = data.filter(item => {
            let ok = true;
            if (regex) {
                ok = regex.test(item.primitive_name);
            } else if (terms.length) {
                const n = item.primitive_name.toLowerCase();
                ok = terms.every(t => n.includes(t));
            }

            // Structured filters (ANDed)
            if (!ok) return false;
            for (const f of filters) {
                let source = "";
                if (f.key === "p_fma") source = String(item.primitive_id ?? "");
                else if (f.key === "c_fma") source = String(item.composite_id ?? "");
                else if (f.key === "name") source = String(item.primitive_name ?? "").toLowerCase();
                const q = f.key === "name" ? f.value.toLowerCase() : f.value;
                if (!matchByMode(source, q, f.mode, f.key === "name")) return false;
            }
            return true;
        });
        currentIndex = 0;
    }

    function parseQuery(raw) {
        const q = (raw || "").trim();
        const filters = [];
        const terms = [];
        let regex = null;

        if (!q) return { filters, terms, regex };

        // Regex mode: /pattern/i
        if (q.startsWith("/") && q.lastIndexOf("/") > 0) {
            const last = q.lastIndexOf("/");
            const pattern = q.slice(1, last);
            const flags = q.slice(last + 1);
            try { regex = new RegExp(pattern, flags || "i"); } catch { /* ignore */ }
            return { filters, terms, regex };
        }

        // Tokenize by spaces respecting quotes
        const tokens = q.match(/\"[^\"]+\"|\S+/g) || [];
        for (let token of tokens) {
            token = token.replace(/^\"|\"$/g, "");
            const m = token.match(/^(p_fma|P_FMA|c_fma|C_FMA|name|NAME|n|N)(\^?=|\*=|=|:)(.+)$/);
            if (m) {
                const keyRaw = m[1];
                const op = m[2];
                const val = m[3].trim();
                const key = /p_fma/i.test(keyRaw) ? "p_fma" : /c_fma/i.test(keyRaw) ? "c_fma" : "name";
                const mode = op === "=" ? "exact" : op === "^=" ? "starts" : "contains"; // includes ':' and '*='
                if (val) filters.push({ key, mode, value: val });
            } else if (/^(P_FMA:|C_FMA:)/.test(token)) {
                // legacy prefix support P_FMA:123, C_FMA:456
                const isP = token.startsWith("P_FMA:");
                const val = token.split(":")[1].trim();
                if (val) filters.push({ key: isP ? "p_fma" : "c_fma", mode: "contains", value: val });
            } else {
                terms.push(token.toLowerCase());
            }
        }
        return { filters, terms, regex };
    }

    function matchByMode(source, value, mode, caseInsensitive) {
        const s = caseInsensitive ? String(source).toLowerCase() : String(source);
        const v = caseInsensitive ? String(value).toLowerCase() : String(value);
        if (mode === "exact") return s === v; // accuracy: whole ID must match
        if (mode === "starts") return s.startsWith(v); 
        return s.includes(v);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function highlightName(name, terms) {
        if (!terms || terms.length === 0) return escapeHtml(name);
        let out = escapeHtml(name);
        for (const t of terms) {
            if (!t) continue;
            const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
            out = out.replace(re, '<mark class="hl">$1</mark>');
        }
        return out;
    }

    function updateSearchMeta() {
        const meta = document.getElementById("search-meta");
        if (!meta) return;
        const total = filteredData.length;
        const showing = Math.min(total, VISIBLE_LIMIT);
        meta.textContent = total === 0 ? "No results" : `Showing ${showing} of ${total}`;
    }

    primitiveList.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        if (li.dataset.type === "readme") {
            currentIndex = 0;
            highlightItem(currentIndex);
            displayReadme();
            return;
        }
        const idx = Number(li.dataset.index || 0);
        currentIndex = Math.max(1, Math.min(idx + 1, 1 + filteredData.length - 1));
        highlightItem(currentIndex);
        updateDetails(idx);
    });

    const stlButton = document.getElementById('view-stl-btn');
    if (stlButton) {
        stlButton.addEventListener('click', () => {
            if (stlButton.disabled) return;
            const src = stlButton.getAttribute('data-src');
            if (!src) return;
            const url = `stl-viewer.html?src=${encodeURIComponent(src)}`;
            window.open(url, '_blank');
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
