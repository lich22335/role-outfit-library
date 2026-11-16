const MODULE_NAME = 'role_outfit_library';
const RULE_TEXT = '换肤槽位：甲乙只对应当前剧情中已有角色。NAI英文角色tag仅用于对应角色的image###外观；作品消歧只在该角色正式tag本身需要时保留。正文始终使用原姓名，不新增人物，不改变身份、性格和关系。';
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
let launcherEventsBound = false;

const EXTRA_CHARACTERS = [
    ['胜利女神：妮姬','诺雅尔','noir (nikke)'],
    ['胜利女神：妮姬','沃伦姆','volume (nikke)'],
    ['胜利女神：妮姬','诺伊斯','noise (nikke)'],
    ['胜利女神：妮姬','阿莉亚','aria (nikke)'],
    ['胜利女神：妮姬','贝伊','bay (nikke)'],
    ['原神','迪希雅','dehya (genshin impact)'],
    ['原神','坎蒂丝','candace (genshin impact)'],
    ['原神','希诺宁','xilonen (genshin impact)'],
    ['型月系列','凯妮斯','caenis (fate)'],
    ['罪恶装备','拉姆蕾萨尔','ramlethal valentine'],
    ['明日方舟','卡涅利安','carnelian (arknights)'],
    ['棕色尘埃2','内布利斯','nebris (brown dust 2)'],
];
const EXTRA_OUTFITS = [
    ['幻想服饰','暗黑祭司服','dark priestess outfit, black robes, gold trim, ornate collar'],
    ['幻想服饰','月光舞娘服','belly dancer outfit, sheer veil, gold jewelry, layered skirt'],
    ['幻想服饰','哥特束腰礼服','gothic dress, corset, lace trim, long gloves'],
    ['幻想服饰','星象占卜师服','fortune teller outfit, star print, layered shawl, jewelry'],
    ['幻想服饰','机械修女服','nun outfit, mechanical arms, futuristic armor, black veil'],
    ['幻想服饰','精灵祭典服','fantasy dress, leaf ornament, sheer sleeves, gold embroidery'],
    ['幻想服饰','龙鳞战斗服','dragon scale armor, bodysuit, armored boots'],
    ['幻想服饰','沙漠女王服','desert outfit, gold jewelry, flowing cape, ornate belt'],
    ['未来科技','赛博机能连体衣','techwear, bodysuit, utility belt, futuristic boots'],
    ['未来科技','仿生义体战斗服','cybernetic bodysuit, mechanical limbs, armored panels'],
    ['未来科技','全息偶像演出服','idol costume, holographic fabric, futuristic accessories'],
    ['未来科技','太空驾驶服','pilot suit, skin tight, harness, gloves'],
    ['舞台与派对','黑金兔女郎','bunny suit, black leotard, fishnet pantyhose, bunny ears, gold trim'],
    ['舞台与派对','羽毛歌姬演出服','showgirl outfit, feather boa, sequins, high heels'],
    ['舞台与派对','假面舞会礼服','masquerade mask, evening gown, opera gloves'],
    ['舞台与派对','复古爵士舞台服','cabaret outfit, fringed dress, long gloves, feather headpiece'],
    ['成人风格','皮革束身套装','leather corset, leather skirt, thighhighs'],
    ['成人风格','蕾丝吊带睡衣','lace camisole, lace trim, silk nightgown'],
    ['成人风格','镂空紧身连体衣','cutout bodysuit, highleg leotard, thighhighs'],
    ['成人风格','半透明罩衫','sheer robe, lingerie, lace trim'],
    ['成人风格','漆皮舞台服','latex bodysuit, glossy clothes, thighhigh boots'],
    ['成人风格','缎面吊带套装','satin camisole, short shorts, lace trim'],
    ['成人风格','哥特蕾丝内衣','black lingerie, gothic lace, garter straps'],
    ['成人风格','皮革绑带舞台装','strappy outfit, leather harness, bodysuit'],

    // 轻薄贴身服饰按材质与款式分组，方便手机端按分类筛选。
    ['白丝搭配','白色蕾丝长筒袜','white lace thighhighs, lace tops'],
    ['白丝搭配','白色半透明连裤袜','white pantyhose, sheer legwear'],
    ['白丝搭配','白色吊带丝袜','white stockings, garter straps, lace trim'],
    ['白丝搭配','白色过膝袜','white kneehighs, soft fabric'],
    ['白丝搭配','白色蕾丝吊带袜','white thighhighs, lace trim, garter belt'],
    ['白丝搭配','白色网纹丝袜','white fishnet pantyhose'],
    ['黑丝搭配','黑色薄透连裤袜','black pantyhose, sheer legwear'],
    ['黑丝搭配','黑色蕾丝长筒袜','black lace thighhighs, lace tops'],
    ['黑丝搭配','黑色吊带丝袜','black stockings, garter straps'],
    ['黑丝搭配','黑色渔网连裤袜','black fishnet pantyhose'],
    ['黑丝搭配','黑色过膝袜','black kneehighs, thin fabric'],
    ['黑丝搭配','黑色蕾丝吊带袜','black thighhighs, lace trim, garter belt'],
    ['蕾丝贴身','黑色蕾丝吊带睡裙','black lace nightgown, lace trim, spaghetti straps'],
    ['蕾丝贴身','白色蕾丝吊带睡裙','white lace nightgown, lace trim, spaghetti straps'],
    ['蕾丝贴身','蕾丝拼接连体衣','lace bodysuit, lace trim, fitted bodysuit'],
    ['蕾丝贴身','露肩蕾丝睡裙','off shoulder nightgown, lace trim'],
    ['蕾丝贴身','蕾丝镂空连体衣','cutout bodysuit, lace trim'],
    ['蕾丝贴身','黑色蕾丝吊带套装','black camisole, lace trim, matching shorts'],
    ['蕾丝贴身','白色蕾丝吊带套装','white camisole, lace trim, matching shorts'],
    ['蕾丝贴身','哥特蕾丝束腰衣','black lace corset, ribbon, lace trim'],
    ['轻薄睡衣','半透明薄纱睡裙','sheer nightgown, chiffon, spaghetti straps'],
    ['轻薄睡衣','真丝吊带短睡裙','silk nightgown, spaghetti straps, short dress'],
    ['轻薄睡衣','缎面短睡衣套装','satin pajamas, camisole, short shorts'],
    ['轻薄睡衣','薄纱开襟睡袍','sheer robe, open front, chiffon'],
    ['轻薄睡衣','高开衩丝质睡裙','silk nightgown, high slit, spaghetti straps'],
    ['轻薄睡衣','薄纱拼接吊带裙','chiffon nightgown, lace trim, spaghetti straps'],
    ['轻薄睡衣','露肩缎面睡裙','off shoulder nightgown, satin fabric'],
    ['轻薄睡衣','珍珠白丝质睡袍','white silk robe, lace trim, loose sleeves'],
    ['贴身连体','黑色高开衩连体衣','black highleg leotard, skin tight'],
    ['贴身连体','白色高开衩连体衣','white highleg leotard, skin tight'],
    ['贴身连体','透肤拼接连体衣','mesh bodysuit, opaque panels, skin tight'],
    ['贴身连体','缎面束腰连体衣','satin bodysuit, corset, lace trim'],
    ['贴身连体','蕾丝肩带连体衣','lace bodysuit, shoulder straps, fitted'],
    ['贴身连体','薄纱袖连体衣','bodysuit, sheer sleeves, lace trim'],
    ['睡衣与丝袜套装','白蕾丝睡裙配白丝','white lace nightgown, white thighhighs, lace trim'],
    ['睡衣与丝袜套装','黑蕾丝睡裙配黑丝','black lace nightgown, black thighhighs, lace trim'],
    ['睡衣与丝袜套装','白缎面吊带配白丝','white satin camisole, white lace thighhighs'],
    ['睡衣与丝袜套装','黑缎面吊带配黑丝','black satin camisole, black sheer pantyhose'],
    ['睡衣与丝袜套装','薄纱睡袍配黑丝','sheer robe, black stockings, lace trim'],
    ['睡衣与丝袜套装','丝质短睡裙配白丝','silk nightgown, white thighhighs'],
];

