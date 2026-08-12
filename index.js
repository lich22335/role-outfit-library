const MODULE_NAME = 'role_outfit_library';
const RULE_TEXT = '换肤槽位：甲乙只对应当前剧情中已有角色。皮肤名与英文tag仅用于对应角色的image###外观，正文始终使用原姓名，不新增人物，不改变身份、性格和关系。';
const AAD_TEXT = 'role-outfit-library:v1';
// The repository remains free of plaintext library data. This bundled key only
// avoids a password prompt; it is obfuscation, not access control.
const BUNDLED_LIBRARY_KEY = ['rJ-E9', '-4Fxer', '-JIbgP', '-xgJ8Y'].join('');

let characters = [];
let outfits = [];
let encryptedPayload = null;
let activeSlot = 'A';
let activeWork = '';
let activeOutfitGroup = '';
let popupRoot = null;
let launcherObserver = null;
let drawerExpanded = false;

function esc(value = '') {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function quoteArg(value = '') {
    return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function getContext() {
    return SillyTavern.getContext();
}

function fromBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function decryptLibrary(password) {
    if (!globalThis.crypto?.subtle) {
        throw new Error('当前页面不支持安全解密，请使用手机本机地址或 HTTPS 打开酒馆');
    }
    const salt = fromBase64(encryptedPayload.kdf.salt);
    const iv = fromBase64(encryptedPayload.cipher.iv);
    const ciphertext = fromBase64(encryptedPayload.data);
    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
    );
    const key = await crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt,
        iterations: encryptedPayload.kdf.iterations,
        hash: encryptedPayload.kdf.hash,
    }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode(AAD_TEXT),
    }, key, ciphertext);
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    if (!Array.isArray(parsed.characters) || !Array.isArray(parsed.outfits)) {
        throw new Error('解密后的数据格式不正确');
    }
    return parsed;
}

async function loadBundledLibrary() {
    try {
        const data = await decryptLibrary(BUNDLED_LIBRARY_KEY);
        characters = data.characters;
        outfits = data.outfits;
        renderWorks();
        renderCharacters();
        renderOutfitGroups();
        renderOutfits();
        await renderStatus();
        return true;
    } catch (error) {
        console.error(`[${MODULE_NAME}] 角色库读取失败`, error);
        toastr.error('角色换肤库读取失败，请重新安装或更新扩展');
        return false;
    }
}

async function run(command) {
    const context = getContext();
    if (typeof context.executeSlashCommandsWithOptions === 'function') {
        return await context.executeSlashCommandsWithOptions(command, { handleParserErrors: true });
    }
    if (typeof context.executeSlashCommands === 'function') {
        return await context.executeSlashCommands(command);
    }
    throw new Error('当前 SillyTavern 版本未提供 STscript 执行接口');
}

async function getVar(key) {
    try {
        const result = await run(`/getvar ${key}`);
        return String(result?.pipe ?? result ?? '');
    } catch {
        return '';
    }
}

async function setVar(key, value) {
    await run(`/setvar key=${key} ${quoteArg(value)}`);
}

async function flushVar(key) {
    await run(`/flushvar ${key}`);
}

function slotKey(kind, slot = activeSlot) {
    return `${kind}_${slot.toLowerCase()}`;
}

async function buildPrompt() {
    const [roleA, outfitA, roleB, outfitB] = await Promise.all([
        getVar('role_a'), getVar('outfit_a'), getVar('role_b'), getVar('outfit_b'),
    ]);
    const current = activeSlot === 'B' ? '乙' : '甲';
    return `${RULE_TEXT}｜当前：${current}｜甲：[皮肤=${roleA}；服装=${outfitA}]｜乙：[皮肤=${roleB}；服装=${outfitB}]`;
}

async function updateInput() {
    const prompt = await buildPrompt();
    const input = document.querySelector('#send_textarea');
    if (input) {
        input.value = prompt;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    } else {
        await run(`/setinput ${quoteArg(prompt)}`);
    }
    await renderStatus();
}

async function chooseCharacter(item) {
    const value = `【${item.name}】${item.tag}`;
    await setVar(slotKey('role'), value);
    await updateInput();
    toastr.success(`${activeSlot === 'A' ? '甲' : '乙'}槽角色：${item.name}`);
}

