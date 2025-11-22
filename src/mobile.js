document.addEventListener("DOMContentLoaded", () => {
	const mediaQuery = window.matchMedia("(max-width: 900px)");
	const state = {
		initialized: false,
		isOpen: false,
		priorFocus: null,
		topBar: null,
		backButton: null,
		paneTitle: null,
		listHandler: null,
		backHandler: null,
		keyHandler: null,
		nameObserver: null,
		mqHandler: null,
		currentView: "details",
		searchButton: null,
		searchHandler: null,
		searchObserver: null
	};
	const primitiveList = document.getElementById("primitive-list");
	const rightPane = document.querySelector(".right-pane");
	const leftPane = document.querySelector(".left-pane");

	if (!primitiveList || !rightPane || !leftPane) {
		return;
	}

	function ensureFocusTarget() {
		if (!primitiveList.hasAttribute("tabindex")) {
			primitiveList.setAttribute("tabindex", "0");
		}
		if (!rightPane.hasAttribute("tabindex")) {
			rightPane.setAttribute("tabindex", "-1");
		}
	}

	function removeFocusTarget() {
		if (primitiveList.getAttribute("tabindex") === "0") {
			primitiveList.removeAttribute("tabindex");
		}
		if (rightPane.getAttribute("tabindex") === "-1") {
			rightPane.removeAttribute("tabindex");
		}
	}

	function setPaneTitle(label) {
		if (state.paneTitle) {
			state.paneTitle.textContent = label && label.trim() ? label.trim() : "Details";
		}
	}

	function syncPaneTitle() {
		if (state.currentView === "readme") {
			setPaneTitle("README");
			return;
		}
		const primitiveName = document.getElementById("primitive-name");
		const nextTitle = primitiveName ? primitiveName.textContent : "";
		setPaneTitle(nextTitle);
	}

	function openPane() {
		if (!state.initialized || state.isOpen) {
			syncPaneTitle();
			return;
		}
		state.isOpen = true;
		const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		state.priorFocus = activeElement;
		if (activeElement && leftPane.contains(activeElement) && typeof activeElement.blur === "function") {
			activeElement.blur();
		}
		rightPane.classList.add("is-open");
		rightPane.setAttribute("aria-hidden", "false");
		leftPane.setAttribute("aria-hidden", "true");
		leftPane.setAttribute("inert", "");
		document.body.classList.add("mobile-pane-open");
		syncPaneTitle();
		requestAnimationFrame(() => {
			rightPane.focus({ preventScroll: true });
		});
	}

	function closePane() {
		if (!state.initialized || !state.isOpen) {
			return;
		}
		state.isOpen = false;
		rightPane.classList.remove("is-open");
		rightPane.setAttribute("aria-hidden", "true");
		leftPane.removeAttribute("aria-hidden");
		leftPane.removeAttribute("inert");
		document.body.classList.remove("mobile-pane-open");
		const fallback = primitiveList;
		const target = state.priorFocus instanceof HTMLElement ? state.priorFocus : fallback;
		requestAnimationFrame(() => {
			if (target && typeof target.focus === "function") {
				target.focus({ preventScroll: true });
			}
		});
	}

	function handleListClick(event) {
		const item = event.target instanceof HTMLElement ? event.target.closest("li") : null;
		if (!item) {
			return;
		}
		state.currentView = item.dataset.type === "readme" ? "readme" : "details";
		requestAnimationFrame(() => {
			if (!state.isOpen) {
				openPane();
			} else {
				syncPaneTitle();
			}
		});
	}

	function handleKey(event) {
		if (event.key === "Escape" && state.isOpen) {
			event.preventDefault();
			closePane();
		}
	}

	function initNameObserver() {
		const nameNode = document.getElementById("primitive-name");
		if (!nameNode) {
			return;
		}
		if (state.nameObserver) {
			state.nameObserver.disconnect();
		}
		state.nameObserver = new MutationObserver(syncPaneTitle);
		state.nameObserver.observe(nameNode, { childList: true, subtree: true, characterData: true });
	}

	function appendTopBar() {
		if (state.topBar) {
			return;
		}
		const topBar = document.createElement("div");
		topBar.className = "mobile-top-bar";

		const backButton = document.createElement("button");
		backButton.type = "button";
		backButton.className = "mobile-back-button";
		backButton.setAttribute("aria-label", "Back to list");

		const icon = document.createElement("span");
		icon.className = "mobile-back-icon";
		icon.setAttribute("aria-hidden", "true");

		const label = document.createElement("span");
		label.className = "mobile-back-label";
		label.textContent = "Back";

		backButton.append(icon, label);

		const title = document.createElement("div");
		title.className = "mobile-pane-title";
		title.textContent = "Details";

		topBar.append(backButton, title);
		rightPane.insertBefore(topBar, rightPane.firstChild || null);

		state.topBar = topBar;
		state.backButton = backButton;
		state.paneTitle = title;
	}

	function removeTopBar() {
		if (state.topBar && state.topBar.parentElement === rightPane) {
			rightPane.removeChild(state.topBar);
		}
		state.topBar = null;
		state.backButton = null;
		state.paneTitle = null;
	}

	function isSearchDialogOpen() {
		return Boolean(document.getElementById("search-dialog"));
	}

	function focusSearchInput() {
		const input = document.getElementById("search-input");
		if (!input) {
			return;
		}
		if (typeof input.focus === "function") {
			input.focus({ preventScroll: true });
		}
		if (input.value && typeof input.setSelectionRange === "function") {
			const length = input.value.length;
			input.setSelectionRange(0, length);
		}
	}

	function dispatchSlashShortcut() {
		const slashEvent = new KeyboardEvent("keydown", {
			key: "/",
			code: "Slash",
			keyCode: 191,
			which: 191,
			bubbles: true
		});
		document.dispatchEvent(slashEvent);
	}

	function openMobileSearch() {
		if (isSearchDialogOpen()) {
			focusSearchInput();
			updateSearchToggleState(true);
			return;
		}
		dispatchSlashShortcut();
		requestAnimationFrame(() => {
			focusSearchInput();
			updateSearchToggleState();
		});
	}

	function closeMobileSearch() {
		const dialog = document.getElementById("search-dialog");
		if (!dialog) {
			updateSearchToggleState(false);
			return;
		}
		const input = dialog.querySelector("#search-input");
		if (input) {
			const escEvent = new KeyboardEvent("keydown", {
				key: "Escape",
				code: "Escape",
				keyCode: 27,
				which: 27,
				bubbles: true
			});
			input.dispatchEvent(escEvent);
		} else {
			dialog.remove();
		}
		requestAnimationFrame(() => updateSearchToggleState(false));
	}

	function updateSearchToggleState(force) {
		if (!state.searchButton) {
			return;
		}
		const open = typeof force === "boolean" ? force : isSearchDialogOpen();
		state.searchButton.classList.toggle("is-open", open);
		state.searchButton.setAttribute("aria-expanded", open ? "true" : "false");
	}

	function ensureSearchToggle() {
		if (!document.body) {
			return;
		}
		if (state.searchButton) {
			updateSearchToggleState();
			return;
		}
		const button = document.createElement("button");
		button.type = "button";
		button.className = "mobile-search-toggle";
		button.setAttribute("aria-label", "Search primitives");
		button.setAttribute("aria-controls", "search-dialog");
		button.setAttribute("aria-expanded", "false");
		const icon = document.createElement("span");
		icon.className = "mobile-search-icon";
		button.appendChild(icon);
		state.searchHandler = event => {
			event.preventDefault();
			if (isSearchDialogOpen()) {
				closeMobileSearch();
			} else {
				openMobileSearch();
			}
		};
		button.addEventListener("click", state.searchHandler);
		document.body.appendChild(button);
		state.searchButton = button;
		if (state.searchObserver) {
			state.searchObserver.disconnect();
		}
		state.searchObserver = new MutationObserver(() => updateSearchToggleState());
		state.searchObserver.observe(document.body, { childList: true });
		updateSearchToggleState();
	}

	function removeSearchToggle() {
		if (state.searchObserver) {
			state.searchObserver.disconnect();
			state.searchObserver = null;
		}
		if (state.searchButton && state.searchHandler) {
			state.searchButton.removeEventListener("click", state.searchHandler);
		}
		if (state.searchButton && state.searchButton.parentElement) {
			state.searchButton.parentElement.removeChild(state.searchButton);
		}
		state.searchButton = null;
		state.searchHandler = null;
	}

	function enableMobileLayout() {
		if (state.initialized) {
			return;
		}
		state.initialized = true;
		ensureFocusTarget();
		appendTopBar();
		rightPane.setAttribute("aria-hidden", "true");
		leftPane.removeAttribute("aria-hidden");
		leftPane.removeAttribute("inert");
		document.body.classList.remove("mobile-pane-open");
		rightPane.classList.remove("is-open");
		state.isOpen = false;

		state.listHandler = handleListClick;
		primitiveList.addEventListener("click", state.listHandler);

		if (!state.backHandler && state.backButton) {
			state.backHandler = () => closePane();
			state.backButton.addEventListener("click", state.backHandler);
		}

		state.keyHandler = handleKey;
		document.addEventListener("keydown", state.keyHandler);

		initNameObserver();
		syncPaneTitle();
		ensureSearchToggle();
	}

	function disableMobileLayout() {
		if (!state.initialized) {
			return;
		}
		state.initialized = false;
		state.isOpen = false;

		if (state.listHandler) {
			primitiveList.removeEventListener("click", state.listHandler);
			state.listHandler = null;
		}

		if (state.backButton && state.backHandler) {
			state.backButton.removeEventListener("click", state.backHandler);
			state.backHandler = null;
		}

		if (state.keyHandler) {
			document.removeEventListener("keydown", state.keyHandler);
			state.keyHandler = null;
		}

		if (state.nameObserver) {
			state.nameObserver.disconnect();
			state.nameObserver = null;
		}

		removeTopBar();
		removeSearchToggle();
		removeFocusTarget();
		document.body.classList.remove("mobile-pane-open");
		rightPane.classList.remove("is-open");
		rightPane.removeAttribute("aria-hidden");
		leftPane.removeAttribute("aria-hidden");
		leftPane.removeAttribute("inert");
		state.priorFocus = null;
		state.currentView = "details";
	}

	function handleQueryChange(event) {
		if (event.matches) {
			enableMobileLayout();
		} else {
			disableMobileLayout();
		}
	}

	state.mqHandler = handleQueryChange;

	if (typeof mediaQuery.addEventListener === "function") {
		mediaQuery.addEventListener("change", state.mqHandler);
	} else if (typeof mediaQuery.addListener === "function") {
		mediaQuery.addListener(state.mqHandler);
	}

	if (mediaQuery.matches) {
		enableMobileLayout();
	}
});