function addSupplementalLibrary() {
    const existingCharacters = new Set(characters.map(x => x.tag.toLowerCase()));
    for (const [work, name, tag] of EXTRA_CHARACTERS) {
        if (!existingCharacters.has(tag.toLowerCase())) {
            characters.push({ work, sourceWork: work, name, tag });
            existingCharacters.add(tag.toLowerCase());
        }
    }
    const existingOutfits = new Set(outfits.map(x => x.name));
    for (const [group, name, tag] of EXTRA_OUTFITS) {
        if (!existingOutfits.has(name)) {
            outfits.push({ group, name, tag });
            existingOutfits.add(name);
        }
    }
}


const USAGE_KEY = 'rolib-character-usage-v1';
let usageCounts = loadUsageCounts();

function loadUsageCounts() {
    try {
        const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
        if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
        return Object.fromEntries(Object.entries(data).filter(([key, count]) =>
            key && Number.isSafeInteger(count) && count >= 0));
    } catch (error) {
        console.warn('无法读取角色使用记录', error);
        return {};
    }
}

function usageKey(item) {
    return JSON.stringify([item.work, item.tag]);
}

function usageCount(item) {
    return usageCounts[usageKey(item)] || 0;
}

function recordUsage(item) {
    const key = usageKey(item);
    const updated = { ...usageCounts, [key]: usageCount(item) + 1 };
    try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
        usageCounts = updated;
        renderCharacters();
    } catch (error) {
        console.error('角色使用次数保存失败', error);
        toastr.error('角色已选择，但使用次数保存失败');
    }
}