async function chooseOutfit(item) {
    const value = `【${item.name}】${item.tag}`;
    await setVar(slotKey('outfit'), value);
    await updateInput();
    toastr.success(`${activeSlot === 'A' ? '甲' : '乙'}槽服装：${item.name}`);
}

async function clearCurrent() {
    await Promise.all([flushVar(slotKey('role')), flushVar(slotKey('outfit'))]);
    await updateInput();
}

async function clearAll() {
    await Promise.all(['role_a', 'outfit_a', 'role_b', 'outfit_b'].map(flushVar));
    await updateInput();
}

async function renderStatus() {
    const box = document.querySelector('#rolib-status');
    if (!box) return;
    const [roleA, outfitA, roleB, outfitB] = await Promise.all([
        getVar('role_a'), getVar('outfit_a'), getVar('role_b'), getVar('outfit_b'),
    ]);
    box.innerHTML = `<div><b>甲</b>　角色：${esc(roleA || '未选择')}<br>　　服装：${esc(outfitA || '未选择')}</div><div><b>乙</b>　角色：${esc(roleB || '未选择')}<br>　　服装：${esc(outfitB || '未选择')}</div>`;
}

function renderWorks(filter = '') {
    const target = document.querySelector('#rolib-work-list');
    if (!target) return;
    const text = filter.trim().toLowerCase();
    const works = [...new Set(characters.filter(x => !text || x.work.toLowerCase().includes(text) || x.name.toLowerCase().includes(text)).map(x => x.work))];
    if (works.length && !works.includes(activeWork)) activeWork = works[0];
    target.innerHTML = works.map(work => `<button class="menu_button rolib-chip${work === activeWork ? ' active' : ''}" data-work="${esc(work)}">${esc(work)}</button>`).join('');
    target.querySelectorAll('[data-work]').forEach(btn => btn.addEventListener('click', () => {
        activeWork = btn.dataset.work;
        const select = document.querySelector('#rolib-work-select');
        if (select) select.value = activeWork;
        renderWorks(document.querySelector('#rolib-character-search')?.value || '');
        renderCharacters();
    }));
    const select = document.querySelector('#rolib-work-select');
    if (select) {
        const allWorks = [...new Set(characters.map(x => x.work))];
        select.innerHTML = allWorks.map(work => `<option value="${esc(work)}">${esc(work)}</option>`).join('');
        if (allWorks.includes(activeWork)) select.value = activeWork;
    }
}

function renderCharacters() {
    const target = document.querySelector('#rolib-character-list');
    if (!target) return;
    const search = (document.querySelector('#rolib-character-search')?.value || '').trim().toLowerCase();
    const rows = characters.filter(x => (!activeWork || x.work === activeWork) && (!search || x.name.toLowerCase().includes(search) || x.tag.toLowerCase().includes(search)));
    target.innerHTML = rows.map((item, i) => `<button class="menu_button rolib-item" data-char-index="${characters.indexOf(item)}"><span>${esc(item.name)}</span><small>${esc(item.tag)}</small></button>`).join('') || '<div class="rolib-empty">没有匹配角色</div>';
    target.querySelectorAll('[data-char-index]').forEach(btn => btn.addEventListener('click', () => chooseCharacter(characters[Number(btn.dataset.charIndex)])));
}

function renderOutfitGroups() {
    const target = document.querySelector('#rolib-outfit-groups');
    if (!target) return;
    const groups = [...new Set(outfits.map(x => x.group))];
    if (!activeOutfitGroup && groups.length) activeOutfitGroup = groups[0];
    target.innerHTML = groups.map(group => `<button class="menu_button rolib-chip${group === activeOutfitGroup ? ' active' : ''}" data-outfit-group="${esc(group)}">${esc(group)}</button>`).join('');
    const select = document.querySelector('#rolib-outfit-group-select');
    if (select) {
        select.innerHTML = groups.map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('');
        select.value = activeOutfitGroup;
    }
    target.querySelectorAll('[data-outfit-group]').forEach(btn => btn.addEventListener('click', () => {
        activeOutfitGroup = btn.dataset.outfitGroup;
        renderOutfitGroups();
        renderOutfits();
    }));
}

