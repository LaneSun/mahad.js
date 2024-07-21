(global => {

const MC_MODIFY = 0;
const MC_MOVE = 1;
const MC_EDIT = 2;
const MC_SIZE = 3;

const data_to = Symbol("data_to");
const data_to_field = Symbol("data_to_field");

const _make_marker = (links, updater) => m => {
    const id = Symbol();
    links.push([m, id]);
    return m.listen(id, updater);
};

class Shared {
    get [data_to]() {
        if (this[data_to_field]) {
            return this[data_to_field];
        } else {
            const data_to = Array(MC_SIZE).fill(0).map(v => new Map());
            this[data_to_field] = data_to;
            return data_to;
        }
    }

    // 修改器

    modify(...args) {
        return this.edit([MC_MODIFY, ...args]);
    }

    // 监听器

    listen(id, fn) {
        this.set_to(id, {
            [MC_EDIT]: fn,
        }, null, false);
        return this;
    }
    unlisten(id) {
        this.unset_to(id, false);
    }

    // 连接器 (单向)

    bind_from(src, fns, data) {
        this.clear();
        src.set_to(this, fns, data);
        return this;
    }
    bind_clone(src) {
        return this.bind_from(src, {
            [MC_EDIT]: (src, tar, data, cmds) => {
                tar.edit(...cmds);
            },
        });
    }
    make_bind(fns, data) {
        return new this.constructor().bind_from(this, fns, data);
    }
    bclone() {
        return new this.constructor().bind_clone(this);
    }
}
const SharedProto = Object.getOwnPropertyDescriptors(Shared.prototype);
delete SharedProto.constructor;

global.MahadArray = class MahadArray extends Array {
    static unfold(init_value, fn) {
        const res = new this();
        while (true) {
            let v;
            [init_value, v] = fn(init_value);
            if (v !== undefined) {
                res.push(v);
            } else {
                break;
            }
        }
        return res.reverse();
    }

    // 读取器

    get val() {
        return this[0];
    }

    // 修改器

    edit(...cmds) {
        const vdata_to = this[data_to];
        let res = null;
        for (const cmd of cmds) {
            const [type, offset] = cmd;
            switch (type) {
                case MC_MODIFY:
                    const deletes = this.splice(offset, cmd[2], ...cmd[3]);
                    for (const [tar, [fn, data]] of vdata_to[MC_MODIFY]) {
                        fn(this, tar, data, cmd, deletes, cmd[3]);
                    }
                    res = deletes;
                    break;
                case MC_MOVE:
                    const moves = this.splice(offset, cmd[2]);
                    this.splice(offset + cmd[3], 0, ...moves);
                    for (const [tar, [fn, data]] of vdata_to[MC_MOVE]) {
                        fn(this, tar, data, cmd, moves);
                    }
                    break;
            }
        }
        for (const [tar, [fn, data]] of [...vdata_to[MC_EDIT]]) {
            fn(this, tar, data, cmds);
        }
        return res;
    }
    move(...args) {
        return this.edit([MC_MOVE, ...args]);
    }
    move_at(value, count, delta) {
        return this.move(this.indexOf(value), count, delta);
    }
    move_before(value, count, delta) {
        return this.move(this.indexOf(value) - count, count, delta);
    }
    move_after(value, count, delta) {
        return this.move(this.indexOf(value) + 1, count, delta);
    }
    move_range(start_value, end_value, delta) {
        const start_index = this.indexOf(start_value);
        const end_index = this.indexOf(end_value) + 1;
        return this.move(start_index, end_index - start_index, delta);
    }
    exchange(src, src_end_or_tar, tar = undefined, tar_end = undefined) {
        let src_sidx = this.indexOf(src),
            src_eidx, tar_sidx, tar_eidx;
        if (tar === undefined) {
            src_eidx = src_sidx + 1;
            tar_sidx = this.indexOf(src_end_or_tar);
            tar_eidx = tar_sidx + 1;
        } else if (tar_end === undefined) {
            src_eidx = this.indexOf(src_end_or_tar) + 1;
            tar_sidx = this.indexOf(tar);
            tar_eidx = tar_sidx + 1;
        } else {
            src_eidx = this.indexOf(src_end_or_tar) + 1;
            tar_sidx = this.indexOf(tar);
            tar_eidx = this.indexOf(tar_end) + 1;
        }
        [src_sidx, src_eidx, tar_sidx, tar_eidx] = [src_sidx, src_eidx, tar_sidx, tar_eidx].sort();
        if (src_eidx === tar_sidx) {
            return this.move(src_sidx, src_eidx - src_sidx, tar_eidx - tar_sidx);
        } else {
            return this.edit(
                [MC_MOVE, src_sidx, src_eidx - src_sidx, tar_sidx - src_eidx],
                [MC_MOVE, tar_sidx, tar_eidx - tar_sidx, src_sidx - tar_sidx]
            );
        }
    }
    modify_at(value, delete_count, inserts) {
        return this.modify(this.indexOf(value), delete_count, inserts);
    }
    modify_before(value, delete_count, inserts) {
        return this.modify(this.indexOf(value) - delete_count, delete_count, inserts);
    }
    modify_after(value, delete_count, inserts) {
        return this.modify(this.indexOf(value) + 1, delete_count, inserts);
    }
    modify_range(start_value, end_value, inserts) {
        const start_index = this.indexOf(start_value);
        const end_index = this.indexOf(end_value) + 1;
        return this.modify(start_index, end_index - start_index, inserts);
    }
    delete(offset, delete_count = 1) {
        return this.modify(offset, delete_count, []);
    }
    delete_at(value, delete_count = 1) {
        const offset = this.indexOf(value);
        return offset >= 0 ? this.delete(this.indexOf(value), delete_count) : [];
    }
    prefix(...values) {
        return this.modify(0, 0, values);
    }
    postfix(...values) {
        return this.modify(this.length, 0, values);
    }
    unprefix(delete_count) {
        return this.delete(0, delete_count);
    }
    unpostfix(delete_count) {
        return this.delete(this.length - delete_count, delete_count);
    }
    assign(new_values) {
        return this.modify(0, this.length, new_values);
    }
    set(offset, value) {
        return this.modify(offset, 1, [value]);
    }
    set val(value) {
        this.modify(0, 1, [value]);
    }
    clear() {
        return this.modify(0, this.length, []);
    }

    // 推送器

    set_to(tar, fns, data = [], reset = true) {
        const vdata_to = this[data_to];
        for (const type in fns) {
            vdata_to[type].set(tar, [fns[type], data]);
        }
        if (reset) {
            const cmd = [MC_MODIFY, 0, 0, this];
            fns[MC_MODIFY]?.(this, tar, data, cmd, [], this);
            fns[MC_EDIT]?.(this, tar, data, [cmd]);
        }
    }
    unset_to(tar, reset = true) {
        if (reset) {
            const cmd = [MC_MODIFY, 0, this.length, []];
            const modify_handle = this[data_to][MC_MODIFY].get(tar);
            if (modify_handle) {
                const [fn, data] = modify_handle;
                fn(this, tar, data, cmd, this, []);
            }
            const edit_handle = this[data_to][MC_EDIT].get(tar);
            if (edit_handle) {
                const [fn, data] = edit_handle;
                fn(this, tar, data, [cmd]);
            }
        }
        for (const set of this[data_to]) {
            set.delete(tar);
        }
    }

    // 守卫器

    guard(id, into, outof) {
        this.set_to(id, {
            [MC_MODIFY]: (src, tar, data, [, offset], deletes, inserts) => {
                if (outof) for (let i = deletes.length - 1; i >= 0; i--) {
                    outof(deletes[i], offset + i);
                }
                if (into) for (let i = 0; i < inserts.length; i++) {
                    into(inserts[i], offset + i);
                }
            },
        });
        return this;
    }

    // 连接器 (单向)

    bind_values(src) {
        return this.bind_from(src, {
            [MC_MODIFY]: (src, tar, data, cmd, del, val) => {
                if (del !== undefined) tar.delete_at(del);
                if (val !== undefined) tar.postfix(val);
            },
        });
    }
    bind_map(src, fn) {
        const data = [].guard(null, null, links => links.forEach(([m, id]) => m.unlisten(id)));
        const handle_modify = (src, tar, data, [, offset, delete_count, inserts]) => {
            const insert_links_set = [];
            tar.modify(offset, delete_count, inserts.map((v, i) => {
                const index = offset + i;
                const insert_links = [];
                const update = () => {
                    const insert_links = [];
                    tar.set(index, fn(v, index, _make_marker(insert_links, update)));
                    data.set(index, insert_links);
                };
                const res = fn(v, index, _make_marker(insert_links, update));
                insert_links_set.push(insert_links);
                return res;
            }));
            data.modify(offset, delete_count, insert_links_set);
        };
        return this.bind_from(src, {
            [MC_MOVE]: (_, tar, data, cmd) => {
                tar.edit(cmd);
                data.edit(cmd);
            },
            [MC_MODIFY]: handle_modify,
        }, data);
    }
    bind_flat(src) {
        const data = [].guard(null, null, ([m, id]) => m.unlisten(id));
        const update = () => {
            this.assign(src.flat(1));
        };
        return this.bind_from(src, {
            [MC_MODIFY]: (src, tar, data, [, offset, delete_count, inserts]) => {
                data.modify(offset, delete_count, inserts.map(m => {
                    const id = Symbol();
                    m.listen(id, update);
                    return [m, id];
                }));
            },
            [MC_EDIT]: update,
        }, data);
    }
    bind_reduce(src, fn, init_value) {
        const data = [];
        const update = () => {
            data[0]?.forEach(([m, id]) => m.unlisten(id));
            const links = [];
            const mark = _make_marker(links, update);
            this.val = src.reduce((pre, cur, index) => fn(pre, cur, index, mark), init_value);
            data[0] = links;
        };
        return this.bind_from(src, {
            [MC_MODIFY]: update,
        }, data);
    }
    bind_sort(src, fn) {
        const data = [];
        const update = () => {
            data[0]?.forEach(([m, id]) => m.unlisten(id));
            const links = [];
            const mark = _make_marker(links, update);
            this.assign(src.toSorted((a, b) => fn(a, b, mark)));
            data[0] = links;
        };
        return this.bind_from(src, {
            [MC_MODIFY]: update,
        }, data);
    }
    bflat() {
        return new this.constructor().bind_flat(this);
    }
    bmap(fn) {
        return new this.constructor().bind_map(this, fn);
    }
    breduce(fn, init_value) {
        return new this.constructor().bind_reduce(this, fn, init_value);
    }
    bsort(fn) {
        return new this.constructor().bind_sort(this, fn);
    }
};
Object.defineProperties(MahadArray.prototype, SharedProto);
const MahadArrayProto = Object.getOwnPropertyDescriptors(MahadArray.prototype);
delete MahadArrayProto.constructor;

Array.unfold = MahadArray.unfold;
Object.defineProperties(Array.prototype, MahadArrayProto);

global.MahadObject = class MahadObject extends Object {
    static unfold(init_value, fn) {
        const res = new this();
        while (true) {
            let v;
            [init_value, k, v] = fn(init_value);
            if (v !== undefined) {
                res[k] = v;
            } else {
                break;
            }
        }
        return res;
    }
    reduce(fn, init_value) {
        const entries = Object.entries(this);
        init_value ??= entries.pop();
        for (const [key, value] of entries) {
            init_value = fn.call(this, init_value, value, key);
        }
        return init_value;
    }

    // 修改器

    edit(...cmds) {
        const vdata_to = this[data_to];
        let res = null;
        for (const cmd of cmds) {
            const [type, key, value] = cmd;
            switch (type) {
                case MC_MODIFY:
                    const del = this[key];
                    if (value !== undefined) {
                        this[key] = value;
                    } else {
                        delete this[key];
                    }
                    for (const [tar, [fn, data]] of vdata_to[MC_MODIFY]) {
                        fn(this, tar, data, cmd, del, value);
                    }
                    res = del;
                    break;
            }
        }
        for (const [tar, [fn, data]] of [...vdata_to[MC_EDIT]]) {
            fn(this, tar, data, cmds);
        }
        return res;
    }
    delete(...keys) {
        return this.edit(keys.map(k => [MC_MODIFY, k, undefined]));
    }
    assign(obj) {
        return this.edit(
            ...Object.entries(this).map(([k]) => [MC_MODIFY, k, undefined]),
            ...Object.entries(obj).map(([k, v]) => [MC_MODIFY, k, v]),
        );
    }
    set(key, value) {
        return this.edit([MC_MODIFY, key, value]);
    }
    clear() {
        return this.edit(
            ...Object.entries(this).map(([k]) => [MC_MODIFY, k, undefined]),
        );
    }

    // 推送器

    set_to(tar, fns, data = [], reset = true) {
        const vdata_to = this[data_to];
        for (const type in fns) {
            vdata_to[type].set(tar, [fns[type], data]);
        }
        if (reset) {
            const cmds = Object.entries(this).map(([key, value]) => [MC_MODIFY, key, value]);
            for (const cmd of cmds) {
                fns[MC_MODIFY]?.(this, tar, data, cmd, undefined, cmd[2]);
            }
            fns[MC_EDIT]?.(this, tar, data, cmds);
        }
    }
    unset_to(tar, reset = true) {
        if (reset) {
            const cmd_pairs = Object.entries(this).map(([key, value]) => [[MC_MODIFY, key, undefined], value]);
            const modify_handle = this[data_to][MC_MODIFY].get(tar);
            if (modify_handle) {
                const [fn, data] = modify_handle;
                for (const [cmd, value] of cmd_pairs) {
                    fn(this, tar, data, cmd, value, undefined);
                }
            }
            const edit_handle = this[data_to][MC_EDIT].get(tar);
            if (edit_handle) {
                const [fn, data] = edit_handle;
                fn(this, tar, data, cmd_pairs.map(p => p[0]));
            }
        }
        for (const set of this[data_to]) {
            set.delete(tar);
        }
    }

    // 守卫器

    guard(id, into, outof) {
        this.set_to(id, {
            [MC_MODIFY]: (src, tar, data, [, key], del, val) => {
                if (outof && del !== undefined) outof(del, key);
                if (into && val !== undefined) into(val, key);
            },
        });
        return this;
    }

    // 连接器 (单向)

    bind_map(src, fn) {
        const data = ({}).guard(null, null, links => links.forEach(([m, id]) => m.unlisten(id)));
        const handle_modify = (_, tar, data, [, key, value]) => {
            if (value !== undefined) {
                const links = [];
                const update = () => {
                    const links = [];
                    tar.set(key, fn(value, key, _make_marker(links, update)));
                    data.set(key, links);
                };
                tar.modify(key, fn(value, key, _make_marker(links, update)));
                data.set(key, links);
            } else {
                tar.modify(key, value);
                data.modify(key, value);
            }
        };
        return this.bind_from(src, {
            [MC_MODIFY]: handle_modify,
        }, data);
    }
    bind_reduce(src, fn, init_value) {
        const data = [];
        const update = () => {
            data[0]?.forEach(([m, id]) => m.unlisten(id));
            const links = [];
            const mark = _make_marker(links, update);
            this.val = src.reduce((pre, cur, key) => fn(pre, cur, key, mark), init_value);
            data[0] = links;
        };
        return this.bind_from(src, {
            [MC_EDIT]: update,
        }, data);
    }
    bvalues() {
        return new Array().bind_values(this);
    }
    bmap(fn) {
        return new this.constructor().bind_map(this, fn);
    }
    breduce(fn, init_value) {
        return new this.constructor().bind_reduce(this, fn, init_value);
    }
};
Object.defineProperties(MahadObject.prototype, SharedProto);
const MahadObjectProto = Object.getOwnPropertyDescriptors(MahadObject.prototype);
delete MahadObjectProto.constructor;

Object.unfold = MahadObject.unfold;
Object.defineProperties(Object.prototype, MahadObjectProto);

})(globalThis);
