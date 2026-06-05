"""Accessibility tree snapshot with element refs for browser automation.

Produces a simplified, readable accessibility tree that the AI agent uses
to understand the page structure and target elements for interaction.
"""

from playwright.async_api import Page

from agent.utils.logger import logger

_SNAPSHOT_JS = """
() => {
    const refs = [];
    let refCounter = 0;

    function getRole(el) {
        const explicitRole = el.getAttribute('role');
        if (explicitRole) return explicitRole;

        const tagRoles = {
            'A': 'link',
            'BUTTON': 'button',
            'INPUT': 'textbox',
            'TEXTAREA': 'textbox',
            'SELECT': 'combobox',
            'IMG': 'img',
            'H1': 'heading',
            'H2': 'heading',
            'H3': 'heading',
            'H4': 'heading',
            'H5': 'heading',
            'H6': 'heading',
            'NAV': 'navigation',
            'MAIN': 'main',
            'HEADER': 'banner',
            'FOOTER': 'contentinfo',
            'ASIDE': 'complementary',
            'FORM': 'form',
            'TABLE': 'table',
            'TR': 'row',
            'TH': 'columnheader',
            'TD': 'cell',
            'UL': 'list',
            'OL': 'list',
            'LI': 'listitem',
            'DIALOG': 'dialog',
            'DETAILS': 'group',
            'SUMMARY': 'button',
        };

        const tag = el.tagName;
        if (tag === 'INPUT') {
            const type = el.getAttribute('type') || 'text';
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'submit' || type === 'button' || type === 'reset') return 'button';
            if (type === 'range') return 'slider';
            return 'textbox';
        }

        return tagRoles[tag] || null;
    }

    function getAccessibleName(el) {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) return labelEl.textContent.trim();
        }

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            const id = el.getAttribute('id');
            if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) return label.textContent.trim();
            }
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) return placeholder;
            const title = el.getAttribute('title');
            if (title) return title;
        }

        if (el.tagName === 'IMG') {
            return el.getAttribute('alt') || '';
        }

        if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'SUMMARY') {
            return el.textContent.trim().substring(0, 80);
        }

        if (el.tagName.match(/^H[1-6]$/)) {
            return el.textContent.trim().substring(0, 120);
        }

        return '';
    }

    function getState(el) {
        const states = [];
        if (document.activeElement === el) states.push('focused');
        if (el.disabled) states.push('disabled');
        if (el.readOnly) states.push('readonly');
        if (el.checked) states.push('checked');
        if (el.getAttribute('aria-expanded') === 'true') states.push('expanded');
        if (el.getAttribute('aria-expanded') === 'false') states.push('collapsed');
        if (el.getAttribute('aria-selected') === 'true') states.push('selected');
        if (el.getAttribute('aria-required') === 'true' || el.required) states.push('required');
        if (el.getAttribute('aria-invalid') === 'true') states.push('invalid');
        return states;
    }

    function isVisible(el) {
        if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (style.position !== 'fixed' && style.position !== 'sticky') return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
    }

    function isInteractive(el) {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'SUMMARY'];
        if (interactiveTags.includes(el.tagName)) return true;
        if (el.getAttribute('role') && ['button', 'link', 'textbox', 'checkbox', 'radio',
            'tab', 'menuitem', 'option', 'switch', 'combobox', 'slider'].includes(el.getAttribute('role'))) return true;
        if (el.getAttribute('tabindex') !== null && el.getAttribute('tabindex') !== '-1') return true;
        if (el.onclick || el.getAttribute('onclick')) return true;
        return false;
    }

    function isLandmark(el) {
        const role = getRole(el);
        return ['navigation', 'main', 'banner', 'contentinfo', 'complementary',
                'form', 'region', 'search'].includes(role);
    }

    function buildSelector(el) {
        if (el.id) return `#${el.id}`;

        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
        if (testId) return `[data-testid="${testId}"]`;

        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) {
            const tag = el.tagName.toLowerCase();
            return `${tag}[aria-label="${ariaLabel}"]`;
        }

        const name = el.getAttribute('name');
        if (name) {
            const tag = el.tagName.toLowerCase();
            return `${tag}[name="${name}"]`;
        }

        // Build CSS path
        let path = '';
        let current = el;
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\\s+/).filter(c => c.length < 30).slice(0, 2);
                if (classes.length) selector += '.' + classes.join('.');
            }
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }
            path = path ? `${selector} > ${path}` : selector;
            current = current.parentElement;
            if (path.split(' > ').length >= 4) break;
        }
        return path;
    }

    function walk(el, depth) {
        if (!el || !el.tagName) return;
        if (!isVisible(el)) return;

        const role = getRole(el);
        const interactive = isInteractive(el);
        const landmark = isLandmark(el);

        if (interactive || landmark || (role && ['heading', 'img', 'table', 'dialog'].includes(role))) {
            refCounter++;
            const ref = `e${refCounter}`;
            const name = getAccessibleName(el);
            const states = getState(el);
            const selector = buildSelector(el);

            const entry = {
                ref: ref,
                role: role || el.tagName.toLowerCase(),
                name: name,
                states: states,
                selector: selector,
                depth: depth,
            };

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                entry.value = el.value || '';
            }
            if (el.tagName.match(/^H[1-6]$/)) {
                entry.level = parseInt(el.tagName[1]);
            }

            refs.push(entry);
        }

        for (const child of el.children) {
            walk(child, depth + 1);
        }
    }

    walk(document.body, 0);
    return refs;
}
"""


async def page_snapshot(page: Page) -> str:
    """Generate an accessibility-tree-like snapshot with element refs.

    Returns a text format like:
    [ref=e1] heading "Google" level=1
    [ref=e2] textbox "Search" [focused]
    [ref=e3] button "Google Search"
    [ref=e4] link "Gmail"
    ...

    Each ref corresponds to a CSS selector that can be used for interactions.
    """
    try:
        elements = await page.evaluate(_SNAPSHOT_JS)
    except Exception as e:
        logger.error(f"Failed to capture page snapshot: {e}")
        raise RuntimeError(f"Failed to capture page snapshot: {e}")

    lines = []
    for el in elements:
        ref = el["ref"]
        role = el["role"]
        name = el.get("name", "")
        states = el.get("states", [])
        value = el.get("value")
        level = el.get("level")

        parts = [f"[ref={ref}]", role]

        if name:
            parts.append(f'"{name}"')

        if level is not None:
            parts.append(f"level={level}")

        if value:
            parts.append(f'value="{value}"')

        if states:
            parts.append("[" + ", ".join(states) + "]")

        indent = "  " * min(el.get("depth", 0), 4)
        lines.append(f"{indent}{' '.join(parts)}")

    if not lines:
        return "(empty page - no interactive elements found)"

    header = f"Page: {page.url}\n"
    header += f"Title: {await page.title()}\n"
    header += f"Elements: {len(lines)}\n"
    header += "-" * 60 + "\n"

    return header + "\n".join(lines)


async def get_element_selector(page: Page, ref: str) -> str:
    """Resolve a ref (e.g., 'e5') to the actual CSS selector.

    Runs the snapshot JS and finds the matching entry.
    """
    try:
        elements = await page.evaluate(_SNAPSHOT_JS)
    except Exception as e:
        raise RuntimeError(f"Failed to resolve ref '{ref}': {e}")

    for el in elements:
        if el["ref"] == ref:
            return el["selector"]

    raise ValueError(f"Element ref '{ref}' not found on page")