function renderOutfits() {
    const target = document.querySelector('#rolib-outfit-list');
    if (!target) return;
    const search = (document.querySelector('#rolib-outfit-search')?.value || '').trim().toLowerCase();
    const rows = outfits.filter(x => (!activeOutfitGroup || x.group === activeOutfitGroup) && (!search || x.name.toLowerCase().includes(search) || x.tag.toLowerCase().includes(search)));
    target.innerHTML = rows.map(item => `<button class="menu_button rolib-item" data-outfit-index="${outfits.indexOf(item)}"><span>${esc(item.name)}</span><small>${esc(item.tag)}</small></button>`).join('') || '<div class="rolib-empty">没有匹配服装</div>';
    target.querySelectorAll('[data-outfit-index]').forEach(btn => btn.addEventListener('click', () => chooseOutfit(outfits[Number(btn.dataset.outfitIndex)])));
}

function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function bindUi() {
    const drawerToggle = document.querySelector('#rolib-drawer-toggle');
    const toggleDrawer = event => {
        event?.preventDefault();
        event?.stopPropagation();
        setDrawerExpanded(!drawerExpanded);
    };
    if (drawerToggle) {
        drawerToggle.onclick = toggleDrawer;
        drawerToggle.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') toggleDrawer(event);
        };
    }
    setDrawerExpanded(false);
    document.querySelectorAll('[data-slot]').forEach(btn => btn.addEventListener('click', async () => {
        activeSlot = btn.dataset.slot;
        document.querySelectorAll('[data-slot]').forEach(x => x.classList.toggle('active', x.dataset.slot === activeSlot));
        await updateInput();
    }));
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === btn));
        document.querySelectorAll('.rolib-tab-content').forEach(x => x.classList.toggle('active', x.id === `rolib-tab-${btn.dataset.tab}`));
    }));
    document.querySelector('#rolib-character-search')?.addEventListener('input', event => {
        renderWorks(event.target.value);
        renderCharacters();
    });
    document.querySelector('#rolib-outfit-search')?.addEventListener('input', renderOutfits);
    document.querySelector('#rolib-work-select')?.addEventListener('change', event => {
        activeWork = event.target.value;
        renderWorks(document.querySelector('#rolib-character-search')?.value || '');
        renderCharacters();
    });
    document.querySelector('#rolib-outfit-group-select')?.addEventListener('change', event => {
        activeOutfitGroup = event.target.value;
        renderOutfitGroups();
        renderOutfits();
    });
    document.querySelector('#rolib-random-character')?.addEventListener('click', () => {
        const pool = characters.filter(x => !activeWork || x.work === activeWork);
        if (pool.length) chooseCharacter(randomFrom(pool));
    });
    document.querySelector('#rolib-random-outfit')?.addEventListener('click', () => {
        const pool = outfits.filter(x => !activeOutfitGroup || x.group === activeOutfitGroup);
        if (pool.length) chooseOutfit(randomFrom(pool));
    });
    document.querySelector('#rolib-clear-current')?.addEventListener('click', clearCurrent);
    document.querySelector('#rolib-clear-all')?.addEventListener('click', clearAll);
    document.querySelector('#rolib-refresh-input')?.addEventListener('click', updateInput);
}

function setDrawerExpanded(expanded) {
    drawerExpanded = Boolean(expanded);
    const toggle = document.querySelector('#rolib-drawer-toggle');
    const content = document.querySelector('#rolib-root .inline-drawer-content');
    toggle?.classList.toggle('is-open', drawerExpanded);
    toggle?.setAttribute('aria-expanded', String(drawerExpanded));
    if (content && !popupRoot?.contains(content)) {
        content.hidden = !drawerExpanded;
        content.style.display = drawerExpanded ? 'block' : 'none';
    }
}

