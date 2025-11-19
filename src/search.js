document.addEventListener("DOMContentLoaded", () => {
    const primitiveList = document.getElementById("primitive-list");
    const primitiveId = document.getElementById("primitive-id");
    const primitiveName = document.getElementById("primitive-name");
    const compositeId = document.getElementById("composite-id");
    const compositeName = document.getElementById("composite-name");
    const readmeView = document.getElementById("readme-view");

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
        renderSpecifications(item.specifications);
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
            const imagePath = `assets/png/${primitiveId}.png`;
            fetch(imagePath, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        img.src = imagePath;
                        img.alt = `Image for Primitive ID: ${primitiveId}`;
                        img.style.display = 'block';
                        img.removeAttribute('data-msg');
                    } else {
                        img.style.display = 'block';
                        img.removeAttribute('src');
                        img.alt = 'Image not present';
                        img.setAttribute('data-msg', 'Image not present');
                    }
                })
                .catch(() => {
                    img.style.display = 'block';
                    img.removeAttribute('src');
                    img.alt = 'Error in loading image';
                    img.setAttribute('data-msg', 'Error in loading image');
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
        const stlPath = `assets/stl/${primitiveId}.stl`;
        fetch(stlPath, { method: 'HEAD' })
            .then(res => {
                if (res.ok) {
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

    document.addEventListener("keydown", (event) => {
        const activeElement = document.activeElement;
        if (event.key === "/") {
            event.preventDefault();
            openSearchDialog();
        } else if ((event.key === "j" || event.key === "k") && activeElement.id !== "search-input") {
            event.preventDefault();
            const total = 1 + Math.min(filteredData.length, VISIBLE_LIMIT); // 1 for pinned README
            if (event.key === "j" && currentIndex < total - 1) {
                currentIndex++;
            } else if (event.key === "k" && currentIndex > 0) {
                currentIndex--;
            }
            highlightItem(currentIndex);
            if (currentIndex === 0) displayReadme();
            else updateDetails(currentIndex - 1);
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
        }, 200);

        searchInput.addEventListener("input", debouncedFilter);

        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSearchDialog();
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