function exportUsage() {
    const records = characters.filter(item => usageCount(item) > 0)
        .map(item => ({ work: item.work, name: item.name, tag: item.tag, count: usageCount(item) }))
        .sort((a, b) => b.count - a.count);
    const payload = { format: USAGE_KEY, exportedAt: new Date().toISOString(), records };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '角色使用记录-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importUsage(file) {
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        if (data?.format !== USAGE_KEY || !Array.isArray(data.records)) throw new Error('不是本插件的记录文件');
        const updated = { ...usageCounts };
        for (const record of data.records) {
            if (typeof record.work !== 'string' || typeof record.tag !== 'string' ||
                !Number.isSafeInteger(record.count) || record.count < 0) throw new Error('记录内容不正确');
            const key = JSON.stringify([record.work, record.tag]);
            updated[key] = Math.max(updated[key] || 0, record.count);
        }
        localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
        usageCounts = updated;
        renderCharacters();
        toastr.success('使用记录已导入，同一角色保留较大的次数');
    } catch (error) {
        toastr.error('导入失败：' + error.message);
    }
}


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
        addSupplementalLibrary();
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

async function migrateLegacyRoleValues() {
    for (const key of ['role_a', 'role_b']) {
        const current = await getVar(key);
        const marker = current.lastIndexOf('】');
        if (current.startsWith('【') && marker >= 0) {
            const tag = current.slice(marker + 1).trim();
            if (tag) await setVar(key, tag);
        }
    }
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
    const value = item.tag;
    await setVar(slotKey('role'), value);
    await updateInput();
    recordUsage(item);
    toastr.success(`${activeSlot === 'A' ? '甲' : '乙'}槽角色：${item.name}（${item.sourceWork || item.work}）`);
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

function matchesCharacter(item, filter = '') {
    const text = filter.trim().toLowerCase();
    return !text || [item.name, item.work, item.sourceWork, item.tag]
        .some(value => String(value || '').toLowerCase().includes(text));
}

function renderWorks(filter = '') {
    const target = document.querySelector('#rolib-work-list');
    if (!target) return;
    const text = filter.trim().toLowerCase();
    const works = [...new Set(characters.filter(x => matchesCharacter(x, text)).map(x => x.work))];
    if (works.length && !works.includes(activeWork)) activeWork = works[0];
    const workLabel = work => `${work}（${characters.filter(x => x.work === work).length}）`;
    target.innerHTML = works.map(work => `<button class="menu_button rolib-chip${work === activeWork ? ' active' : ''}" data-work="${esc(work)}">${esc(workLabel(work))}</button>`).join('');
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
        select.innerHTML = allWorks.map(work => `<option value="${esc(work)}">${esc(workLabel(work))}</option>`).join('');
        if (allWorks.includes(activeWork)) select.value = activeWork;
    }
}