function createQuickLauncher() {
    let button = document.querySelector('#rolib-launcher');
    if (!button) {
        button = document.createElement('button');
        button.id = 'rolib-launcher';
        button.type = 'button';
        button.className = 'menu_button fa-solid fa-shirt interactable';
        button.title = '打开角色换肤库';
        button.setAttribute('aria-label', '打开角色换肤库');
    }
    button.onclick = toggleLibraryPopup;

    const sendButton = document.querySelector('#send_but');
    const target = document.querySelector('#send_form') || sendButton?.parentElement;
    if (!button.isConnected && sendButton?.parentElement) {
        sendButton.parentElement.insertBefore(button, sendButton);
    } else if (!button.isConnected && target) {
        target.appendChild(button);
    }

    let floating = document.querySelector('#rolib-floating-launcher');
    if (!floating) {
        floating = document.createElement('button');
        floating.id = 'rolib-floating-launcher';
        floating.type = 'button';
        floating.className = 'rolib-floating-button';
        floating.title = '角色换肤库';
        floating.setAttribute('aria-label', '打开角色换肤库');
        floating.innerHTML = '<span aria-hidden="true">衣</span>';
        document.body.appendChild(floating);
    }
    floating.onclick = toggleLibraryPopup;
    syncFloatingLauncher();
}

function toggleLibraryPopup() {
    if (popupRoot && !popupRoot.isConnected) popupRoot = null;
    if (popupRoot) closeLibraryPopup();
    else openLibraryPopup();
}

function syncFloatingLauncher() {
    const floating = document.querySelector('#rolib-floating-launcher');
    if (!floating) return;
    const open = Boolean(popupRoot);
    const label = open ? '关闭角色换肤库' : '打开角色换肤库';
    const glyph = open ? '×' : '衣';
    floating.classList.toggle('is-open', open);
    floating.title = label;
    floating.setAttribute('aria-label', label);
    if (floating.textContent !== glyph) floating.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
}

function keepLaunchersAlive() {
    createQuickLauncher();
    if (launcherObserver) return;
    let scheduled = false;
    launcherObserver = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            createQuickLauncher();
        });
    });
    launcherObserver.observe(document.body, { childList: true, subtree: true });
}

async function openLibraryPopup() {
    if (popupRoot) return;
    const source = document.querySelector('#rolib-root');
    if (!source) return;
    const shell = document.createElement('div');
    shell.className = 'rolib-popup-shell';
    shell.innerHTML = `
      <div class="rolib-popup-card">
        <div class="rolib-popup-head"><b>角色换肤库</b><button type="button" class="menu_button rolib-popup-close">关闭</button></div>
        <div class="rolib-popup-mount"></div>
      </div>`;
    document.body.appendChild(shell);
    document.body.classList.add('rolib-popup-open');
    popupRoot = shell;
    syncFloatingLauncher();
    const content = source.querySelector('.inline-drawer-content');
    shell.querySelector('.rolib-popup-mount').appendChild(content);
    content.hidden = false;
    content.style.display = 'block';
    shell.querySelector('.rolib-popup-close').addEventListener('click', closeLibraryPopup);
    shell.addEventListener('click', event => { if (event.target === shell) closeLibraryPopup(); });
    await renderStatus();
}

function closeLibraryPopup() {
    if (!popupRoot) return;
    const content = popupRoot.querySelector('.inline-drawer-content');
    const drawer = document.querySelector('#rolib-root .inline-drawer');
    if (content && drawer) {
        drawer.appendChild(content);
        content.hidden = !drawerExpanded;
        content.style.display = drawerExpanded ? 'block' : 'none';
    }
    popupRoot.remove();
    popupRoot = null;
    document.body.classList.remove('rolib-popup-open');
    syncFloatingLauncher();
}

async function init() {
    try {
        const base = new URL('.', import.meta.url);
        encryptedPayload = await fetch(new URL('data.enc.json', base)).then(r => {
            if (!r.ok) throw new Error(`无法读取加密数据（${r.status}）`);
            return r.json();
        });
        const context = getContext();
        const html = await context.renderExtensionTemplateAsync('third-party/role-outfit-library', 'settings');
        document.querySelector('#extensions_settings2')?.insertAdjacentHTML('beforeend', html);
        bindUi();
        keepLaunchersAlive();
        await loadBundledLibrary();
        const { eventSource, event_types } = context;
        if (eventSource && event_types?.CHAT_CHANGED) {
            eventSource.on(event_types.CHAT_CHANGED, renderStatus);
        }
        console.log(`[${MODULE_NAME}] 角色换肤库已加载`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] 初始化失败`, error);
        toastr.error(`角色换肤库加载失败：${error.message}`);
    }
}

jQuery(async () => {
    await init();
});
