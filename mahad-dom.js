(global => {

const _me_handle_head = {
    apply: (_t, _s, args) => {
        const me = new MahadElem();
        if (args.length) me.attr("inner", args);
        return me;
    },
    get: (_, name) => {
        const ntar = () => {};
        ntar.ename = name;
        ntar.attrs = [];
        return new Proxy(ntar, _me_handle_tail);
    },
};

const _me_handle_tail = {
    apply: (tar, _s, args) => {
        const me = new MahadElem(tar.ename);
        if (args.length) me.attr("inner", args);
        for (const [key, vals] of tar.attrs) {
            me.attr(key, vals);
        }
        return me;
    },
    get: (tar, key) => (...args) => {
        const ntar = () => {};
        ntar.ename = tar.ename;
        if (key.startsWith('$')) {
            ntar.attrs = tar.attrs.concat([[key.slice(1), args[0]]]);
        } else {
            ntar.attrs = tar.attrs.concat([[key, args]]);
        }
        return new Proxy(ntar, _me_handle_tail);
    },
};

global.ME = new Proxy(() => {}, _me_handle_head);

const EMK_MAHAD = Symbol("mahad");
const EM_ATTR_GUARDS = {
    "id": elem => [
        val => elem.id = val,
    ],
    "title": elem => [
        val => elem.title = val,
    ],
    "text": elem => [
        val => elem.textContent = val,
    ],
    "class": elem => [
        val => elem.classList.add(val),
        val => elem.classList.remove(val),
    ],
    "src": elem => [
        val => elem.src = val,
    ],
    "show": elem => [
        val => {
            elem.hidden = !val;
            if (val) {
                elem.classList.remove("f-hide");
            } else {
                elem.classList.add("f-hide");
            }
        },
    ],
    "value": (elem, mattr) => {
        elem.addEventListener("change", () => {
            mattr.val = elem.value;
        });
        return [
            val => elem.value = val,
        ];
    },
    "style": elem => [
        (val, key) => {
            if (val instanceof Array) {
                val.guard(elem, v => elem.style.setProperty(key, v));
            } else {
                elem.style.setProperty(key, val);
            }
        },
        (val, key) => {
            if (val instanceof Array) {
                val.unset_to(elem);
            }
            elem.style.removeProperty(key);
        },
    ],
    "on": elem => [
        (val, key) => {
            if (val instanceof Array) {
                val.guard(elem, v => elem.addEventListener(key, v));
            } else {
                elem.addEventListener(key, val);
            }
        },
        (val, key) => {
            if (val instanceof Array) {
                val.unguard(elem);
            } else {
                elem.removeEventListener(key, val);
            }
        }
    ],
    "inner": elem => [
        (v, i) => {
            const e = val_to_elem(v);
            if (i === elem.childNodes.length) {
                elem.append(e);
            } else {
                elem.insertBefore(e, elem.childNodes[i]);
            }
        },
        (v, i) => {
            elem.childNodes[i].remove();
        },
    ],
};

const val_to_elem = val => {
    if (val instanceof MahadElem) {
        return val.elem;
    } else if (val instanceof Node) {
        return val;
    } else if (globalThis.jQuery && val instanceof jQuery) {
        return val[0];
    } else if (val instanceof Promise) {
        const placeholder = make_placeholder();
        val.then(v => placeholder.replaceWith(val_to_elem(v)));
        return placeholder;
    } else if (typeof val !== "object") {
        return new Text(val);
    }
}

const make_placeholder = () => document.createElement("div");

global.MahadElem = class MahadElem extends MahadObject {
    constructor(name = "div") {
        super();
        this.name = name;
        this.elem = document.createElement(this.name);
        this.elem[EMK_MAHAD] = this;
    }
    attr(key, mattr = ['']) {
        if (key in this) {
            return this[key];
        } else {
            const guard = EM_ATTR_GUARDS[key];
            if (guard) this.modify(key, mattr.guard(null, ...guard(this.elem, mattr)));
            return mattr;
        }
    }
    attach(elem_or_query) {
        if (typeof elem_or_query === "string") {
            document.querySelector(elem_or_query).append(this.elem);
        } else if (elem_or_query instanceof HTMLElement) {
            elem_or_query.append(this.elem);
        } else if (elem_or_query instanceof MahadElem) {
            elem_or_query.attr("inner").suffix(this);
        } else if (globalThis.jQuery && elem_or_query instanceof jQuery) {
            elem_or_query.append(this.elem);
        } else {
            throw "Unexpect attach target";
        }
    }
};

})(globalThis);