function renderCharacters() {
    const target = document.querySelector('#rolib-character-list');
    if (!target) return;
    const search = (document.querySelector('#rolib-character-search')?.value || '').trim().toLowerCase();
    const rows = characters.filter(x => (!activeWork || x.work === activeWork) && matchesCharacter(x, search));
    target.innerHTML = rows.map(item => `<button class="menu_button rolib-item" data-char-index="${characters.indexOf(item)}"><span>${esc(item.name)}</span><small>${esc(item.sourceWork || item.work)} · ${esc(item.tag)}</small></button>`).join('') || '<div class="rolib-empty">没有匹配角色</div>';
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
        button.className = 'menu_button rolib-chat-launcher interactable';
        button.title = '打开角色换肤库';
        button.setAttribute('aria-label', '打开角色换肤库');
        button.innerHTML = '<span aria-hidden="true">衣</span>';
    }

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
    syncFloatingLauncher();
}

function findLauncher(event) {
    return event.composedPath?.().find(node => node?.id === 'rolib-launcher' || node?.id === 'rolib-floating-launcher') || null;
}

function bindLauncherEvents() {
    if (launcherEventsBound) return;
    launcherEventsBound = true;
    document.addEventListener('click', event => {
        if (!findLauncher(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggleLibraryPopup();
    }, true);
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
    bindLauncherEvents();
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
    if (popupRoot && !popupRoot.isConnected) popupRoot = null;
    if (popupRoot) return;
    const source = document.querySelector('#rolib-root');
    const content = source?.querySelector('.inline-drawer-content');
    if (!source || !content) {
        toastr.error('角色选择页尚未加载，请刷新酒馆后重试');
        return;
    }
    const shell = document.createElement('dialog');
    shell.className = 'rolib-popup-shell';
    shell.innerHTML = `
      <div class="rolib-popup-card">
        <div class="rolib-popup-head"><b>角色换肤库</b><button type="button" class="menu_button rolib-popup-close">关闭</button></div>
        <div class="rolib-popup-mount"></div>
      </div>`;
    document.body.appendChild(shell);
    document.body.classList.add('rolib-popup-open');
    popupRoot = shell;
    const floating = document.querySelector('#rolib-floating-launcher');
    if (floating) shell.appendChild(floating);
    shell.querySelector('.rolib-popup-mount').appendChild(content);
    content.hidden = false;
    content.style.display = 'block';
    shell.querySelector('.rolib-popup-close').addEventListener('click', closeLibraryPopup);
    shell.addEventListener('click', event => { if (event.target === shell) closeLibraryPopup(); });
    shell.addEventListener('cancel', event => {
        event.preventDefault();
        closeLibraryPopup();
    });
    try {
        shell.showModal();
    } catch (error) {
        console.warn(`[${MODULE_NAME}] 原生模态层不可用，使用兼容模式`, error);
        shell.setAttribute('open', '');
    }
    syncFloatingLauncher();
    await renderStatus();
}

function closeLibraryPopup() {
    if (!popupRoot) return;
    const content = popupRoot.querySelector('.inline-drawer-content');
    const floating = popupRoot.querySelector('#rolib-floating-launcher');
    const drawer = document.querySelector('#rolib-root .inline-drawer');
    if (content && drawer) {
        drawer.appendChild(content);
        content.hidden = !drawerExpanded;
        content.style.display = drawerExpanded ? 'block' : 'none';
    }
    if (floating) document.body.appendChild(floating);
    if (typeof popupRoot.close === 'function' && popupRoot.open) popupRoot.close();
    popupRoot.remove();
    popupRoot = null;
    document.body.classList.remove('rolib-popup-open');
    syncFloatingLauncher();
}

// Background-only backup access; no controls appear in the character picker.
// In browser console: rolibUsage.export() / rolibUsage.import(file)
globalThis.rolibUsage = {
    export: exportUsage,
    import: importUsage,
    getCounts: () => ({ ...usageCounts }),
};

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
        await migrateLegacyRoleValues();
        await renderStatus();
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

